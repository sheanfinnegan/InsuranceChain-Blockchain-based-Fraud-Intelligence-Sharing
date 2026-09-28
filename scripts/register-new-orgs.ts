import { fabric } from '../lib/fabric';
import { mutate, passwordHash, pool } from '../lib/db';
async function main() {
  for (const [id, name, mspId, person] of [
    ['cakrawala', 'Cakrawala Proteksi', 'Org4MSP', 'Alya Maharani'],
    ['pradana', 'Pradana Life', 'Org5MSP', 'Fajar Pradana'],
  ]) {
    await fabric('OJKMSP', 'SetMember', [id, mspId, 'true'], true);
    await mutate((s) => {
      const now = new Date().toISOString();
      if (!s.orgs.some((o) => o.id === id))
        s.orgs.push({
          id,
          name,
          mspId,
          license: `SIM-OJK-00${mspId === 'Org4MSP' ? 4 : 5}`,
          status: 'ACTIVE',
          joinedAt: now,
        });
      if (!s.users.some((u) => u.id === 'analyst-' + id))
        s.users.push({
          id: 'analyst-' + id,
          orgId: id,
          name: person,
          email: `analis@${id}.test`,
          role: 'ANALYST',
          status: 'ACTIVE',
          passwordHash: passwordHash(process.env.DEMO_PASSWORD || 'InsuranceChain!2026'),
        });
      if (!s.users.some((u) => u.id === 'staff-' + id))
        s.users.push({
          id: 'staff-' + id,
          orgId: id,
          name: `Tim Klaim ${name}`,
          email: `klaim@${id}.test`,
          role: 'CLAIM_STAFF',
          status: 'ACTIVE',
          passwordHash: passwordHash(process.env.DEMO_PASSWORD || 'InsuranceChain!2026'),
        });
      if (!s.audit.some((e) => e.action === 'ORGANIZATION_ADDED' && e.orgId === id))
        s.audit.unshift({
          id: 'onboard-' + id,
          action: 'ORGANIZATION_ADDED',
          orgId: id,
          userId: 'regulator',
          at: now,
          txId: '',
          detail: `${name} diprovisikan dengan ${mspId} dan peer mandiri.`,
        });
    });
    const cases = await fabric(mspId, 'ListCases', []);
    console.log(`${name}: ledger readable; ${cases.length} cases.`);
  }
  await pool.end();
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
  pool.end();
});
