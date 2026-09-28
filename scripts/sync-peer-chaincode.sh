#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/fabric-env.sh
TARGET="${1:?Specify peer organization (1-5 or ojk)}"
WORK="$ROOT/.runtime/chaincode-sync-$TARGET"
mkdir -p "$WORK"
peer_env 1
peer lifecycle chaincode querycommitted -C insurance -n insurance --output json > "$WORK/definition.json"
peer lifecycle chaincode queryapproved -C insurance -n insurance --output json > "$WORK/approved.json"
read -r VERSION SEQUENCE PACKAGE_ID < <(
  python3 - "$WORK" << 'PY'
import json, sys, base64
from pathlib import Path

p = Path(sys.argv[1])
d = json.loads((p / "definition.json").read_text())
a = json.loads((p / "approved.json").read_text())
assert (
    d["version"] == a["version"] and d["sequence"] == a["sequence"]
), "Org1 approval does not match committed definition"
assert not d.get("collections", {}).get(
    "config"
), "Collection configuration requires explicit deployment support"
assert not d.get(
    "init_required", False
), "Init-required definitions require explicit deployment support"
assert b"/Channel/Application/Endorsement" in base64.b64decode(
    d["validation_parameter"]
), "Expected channel endorsement policy"
assert (
    d.get("endorsement_plugin") == "escc" and d.get("validation_plugin") == "vscc"
), "Unexpected chaincode plugins"
source = a["source"]
package = source.get("local_package") or source.get("Type", {}).get("LocalPackage")
print(d["version"], d["sequence"], package["package_id"])
PY
)
test -n "${PACKAGE_ID:-}" || {
  echo 'Cannot determine committed package' >&2
  exit 1
}
PACKAGE="$ROOT/.runtime/insurance-v${VERSION}.tar.gz"
if [ "$VERSION" = 1 ]; then
  PACKAGE="$ROOT/.runtime/insurance.tar.gz"
fi
test -f "$PACKAGE" || {
  echo "Missing exact chaincode package: $PACKAGE" >&2
  exit 1
}
test "$(peer lifecycle chaincode calculatepackageid "$PACKAGE")" = "$PACKAGE_ID" || {
  echo 'Package does not match Org1 installed approval' >&2
  exit 1
}
peer_env "$TARGET"
ready=false
for attempt in {1..60}; do
  if peer lifecycle chaincode querycommitted -C insurance -n insurance --output json > "$WORK/target-definition.json" 2> /dev/null && python3 - "$WORK" << 'PY'; then
import json, sys
from pathlib import Path

p = Path(sys.argv[1])
a = json.loads((p / "definition.json").read_text())
b = json.loads((p / "target-definition.json").read_text())
assert a["sequence"] == b["sequence"] and a["version"] == b["version"]
PY
    ready=true
    break
  fi
  sleep 2
done
$ready || {
  echo 'Target peer did not catch up to chaincode definition' >&2
  exit 1
}
peer lifecycle chaincode queryinstalled --output json > "$WORK/installed.json"
if ! python3 - "$WORK/installed.json" "$PACKAGE_ID" << 'PY'; then
import json, sys

sys.exit(
    0
    if any(
        p["package_id"] == sys.argv[2]
        for p in json.load(open(sys.argv[1])).get("installed_chaincodes", [])
    )
    else 1
)
PY
  peer lifecycle chaincode install "$PACKAGE"
fi
if ! peer lifecycle chaincode queryapproved -C insurance -n insurance --sequence "$SEQUENCE" --output json > "$WORK/target-approved.json" 2> /dev/null || ! python3 - "$WORK/target-approved.json" "$PACKAGE_ID" << 'PY'; then
import json, sys

source = json.load(open(sys.argv[1]))["source"]
package = source.get("local_package") or source.get("Type", {}).get("LocalPackage")
assert package["package_id"] == sys.argv[2]
PY
  peer lifecycle chaincode approveformyorg -o localhost:17050 --ordererTLSHostnameOverride orderer1.insurance.local -C insurance -n insurance --version "$VERSION" --sequence "$SEQUENCE" --package-id "$PACKAGE_ID" --tls --cafile "$ORDERER_CA"
fi
echo "Peer $TARGET: chaincode insurance version $VERSION sequence $SEQUENCE available."
