import fs from 'node:fs';
import path from 'node:path';
const base = process.cwd();
const runtime = path.join(base, '.runtime');
fs.mkdirSync(runtime, { recursive: true });
const orgs = ['org1', 'org2', 'org3', 'org4', 'org5', 'ojk'];
const msp = (o) => (o === 'ojk' ? 'OJKMSP' : o[0].toUpperCase() + o.slice(1) + 'MSP');
fs.writeFileSync(
  path.join(runtime, 'crypto-config.yaml'),
  `OrdererOrgs:
  - Name: Orderer
    Domain: insurance.local
    Specs:
      - Hostname: orderer1
      - Hostname: orderer2
      - Hostname: orderer3
PeerOrgs:
${orgs
  .map(
    (o) => `  - Name: ${msp(o)}
    Domain: ${o}.insurance.local
    EnableNodeOUs: true
    Template:
      Count: 1
    Users:
      Count: 1`,
  )
  .join('\n')}
`,
);
const policy = (type, rule) => `{Type: ${type}, Rule: ${JSON.stringify(rule)}}`;
const op = orgs
  .map(
    (o) => `  - &${msp(o)}
    Name: ${msp(o)}
    ID: ${msp(o)}
    MSPDir: crypto/peerOrganizations/${o}.insurance.local/msp
    Policies:
      Readers: ${policy('Signature', `OR('${msp(o)}.admin', '${msp(o)}.peer', '${msp(o)}.client')`)}
      Writers: ${policy('Signature', `OR('${msp(o)}.admin', '${msp(o)}.client')`)}
      Admins: ${policy('Signature', `OR('${msp(o)}.admin')`)}
      Endorsement: ${policy('Signature', `OR('${msp(o)}.peer')`)}
    AnchorPeers:
      - Host: peer0.${o}.insurance.local
        Port: 7051`,
  )
  .join('\n');
