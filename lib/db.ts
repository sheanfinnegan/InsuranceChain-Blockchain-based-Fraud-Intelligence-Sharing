import { Pool } from 'pg';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import type { AppState } from './types';
export const hash = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
export function passwordHash(password: string) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + scryptSync(password, salt, 64).toString('hex');
}
export function verifyPassword(password: string, stored: string) {
  const [salt, h] = stored.split(':');
  const derived = scryptSync(password, salt, 64);
  return (
    !!h &&
    derived.length === Buffer.from(h, 'hex').length &&
    timingSafeEqual(derived, Buffer.from(h, 'hex'))
  );
}
const globalDb = globalThis as unknown as { insurancePool?: Pool; insuranceReady?: Promise<void> };
export const pool = (globalDb.insurancePool ??= new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 8,
}));
function seed(): AppState {
  const now = new Date().toISOString();
  const names = ['Nusantara Assurance', 'Sentra Life', 'Arunika Insurance'];
  const ids = ['nusantara', 'sentra', 'arunika'];
  const p = passwordHash(process.env.DEMO_PASSWORD || 'InsuranceChain!2026');
  return {
    orgs: [
      ...names.map((name, i) => ({
        id: ids[i],
        name,
        mspId: `Org${i + 1}MSP`,
        license: `SIM-OJK-00${i + 1}`,
        status: 'ACTIVE',
        joinedAt: now,
      })),
      {
        id: 'ojk',
        name: 'Otoritas Jasa Keuangan',
        mspId: 'OJKMSP',
        license: 'REGULATOR',
        status: 'ACTIVE',
        joinedAt: now,
      },
    ],
    users: [
      ...names.map((_, i) => ({
        id: `analyst-${ids[i]}`,
        orgId: ids[i],
        name: ['Aditya Pratama', 'Nadia Putri', 'Raka Wijaya'][i],
        email: `analis@${ids[i]}.test`,
        role: 'ANALYST' as const,
        status: 'ACTIVE',
        passwordHash: p,
      })),
      {
        id: 'staff-nusantara',
        orgId: 'nusantara',
        name: 'Dewi Anggraini',
        email: 'klaim@nusantara.test',
        role: 'CLAIM_STAFF',
        status: 'ACTIVE',
        passwordHash: p,
      },
      {
        id: 'regulator',
        orgId: 'ojk',
        name: 'Ratna Kusuma',
        email: 'regulator@ojk.test',
        role: 'OJK',
        status: 'ACTIVE',
        passwordHash: p,
      },
    ],
    registrations: [],
    sessions: [],
    files: [],
    audit: [],
  };
}
async function ready() {
  globalDb.insuranceReady ??= (async () => {
    await pool.query(
      'CREATE TABLE IF NOT EXISTS insurance_app (id integer PRIMARY KEY, state jsonb NOT NULL)',
    );
    await pool.query('INSERT INTO insurance_app(id,state) VALUES (1,$1) ON CONFLICT DO NOTHING', [
      JSON.stringify(seed()),
    ]);
  })();
  await globalDb.insuranceReady;
}
export async function readState(): Promise<AppState> {
  await ready();
  return (await pool.query('SELECT state FROM insurance_app WHERE id=1')).rows[0].state;
}
export async function mutate<T>(fn: (s: AppState) => Promise<T> | T): Promise<T> {
  await ready();
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const s = (await c.query('SELECT state FROM insurance_app WHERE id=1 FOR UPDATE')).rows[0]
      .state as AppState;
    const result = await fn(s);
    await c.query('UPDATE insurance_app SET state=$1 WHERE id=1', [JSON.stringify(s)]);
    await c.query('COMMIT');
    return result;
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}
