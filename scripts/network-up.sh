#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"
BIN="$ROOT/.runtime/bin"
export PATH="$BIN:$PATH"
export FABRIC_CFG_PATH="$ROOT/.runtime"
mkdir -p "$BIN"
if [ ! -x "$BIN/peer" ]; then
  SOURCE="${FABRIC_BIN_SOURCE:-/mnt/c/InsuranceChain/InsuranceChain/fabric-samples/bin}"
  if [ -x "$SOURCE/peer" ]; then cp "$SOURCE/"* "$BIN/"; else
    curl -fsSL https://github.com/hyperledger/fabric/releases/download/v2.5.16/hyperledger-fabric-linux-amd64-2.5.16.tar.gz | tar -xz -C "$ROOT/.runtime"
  fi
fi
if [ ! -f "$ROOT/.runtime/core.yaml" ]; then
  cp /mnt/c/InsuranceChain/InsuranceChain/fabric-samples/config/core.yaml "$ROOT/.runtime/core.yaml"
fi
if [ ! -d "$ROOT/.runtime/crypto" ]; then
  cryptogen generate --config="$ROOT/.runtime/crypto-config.yaml" --output="$ROOT/.runtime/crypto"
else
  cryptogen extend --config="$ROOT/.runtime/crypto-config.yaml" --input="$ROOT/.runtime/crypto"
fi
if [ ! -f "$ROOT/.runtime/genesis.block" ]; then
  configtxgen -profile InsuranceGenesis -channelID system-channel -outputBlock "$ROOT/.runtime/genesis.block"
fi
docker compose --env-file .env.local -f infra/compose.yaml up -d
export CORE_PEER_TLS_ENABLED=true
export ORDERER_CA="$ROOT/.runtime/crypto/ordererOrganizations/insurance.local/orderers/orderer1.insurance.local/tls/ca.crt"
peer_env() {
  local i="$1"
  export CORE_PEER_LOCALMSPID="Org${i}MSP"
  export CORE_PEER_MSPCONFIGPATH="$ROOT/.runtime/crypto/peerOrganizations/org${i}.insurance.local/users/Admin@org${i}.insurance.local/msp"
  export CORE_PEER_TLS_ROOTCERT_FILE="$ROOT/.runtime/crypto/peerOrganizations/org${i}.insurance.local/peers/peer0.org${i}.insurance.local/tls/ca.crt"
  local ports=(0 17051 19051 11051)
  export CORE_PEER_ADDRESS="localhost:${ports[$i]}"
  export CORE_PEER_TLS_SERVERHOSTOVERRIDE="peer0.org${i}.insurance.local"
}
peer_env 1
for attempt in {1..30}; do
  if peer channel list > /dev/null 2>&1; then
    break
  fi
  sleep 2
done
if [ ! -f "$ROOT/.runtime/insurance.block" ]; then
  configtxgen -profile InsuranceChannel -outputCreateChannelTx "$ROOT/.runtime/insurance.tx" -channelID insurance
  peer channel create -o localhost:17050 --ordererTLSHostnameOverride orderer1.insurance.local -c insurance -f "$ROOT/.runtime/insurance.tx" --outputBlock "$ROOT/.runtime/insurance.block" --tls --cafile "$ORDERER_CA"
fi
for i in 1 2 3; do
  peer_env "$i"
  if ! peer channel list | grep -q '^insurance$'; then
    peer channel join -b "$ROOT/.runtime/insurance.block"
  fi
  if [ ! -f "$ROOT/.runtime/anchor${i}.done" ]; then
    configtxgen -profile InsuranceChannel -outputAnchorPeersUpdate "$ROOT/.runtime/anchor${i}.tx" -channelID insurance -asOrg "Org${i}MSP"
    peer channel update -o localhost:17050 --ordererTLSHostnameOverride orderer1.insurance.local -c insurance -f "$ROOT/.runtime/anchor${i}.tx" --tls --cafile "$ORDERER_CA"
    touch "$ROOT/.runtime/anchor${i}.done"
  fi
done
if [ ! -f "$ROOT/.runtime/chaincode-installed" ]; then
  (cd chaincode && go mod tidy && go mod vendor)
  peer lifecycle chaincode package "$ROOT/.runtime/insurance.tar.gz" --path "$ROOT/chaincode" --lang golang --label insurance_1
  PACKAGE=$(peer lifecycle chaincode calculatepackageid "$ROOT/.runtime/insurance.tar.gz")
  for i in 1 2 3; do
    peer_env "$i"
    peer lifecycle chaincode install "$ROOT/.runtime/insurance.tar.gz"
    peer lifecycle chaincode approveformyorg -o localhost:17050 --ordererTLSHostnameOverride orderer1.insurance.local --channelID insurance --name insurance --version 1 --package-id "$PACKAGE" --sequence 1 --tls --cafile "$ORDERER_CA"
  done
  peer_env 1
  docker cp "$CORE_PEER_MSPCONFIGPATH" ic-peer1:/tmp/admin
  docker cp "$ORDERER_CA" ic-peer1:/tmp/orderer-ca.crt
  docker cp "$ROOT/.runtime/crypto/peerOrganizations/org2.insurance.local/peers/peer0.org2.insurance.local/tls/ca.crt" ic-peer1:/tmp/org2-ca.crt
  docker cp "$ROOT/.runtime/crypto/peerOrganizations/org3.insurance.local/peers/peer0.org3.insurance.local/tls/ca.crt" ic-peer1:/tmp/org3-ca.crt
  docker exec -e CORE_PEER_MSPCONFIGPATH=/tmp/admin ic-peer1 peer lifecycle chaincode commit -o orderer1.insurance.local:7050 --channelID insurance --name insurance --version 1 --sequence 1 --tls --cafile /tmp/orderer-ca.crt --peerAddresses peer0.org1.insurance.local:7051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt --peerAddresses peer0.org2.insurance.local:7051 --tlsRootCertFiles /tmp/org2-ca.crt --peerAddresses peer0.org3.insurance.local:7051 --tlsRootCertFiles /tmp/org3-ca.crt
  touch "$ROOT/.runtime/chaincode-installed"
fi
bash scripts/add-organizations.sh
bash scripts/provision-ojk-peer.sh
echo 'InsuranceChain infrastructure ready, including independent OJK peer.'
