#!/usr/bin/env bash
# Source from deployment scripts after changing to the repository root.
ROOT="$PWD"
export PATH="$ROOT/.runtime/bin:$PATH"
export FABRIC_CFG_PATH="$ROOT/.runtime"
export CORE_PEER_TLS_ENABLED=true
export ORDERER_CA="$ROOT/.runtime/crypto/ordererOrganizations/insurance.local/orderers/orderer1.insurance.local/tls/ca.crt"
peer_env() {
  local org="$1" port msp
  case "$org" in
    1 | 2 | 3 | 4 | 5)
      local ports=(0 17051 19051 11051 12051 13051)
      port="${ports[$org]}"
      msp="Org${org}MSP"
      org="org${org}"
      ;;
    ojk)
      port=14051
      msp=OJKMSP
      ;;
    *)
      echo 'Unknown Fabric organization' >&2
      return 1
      ;;
  esac
  export CORE_PEER_LOCALMSPID="$msp"
  export CORE_PEER_MSPCONFIGPATH="$ROOT/.runtime/crypto/peerOrganizations/${org}.insurance.local/users/Admin@${org}.insurance.local/msp"
  export CORE_PEER_TLS_ROOTCERT_FILE="$ROOT/.runtime/crypto/peerOrganizations/${org}.insurance.local/peers/peer0.${org}.insurance.local/tls/ca.crt"
  export CORE_PEER_ADDRESS="localhost:$port"
  export CORE_PEER_TLS_SERVERHOSTOVERRIDE="peer0.${org}.insurance.local"
}
