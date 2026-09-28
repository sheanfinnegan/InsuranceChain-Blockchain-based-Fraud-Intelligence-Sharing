// Checks write endorsement through the OJK gateway, intentionally never submits.
import { connect, signers } from '@hyperledger/fabric-gateway';
import { Client, credentials } from '@grpc/grpc-js';
import { createPrivateKey } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fabricConnection } from '../lib/fabric-config';
import { fabric } from '../lib/fabric';
import { readState, pool } from '../lib/db';
async function main() {
  const c = fabricConnection('OJKMSP'),
    root = path.resolve(process.env.FABRIC_CRYPTO_PATH || '.runtime/crypto');
  const org = path.join(root, 'peerOrganizations', 'ojk.insurance.local'),
    msp = path.join(org, 'users', 'Admin@ojk.insurance.local', 'msp');
  const cert = fs.readFileSync(
    path.join(msp, 'signcerts', fs.readdirSync(path.join(msp, 'signcerts'))[0]),
  );
  const key = createPrivateKey(
    fs.readFileSync(path.join(msp, 'keystore', fs.readdirSync(path.join(msp, 'keystore'))[0])),
  );
  const client = new Client(
    c.endpoint,
    credentials.createSsl(fs.readFileSync(path.join(org, 'peers', c.peer, 'tls', 'ca.crt'))),
    { 'grpc.ssl_target_name_override': c.peer },
  );
  const gateway = connect({
    client,
    identity: { mspId: 'OJKMSP', credentials: cert },
    signer: signers.newPrivateKeySigner(key),
    endorseOptions: () => ({ deadline: Date.now() + 30000 }),
  });
  try {
    const state = await readState(),
      member = state.orgs.find((o) => o.id !== 'ojk' && o.status === 'ACTIVE')!;
    const proposal = gateway
      .getNetwork(c.channel)
      .getContract(c.chaincode)
      .newProposal('SetMember', { arguments: [member.id, member.mspId, 'true'] });
    const transaction = await proposal.endorse();
    assert.ok(transaction.getBytes().length > 0);
    console.log(
      'PASS governance endorsed through OJK gateway under channel policy; NOT submitted.',
    );
  } finally {
    gateway.close();
    client.close();
  }
  const endpoint = process.env.FABRIC_OJK_ENDPOINT;
  try {
    process.env.FABRIC_OJK_ENDPOINT = '127.0.0.1:1';
    await assert.rejects(() => fabric('OJKMSP', 'ListCases', []));
    console.log('PASS unavailable OJK gateway fails closed; no insurer fallback.');
  } finally {
    if (endpoint === undefined) delete process.env.FABRIC_OJK_ENDPOINT;
    else process.env.FABRIC_OJK_ENDPOINT = endpoint;
  }
}
main()
  .finally(() => pool.end())
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
