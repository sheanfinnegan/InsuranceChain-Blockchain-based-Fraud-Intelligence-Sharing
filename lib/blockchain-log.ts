import { pool } from './db';
export type BlockchainLog = {
  id: string;
  method: string;
  mspId: string;
  gatewayPeer?: string;
  gatewayEndpoint?: string;
  kind: string;
  status: string;
  txId: string;
  startedAt: string;
  updatedAt: string;
  blockNumber?: string;
  code?: number;
  steps: { stage: string; at: string }[];
  error?: string;
};
async function ready() {
  await pool.query(
    'CREATE TABLE IF NOT EXISTS insurance_blockchain_log(id text PRIMARY KEY, started_at timestamptz NOT NULL, data jsonb NOT NULL)',
  );
}
export async function saveBlockchainLog(log: BlockchainLog) {
  await ready();
  await pool.query(
    'INSERT INTO insurance_blockchain_log(id,started_at,data) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data',
    [log.id, log.startedAt, JSON.stringify(log)],
  );
}
export async function blockchainLogs() {
  await ready();
  return (
    await pool.query('SELECT data FROM insurance_blockchain_log ORDER BY started_at DESC LIMIT 200')
  ).rows.map((r) => r.data as BlockchainLog);
}