fs.writeFileSync(
  path.join(runtime, 'configtx.yaml'),
  `Organizations:
  - &OrdererOrg
    Name: OrdererMSP
    ID: OrdererMSP
    MSPDir: crypto/ordererOrganizations/insurance.local/msp
    Policies:
      Readers: ${policy('Signature', "OR('OrdererMSP.member')")}
      Writers: ${policy('Signature', "OR('OrdererMSP.member')")}
      Admins: ${policy('Signature', "OR('OrdererMSP.admin')")}
${op}
Capabilities:
  Channel: &ChannelCapabilities {V2_0: true}
  Orderer: &OrdererCapabilities {V2_0: true}
  Application: &ApplicationCapabilities {V2_5: true}
Application: &ApplicationDefaults
  Organizations:
  Policies:
    Readers: ${policy('ImplicitMeta', 'ANY Readers')}
    Writers: ${policy('ImplicitMeta', 'ANY Writers')}
    Admins: ${policy('ImplicitMeta', 'MAJORITY Admins')}
    LifecycleEndorsement: ${policy('Signature', "OutOf(2, 'Org1MSP.peer', 'Org2MSP.peer', 'Org3MSP.peer')")}
    Endorsement: ${policy('Signature', "OutOf(2, 'Org1MSP.peer', 'Org2MSP.peer', 'Org3MSP.peer')")}
  Capabilities: *ApplicationCapabilities
Orderer: &OrdererDefaults
  OrdererType: etcdraft
  Addresses: [orderer1.insurance.local:7050, orderer2.insurance.local:7050, orderer3.insurance.local:7050]
  EtcdRaft:
    Consenters:
${[1, 2, 3]
  .map(
    (i) => `      - Host: orderer${i}.insurance.local
        Port: 7050
        ClientTLSCert: crypto/ordererOrganizations/insurance.local/orderers/orderer${i}.insurance.local/tls/server.crt
        ServerTLSCert: crypto/ordererOrganizations/insurance.local/orderers/orderer${i}.insurance.local/tls/server.crt`,
  )
  .join('\n')}
  BatchTimeout: 1s
  BatchSize: {MaxMessageCount: 10, AbsoluteMaxBytes: 99 MB, PreferredMaxBytes: 512 KB}
  Organizations:
  Policies:
    Readers: ${policy('ImplicitMeta', 'ANY Readers')}
    Writers: ${policy('ImplicitMeta', 'ANY Writers')}
    Admins: ${policy('ImplicitMeta', 'MAJORITY Admins')}
    BlockValidation: ${policy('ImplicitMeta', 'ANY Writers')}
  Capabilities: *OrdererCapabilities
Channel: &ChannelDefaults
  Policies:
    Readers: ${policy('ImplicitMeta', 'ANY Readers')}
    Writers: ${policy('ImplicitMeta', 'ANY Writers')}
    Admins: ${policy('ImplicitMeta', 'MAJORITY Admins')}
  Capabilities: *ChannelCapabilities
Profiles:
  InsuranceGenesis:
    <<: *ChannelDefaults
    Orderer:
      <<: *OrdererDefaults
      Organizations: [*OrdererOrg]
    Consortiums:
      InsuranceConsortium:
        Organizations: [*Org1MSP, *Org2MSP, *Org3MSP, *OJKMSP]
  InsuranceChannel:
    Consortium: InsuranceConsortium
    <<: *ChannelDefaults
    Application:
      <<: *ApplicationDefaults
      Organizations: [*Org1MSP, *Org2MSP, *Org3MSP, *OJKMSP]
`,
);
let compose = `name: insurancechain
services:
  postgres:
    image: postgres:15-alpine
    container_name: ic-postgres
    environment:
      POSTGRES_USER: insurance
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
      POSTGRES_DB: insurancechain
    ports: ["127.0.0.1:15432:5432"]
    volumes: ["postgres:/var/lib/postgresql/data"]
    networks: [insurance]
  storage:
    image: rustfs/rustfs:latest
    container_name: ic-storage
    command: /data
    environment:
      RUSTFS_ACCESS_KEY: \${S3_ACCESS_KEY}
      RUSTFS_SECRET_KEY: \${S3_SECRET_KEY}
    ports: ["127.0.0.1:19000:9000", "127.0.0.1:19001:9001"]
    volumes: ["storage:/data"]
    networks: [insurance]
`;
for (let i = 1; i <= 3; i++)
  compose += `  orderer${i}:
    image: hyperledger/fabric-orderer:2.5.16
    container_name: ic-orderer${i}
    hostname: orderer${i}.insurance.local
    environment:
      ORDERER_GENERAL_LISTENADDRESS: 0.0.0.0
      ORDERER_GENERAL_LOCALMSPID: OrdererMSP
      ORDERER_GENERAL_LOCALMSPDIR: /var/hyperledger/orderer/msp
      ORDERER_GENERAL_BOOTSTRAPMETHOD: file
      ORDERER_GENERAL_BOOTSTRAPFILE: /var/hyperledger/orderer/genesis.block
      ORDERER_GENERAL_TLS_ENABLED: "true"
      ORDERER_GENERAL_TLS_PRIVATEKEY: /var/hyperledger/orderer/tls/server.key
      ORDERER_GENERAL_TLS_CERTIFICATE: /var/hyperledger/orderer/tls/server.crt
      ORDERER_GENERAL_TLS_ROOTCAS: "[/var/hyperledger/orderer/tls/ca.crt]"
      ORDERER_GENERAL_CLUSTER_CLIENTCERTIFICATE: /var/hyperledger/orderer/tls/server.crt
      ORDERER_GENERAL_CLUSTER_CLIENTPRIVATEKEY: /var/hyperledger/orderer/tls/server.key
      ORDERER_GENERAL_CLUSTER_ROOTCAS: "[/var/hyperledger/orderer/tls/ca.crt]"
    ports: ["127.0.0.1:${16050 + i * 1000}:7050"]
    volumes:
      - ../.runtime/genesis.block:/var/hyperledger/orderer/genesis.block:ro
      - ../.runtime/crypto/ordererOrganizations/insurance.local/orderers/orderer${i}.insurance.local/msp:/var/hyperledger/orderer/msp:ro
      - ../.runtime/crypto/ordererOrganizations/insurance.local/orderers/orderer${i}.insurance.local/tls:/var/hyperledger/orderer/tls:ro
      - orderer${i}:/var/hyperledger/production/orderer
    networks:
      insurance:
        aliases: [orderer${i}.insurance.local]
`;
for (let i = 1; i <= 5; i++)
  compose += `  couch${i}:
    image: couchdb:3.3.3
    container_name: ic-couch${i}
    environment: {COUCHDB_USER: insurance, COUCHDB_PASSWORD: "\${COUCHDB_PASSWORD}"}
    volumes: ["couch${i}:/opt/couchdb/data"]
    networks: [insurance]
  peer${i}:
    image: hyperledger/fabric-peer:2.5.16
    container_name: ic-peer${i}
    hostname: peer0.org${i}.insurance.local
    environment:
      CORE_PEER_ID: peer0.org${i}.insurance.local
      CORE_PEER_ADDRESS: peer0.org${i}.insurance.local:7051
      CORE_PEER_LISTENADDRESS: 0.0.0.0:7051
      CORE_PEER_CHAINCODEADDRESS: peer0.org${i}.insurance.local:7052
      CORE_PEER_CHAINCODELISTENADDRESS: 0.0.0.0:7052
      CORE_PEER_GOSSIP_EXTERNALENDPOINT: peer0.org${i}.insurance.local:7051
      CORE_PEER_GOSSIP_USELEADERELECTION: "true"
      CORE_PEER_GOSSIP_ORGLEADER: "false"
      CORE_PEER_LOCALMSPID: Org${i}MSP
      CORE_PEER_MSPCONFIGPATH: /etc/hyperledger/fabric/msp
      CORE_PEER_TLS_ENABLED: "true"
      CORE_PEER_TLS_CERT_FILE: /etc/hyperledger/fabric/tls/server.crt
      CORE_PEER_TLS_KEY_FILE: /etc/hyperledger/fabric/tls/server.key
      CORE_PEER_TLS_ROOTCERT_FILE: /etc/hyperledger/fabric/tls/ca.crt
      CORE_VM_ENDPOINT: unix:///host/var/run/docker.sock
      CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE: insurancechain_network
      CORE_LEDGER_STATE_STATEDATABASE: CouchDB
      CORE_LEDGER_STATE_COUCHDBCONFIG_COUCHDBADDRESS: couch${i}:5984
      CORE_LEDGER_STATE_COUCHDBCONFIG_USERNAME: insurance
      CORE_LEDGER_STATE_COUCHDBCONFIG_PASSWORD: \${COUCHDB_PASSWORD}
      CORE_CHAINCODE_EXECUTETIMEOUT: 300s
    ports: ["127.0.0.1:${[0, 17051, 19051, 11051, 12051, 13051][i]}:7051"]
    volumes:
      - /var/run/docker.sock:/host/var/run/docker.sock
      - ../.runtime/crypto/peerOrganizations/org${i}.insurance.local/peers/peer0.org${i}.insurance.local/msp:/etc/hyperledger/fabric/msp:ro
      - ../.runtime/crypto/peerOrganizations/org${i}.insurance.local/peers/peer0.org${i}.insurance.local/tls:/etc/hyperledger/fabric/tls:ro
      - peer${i}:/var/hyperledger/production
    depends_on: [couch${i}]
    networks:
      insurance:
        aliases: [peer0.org${i}.insurance.local]
`;
// OJK gets the same peer/CouchDB isolation as an insurer, with its own MSP and volumes.
compose += compose
  .slice(compose.indexOf('  couch5:'))
  .replaceAll('org5.insurance.local', 'ojk.insurance.local')
  .replaceAll('Org5MSP', 'OJKMSP')
  .replaceAll('couch5', 'couch-ojk')
  .replaceAll('peer5', 'peer-ojk')
  .replaceAll('13051', '14051');
compose += `networks:
  insurance:
    name: insurancechain_network
volumes:
  postgres:
  storage:
  orderer1:
  orderer2:
  orderer3:
  peer1:
  peer2:
  peer3:
  peer4:
  peer5:
  couch1:
  couch2:
  couch3:
  couch4:
  couch5:
  peer-ojk:
  couch-ojk:
`;
fs.mkdirSync('infra', { recursive: true });
fs.writeFileSync('infra/compose.yaml', compose);
console.log('Network configuration generated.');
