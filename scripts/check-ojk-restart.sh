#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/fabric-env.sh
peer_env ojk
mkdir -p .runtime/ojk-verification
peer chaincode query -C insurance -n insurance -c '{"Args":["ListCases"]}' > .runtime/ojk-verification/cases-before-restart.json
docker restart ic-peer-ojk
ready=false
for attempt in {1..30}; do
  if peer chaincode query -C insurance -n insurance -c '{"Args":["ListCases"]}' > .runtime/ojk-verification/cases-after-restart.json 2> /dev/null; then
    ready=true
    break
  fi
  sleep 2
done
$ready || {
  echo 'OJK query failed after restart' >&2
  exit 1
}
python3 - << 'PY'
import json
from pathlib import Path

p = Path(".runtime/ojk-verification")
a = json.loads((p / "cases-before-restart.json").read_text())
b = json.loads((p / "cases-after-restart.json").read_text())
assert a == b
print("PASS OJK peer restart: all", len(b), "cases retained on independent ledger.")
PY
