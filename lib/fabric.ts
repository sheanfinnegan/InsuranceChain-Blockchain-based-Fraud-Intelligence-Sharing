import { connect, signers } from '@hyperledger/fabric-gateway';
import { Client, credentials } from '@grpc/grpc-js';
import { createPrivateKey, randomUUID } from 'node:crypto';
import { saveBlockchainLog, type BlockchainLog } from './blockchain-log';
import fs from 'node:fs';
import path from 'node:path';
import { fabricConnection, queryOrganizations } from './fabric-config';
const root = () => path.resolve(process.env.FABRIC_CRYPTO_PATH || '.runtime/crypto');
export async function fabric(mspId: string, method: string, args: unknown[], write = false) {
  const connection = fabricConnection(mspId);
  const org = connection.org;
  const domain = `${org}.insurance.local`;
  const base = path.join(root(), 'peerOrganizations', domain, 'users', `Admin@${domain}`, 'msp');
  const cert = fs.readFileSync(
    path.join(base, 'signcerts', fs.readdirSync(path.join(base, 'signcerts'))[0]),
  );
  const key = createPrivateKey(
    fs.readFileSync(path.join(base, 'keystore', fs.readdirSync(path.join(base, 'keystore'))[0])),
  );
  const tls = fs.readFileSync(
    path.join(root(), 'peerOrganizations', domain, 'peers', connection.peer, 'tls', 'ca.crt'),
  );
  const client = new Client(connection.endpoint, credentials.createSsl(tls), {
    'grpc.ssl_target_name_override': connection.peer,
  });
  const gateway = connect({
    client,
    identity: { mspId, credentials: cert },
    signer: signers.newPrivateKeySigner(key),
    evaluateOptions: () => ({ deadline: Date.now() + 15000 }),
    endorseOptions: () => ({ deadline: Date.now() + 30000 }),
    submitOptions: () => ({ deadline: Date.now() + 15000 }),
    commitStatusOptions: () => ({ deadline: Date.now() + 60000 }),
  });
  const now = new Date().toISOString();
  const log: BlockchainLog = {
    id: randomUUID(),
    method,
    mspId,
    gatewayPeer: connection.peer,
    gatewayEndpoint: connection.endpoint,
    kind: write ? 'WRITE' : 'READ',
    status: 'PROPOSED',
    txId: '',
    startedAt: now,
    updatedAt: now,
    steps: [],
  };
  // Observability must never convert a successful ledger commit into an API failure.
  async function stage(status: string) {
    log.status = status;
    log.updatedAt = new Date().toISOString();
    log.steps.push({ stage: status, at: log.updatedAt });
    try {
      await saveBlockchainLog(log);
    } catch (e) {
      console.error('Blockchain log persistence failed', e);
    }
  }
  let submitted = false;
  try {
    const contract = gateway.getNetwork(connection.channel).getContract(connection.chaincode);
    const encoded = args.map((x) => (typeof x === 'string' ? x : JSON.stringify(x)));
    const proposal = contract.newProposal(method, {
      arguments: encoded,
      endorsingOrganizations: queryOrganizations(mspId, write),
    });
    log.txId = proposal.getTransactionId();
    await stage('PROPOSED');
    let result: Uint8Array;
    if (write) {
      const transaction = await proposal.endorse();
      await stage('ENDORSED');
      submitted = true;
      const commit = await transaction.submit();
      await stage('SUBMITTED');
      const status = await commit.getStatus();
      log.blockNumber = String(status.blockNumber);
      log.code = status.code;
      await stage(status.successful ? 'COMMITTED' : 'INVALID');
      if (!status.successful)
        throw new Error('Transaksi ditolak saat commit. Validation code: ' + status.code);
      result = transaction.getResult();
    } else {
      result = await proposal.evaluate();
      await stage('EVALUATED');
    }
    return result.length ? JSON.parse(Buffer.from(result).toString()) : null;
  } catch (e) {
    if (log.status !== 'INVALID' && log.status !== 'COMMITTED') {
      log.error = submitted
        ? 'Respons commit belum dapat dipastikan. Periksa ledger sebelum mengulangi transaksi.'
        : 'Proposal atau endorsement gagal. Tidak ada konfirmasi penulisan ke ledger.';
      await stage(submitted ? 'UNKNOWN' : 'FAILED');
    }
    throw e;
  } finally {
    gateway.close();
    client.close();
  }
}
