#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"
export PATH="$ROOT/.runtime/bin:$PATH"
export FABRIC_CFG_PATH="$ROOT/.runtime"
export CORE_PEER_TLS_ENABLED=true
export ORDERER_CA="$ROOT/.runtime/crypto/ordererOrganizations/insurance.local/orderers/orderer1.insurance.local/tls/ca.crt"
VERSION="${1:-2}"
if [[ ! "$VERSION" =~ ^[0-9]+$ ]]; then
  exit 1
fi
peer_env() {
  local i="$1"
  export CORE_PEER_LOCALMSPID="Org${i}MSP"
  export CORE_PEER_MSPCONFIGPATH="$ROOT/.runtime/crypto/peerOrganizations/org${i}.insurance.local/users/Admin@org${i}.insurance.local/msp"
  export CORE_PEER_TLS_ROOTCERT_FILE="$ROOT/.runtime/crypto/peerOrganizations/org${i}.insurance.local/peers/peer0.org${i}.insurance.local/tls/ca.crt"
  local ports=(0 17051 19051 11051)
  export CORE_PEER_ADDRESS="localhost:${ports[$i]}"
  export CORE_PEER_TLS_SERVERHOSTOVERRIDE="peer0.org${i}.insurance.local"
}
(cd chaincode && gofmt -w main.go && go mod vendor && go test ./...)
peer lifecycle chaincode package "$ROOT/.runtime/insurance-v${VERSION}.tar.gz" --path "$ROOT/chaincode" --lang golang --label "insurance_${VERSION}"
PACKAGE=$(peer lifecycle chaincode calculatepackageid "$ROOT/.runtime/insurance-v${VERSION}.tar.gz")
for i in 1 2 3; do
  peer_env "$i"
  peer lifecycle chaincode install "$ROOT/.runtime/insurance-v${VERSION}.tar.gz"
  peer lifecycle chaincode approveformyorg -o localhost:17050 --ordererTLSHostnameOverride orderer1.insurance.local --channelID insurance --name insurance --version "$VERSION" --package-id "$PACKAGE" --sequence "$VERSION" --tls --cafile "$ORDERER_CA"
done
peer_env 1
docker cp "$CORE_PEER_MSPCONFIGPATH" ic-peer1:/tmp/admin
docker cp "$ORDERER_CA" ic-peer1:/tmp/orderer-ca.crt
docker cp "$ROOT/.runtime/crypto/peerOrganizations/org2.insurance.local/peers/peer0.org2.insurance.local/tls/ca.crt" ic-peer1:/tmp/org2-ca.crt
docker cp "$ROOT/.runtime/crypto/peerOrganizations/org3.insurance.local/peers/peer0.org3.insurance.local/tls/ca.crt" ic-peer1:/tmp/org3-ca.crt
docker exec -e CORE_PEER_MSPCONFIGPATH=/tmp/admin ic-peer1 peer lifecycle chaincode commit -o orderer1.insurance.local:7050 --channelID insurance --name insurance --version "$VERSION" --sequence "$VERSION" --tls --cafile /tmp/orderer-ca.crt --peerAddresses peer0.org1.insurance.local:7051 --tlsRootCertFiles /etc/hyperledger/fabric/tls/ca.crt --peerAddresses peer0.org2.insurance.local:7051 --tlsRootCertFiles /tmp/org2-ca.crt --peerAddresses peer0.org3.insurance.local:7051 --tlsRootCertFiles /tmp/org3-ca.crt
for target in 4 5 ojk; do
  if docker inspect --format '{{.State.Running}}' "ic-peer${target}" 2> /dev/null | grep -q true || { [ "$target" = ojk ] && docker inspect --format '{{.State.Running}}' ic-peer-ojk 2> /dev/null | grep -q true; }; then
    bash scripts/sync-peer-chaincode.sh "$target"
  fi
done
echo "Chaincode upgraded to version $VERSION; existing ledger retained."
