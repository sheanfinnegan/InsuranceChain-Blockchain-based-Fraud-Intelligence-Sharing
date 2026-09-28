#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/fabric-env.sh
mkdir -p .runtime/ojk-verification
for org in 1 ojk; do
  peer_env "$org"
  peer channel getinfo -c insurance > ".runtime/ojk-verification/info-$org.txt"
  peer chaincode query -C insurance -n insurance -c '{"Args":["ListCases"]}' > ".runtime/ojk-verification/cases-$org.json"
  peer lifecycle chaincode querycommitted -C insurance -n insurance --output json > ".runtime/ojk-verification/definition-$org.json"
done
docker inspect --format '{{json .Mounts}}' ic-peer-ojk > .runtime/ojk-verification/peer-mounts.json
docker inspect --format '{{json .Mounts}}' ic-couch-ojk > .runtime/ojk-verification/couch-mounts.json
docker exec ic-couch-ojk sh -c 'curl -fsS -u "$COUCHDB_USER:$COUCHDB_PASSWORD" http://localhost:5984/insurance_insurance/members/valueBytes' > .runtime/ojk-verification/members.json
python3 - << 'PY'
import json
from pathlib import Path

p = Path(".runtime/ojk-verification")
info = lambda org: json.loads(
    (p / f"info-{org}.txt").read_text().split("Blockchain info: ")[1]
)
a, b = info("1"), info("ojk")
assert a == b, ("Ledger heads differ", a, b)
cases = json.loads((p / "cases-ojk.json").read_text())
assert cases == json.loads((p / "cases-1.json").read_text()), "Case states differ"
for name, volume, destination in [
    ("peer", "insurancechain_peer-ojk", "/var/hyperledger/production"),
    ("couch", "insurancechain_couch-ojk", "/opt/couchdb/data"),
]:
    mounts = json.loads((p / f"{name}-mounts.json").read_text())
    assert any(
        m.get("Name") == volume and m["Destination"] == destination for m in mounts
    ), "Independent persistent volume missing"
definition = json.loads((p / "definition-ojk.json").read_text())
assert definition["approvals"]["OJKMSP"] is True
members = json.loads((p / "members.json").read_text())
assert all(m["mspId"] != "OJKMSP" for m in members)
for c in cases:
    for r in c["rounds"]:
        assert "ojk" not in r["participants"] and "OJKMSP" not in r["participants"]
        assert r["threshold"] == (2 * len(r["participants"]) + 2) // 3
summary = {
    "height": b["height"],
    "currentBlockHash": b["currentBlockHash"],
    "cases": len(cases),
    "chaincodeVersion": definition["version"],
    "sequence": definition["sequence"],
    "independentVolumes": True,
    "businessVotingUnchanged": True,
    "activeInsurersInOJKWorldState": sum(m["active"] for m in members),
}
(p / "summary.json").write_text(json.dumps(summary, indent=2))
print(json.dumps(summary, indent=2))
PY
