#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/fabric-env.sh
WORK="$ROOT/.runtime/ojk-migration"
mkdir -p "$WORK"
chmod 700 "$WORK"
# Extend the existing CA/MSP; never regenerate the channel or existing identities.
find .runtime/crypto -type f -exec sha256sum {} + > "$WORK/crypto-before.sha256"
cryptogen extend --config=.runtime/crypto-config.yaml --input=.runtime/crypto
sha256sum --check --status "$WORK/crypto-before.sha256"
peer_env 1
peer channel fetch config "$WORK/config.block" -o localhost:17050 --ordererTLSHostnameOverride orderer1.insurance.local -c insurance --tls --cafile "$ORDERER_CA"
configtxlator proto_decode --input "$WORK/config.block" --type common.Block --output "$WORK/config-block.json"
python3 - << 'PY'
import json
from pathlib import Path

p = Path(".runtime/ojk-migration")
config = json.loads((p / "config-block.json").read_text())["data"]["data"][0][
    "payload"
]["data"]["config"]
(p / "original.json").write_text(json.dumps(config))
org = config["channel_group"]["groups"]["Application"]["groups"]["OJKMSP"]
desired = {"anchor_peers": [{"host": "peer0.ojk.insurance.local", "port": 7051}]}
change = org["values"].get("AnchorPeers", {}).get("value") != desired
(p / "needs-update").write_text(str(change))
if change:
    old = org["values"].get("AnchorPeers", {})
    org["values"]["AnchorPeers"] = {
        "mod_policy": "Admins",
        "version": old.get("version", "0"),
        "value": desired,
    }
    (p / "modified.json").write_text(json.dumps(config))
print("Channel already contains OJKMSP; anchor update needed:", change)
PY
if [ "$(cat "$WORK/needs-update")" = True ]; then
  configtxlator proto_encode --input "$WORK/original.json" --type common.Config --output "$WORK/original.pb"
  configtxlator proto_encode --input "$WORK/modified.json" --type common.Config --output "$WORK/modified.pb"
  configtxlator compute_update --channel_id insurance --original "$WORK/original.pb" --updated "$WORK/modified.pb" --output "$WORK/update.pb"
  configtxlator proto_decode --input "$WORK/update.pb" --type common.ConfigUpdate --output "$WORK/update.json"
  python3 - << 'PY'
import json
from pathlib import Path

p = Path(".runtime/ojk-migration")
(p / "envelope.json").write_text(
    json.dumps(
        {
            "payload": {
                "header": {"channel_header": {"channel_id": "insurance", "type": 2}},
                "data": {"config_update": json.loads((p / "update.json").read_text())},
            }
        }
    )
)
PY
  configtxlator proto_encode --input "$WORK/envelope.json" --type common.Envelope --output "$WORK/envelope.pb"
  peer_env ojk
  peer channel update -f "$WORK/envelope.pb" -o localhost:17050 --ordererTLSHostnameOverride orderer1.insurance.local -c insurance --tls --cafile "$ORDERER_CA"
fi
docker compose --env-file .env.local -f infra/compose.yaml up -d couch-ojk peer-ojk
peer_env 1
peer channel fetch 0 "$WORK/genesis.block" -o localhost:17050 --ordererTLSHostnameOverride orderer1.insurance.local -c insurance --tls --cafile "$ORDERER_CA"
peer lifecycle chaincode querycommitted --channelID insurance --name insurance --output json > "$WORK/definition.json"
peer lifecycle chaincode queryapproved --channelID insurance --name insurance --output json > "$WORK/org1-approved.json"
peer_env ojk
ready=false
for attempt in {1..30}; do
  if peer channel list > "$WORK/channels.txt" 2> /dev/null; then
    ready=true
    break
  fi
  sleep 2
done
$ready || {
  echo 'OJK peer did not become ready' >&2
  exit 1
}
if ! grep -q '^insurance$' "$WORK/channels.txt"; then
  peer channel join -b "$WORK/genesis.block"
fi
bash scripts/sync-peer-chaincode.sh ojk
peer chaincode query -C insurance -n insurance -c '{"Args":["ListCases"]}' > "$WORK/cases-ojk.json"
peer channel getinfo -c insurance
echo 'OJK peer joined insurance and can query its own ledger.'
