#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"
export PATH="$ROOT/.runtime/bin:$PATH"
export FABRIC_CFG_PATH="$ROOT/.runtime"
export CORE_PEER_TLS_ENABLED=true
export ORDERER_CA="$ROOT/.runtime/crypto/ordererOrganizations/insurance.local/orderers/orderer1.insurance.local/tls/ca.crt"
peer_env() {
  local i="$1"
  export CORE_PEER_LOCALMSPID="Org${i}MSP"
  export CORE_PEER_MSPCONFIGPATH="$ROOT/.runtime/crypto/peerOrganizations/org${i}.insurance.local/users/Admin@org${i}.insurance.local/msp"
  export CORE_PEER_TLS_ROOTCERT_FILE="$ROOT/.runtime/crypto/peerOrganizations/org${i}.insurance.local/peers/peer0.org${i}.insurance.local/tls/ca.crt"
  local ports=(0 17051 19051 11051 12051 13051)
  export CORE_PEER_ADDRESS="localhost:${ports[$i]}"
  export CORE_PEER_TLS_SERVERHOSTOVERRIDE="peer0.org${i}.insurance.local"
}
cryptogen extend --config="$ROOT/.runtime/crypto-config.yaml" --input="$ROOT/.runtime/crypto"
configtxgen -printOrg Org4MSP > .runtime/org4.json
configtxgen -printOrg Org5MSP > .runtime/org5.json
peer_env 1
peer channel fetch config .runtime/config-before-add.block -o localhost:17050 --ordererTLSHostnameOverride orderer1.insurance.local -c insurance --tls --cafile "$ORDERER_CA"
configtxlator proto_decode --input .runtime/config-before-add.block --type common.Block --output .runtime/config-before-add.json
python3 - << 'PY'
import json
from pathlib import Path

p = Path(".runtime")
original = json.loads((p / "config-before-add.json").read_text())["data"]["data"][0][
    "payload"
]["data"]["config"]
(p / "original.json").write_text(json.dumps(original))
groups = original["channel_group"]["groups"]["Application"]["groups"]
if "Org4MSP" in groups and "Org5MSP" in groups:
    (p / "orgs-already-added").write_text("true")
else:
    (p / "orgs-already-added").write_text("false")
    for i in [4, 5]:
        groups["Org%dMSP" % i] = json.loads((p / ("org%d.json" % i)).read_text())
    (p / "modified.json").write_text(json.dumps(original))
PY
if [ "$(cat .runtime/orgs-already-added)" != true ]; then
  configtxlator proto_encode --input .runtime/original.json --type common.Config --output .runtime/original.pb
  configtxlator proto_encode --input .runtime/modified.json --type common.Config --output .runtime/modified.pb
  configtxlator compute_update --channel_id insurance --original .runtime/original.pb --updated .runtime/modified.pb --output .runtime/add-orgs-update.pb
  configtxlator proto_decode --input .runtime/add-orgs-update.pb --type common.ConfigUpdate --output .runtime/add-orgs-update.json
  python3 - << 'PY'
import json
from pathlib import Path

p = Path(".runtime")
update = json.loads((p / "add-orgs-update.json").read_text())
envelope = {
    "payload": {
        "header": {"channel_header": {"channel_id": "insurance", "type": 2}},
        "data": {"config_update": update},
    }
}
(p / "add-orgs-envelope.json").write_text(json.dumps(envelope))
PY
  configtxlator proto_encode --input .runtime/add-orgs-envelope.json --type common.Envelope --output .runtime/add-orgs-envelope.pb
  for i in 1 2; do
    peer_env "$i"
    peer channel signconfigtx -f .runtime/add-orgs-envelope.pb
  done
  peer_env 3
  peer channel update -f .runtime/add-orgs-envelope.pb -o localhost:17050 --ordererTLSHostnameOverride orderer1.insurance.local -c insurance --tls --cafile "$ORDERER_CA"
fi
docker compose --env-file .env.local -f infra/compose.yaml up -d couch4 couch5 peer4 peer5
peer_env 1
peer channel fetch 0 .runtime/channel-genesis.block -o localhost:17050 --ordererTLSHostnameOverride orderer1.insurance.local -c insurance --tls --cafile "$ORDERER_CA"
for i in 4 5; do
  peer_env "$i"
  for attempt in {1..30}; do
    if peer channel list > /dev/null 2>&1; then
      break
    fi
    sleep 2
  done
  if ! peer channel list | grep -q '^insurance$'; then
    peer channel join -b .runtime/channel-genesis.block
  fi
  bash scripts/sync-peer-chaincode.sh "$i"
done
echo 'Org4 and Org5 joined the insurance channel with independent peers and MSPs.'
