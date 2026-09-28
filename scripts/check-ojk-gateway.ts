import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fabric } from '../lib/fabric';
import { fabricConnection } from '../lib/fabric-config';
import { readState, pool } from '../lib/db';
import type { FraudCase } from '../lib/types';
async function main() {
  const before = (await fabric('OJKMSP', 'ListCases', [])) as FraudCase[];
  assert.equal(fabricConnection('OJKMSP').org, 'ojk');
  const insurer = (await fabric('Org1MSP', 'ListCases', [])) as FraudCase[];
  assert.deepEqual(before, insurer);
  const state = await readState();
  const active = state.orgs.filter((o) => o.id !== 'ojk' && o.status === 'ACTIVE');
  assert.ok(active.length >= 3);
  const sample = before.find((c) => c.evidence.length && c.identifiers.length)!;
  const payload = {
    ...sample,
    id: 'VERIFY-OJK-NO-COMMIT',
    title: 'Verifikasi putaran tanpa commit',
    provinceId: '32',
    city: 'Kota Bandung',
    createdBy: 'verification',
  };
  const simulated = (await fabric(active[0].mspId, 'CreateCase', [payload])) as FraudCase;
  assert.deepEqual([...simulated.rounds[0].participants].sort(), active.map((o) => o.id).sort());
  assert.equal(simulated.rounds[0].threshold, Math.ceil((2 * active.length) / 3));
  for (const [fn, args] of [
    ['CreateCase', [payload]],
    [
      'CastVote',
      [sample.id, sample.rounds[0].id, 'regulator', 'APPROVE', 'Must reject regulator voting'],
    ],
    ['Invalidate', [sample.id, 'regulator', 'Must reject regulator invalidation', sample.evidence]],
  ] as [string, unknown[]][]) {
    await assert.rejects(() => fabric('OJKMSP', fn, args));
  }
  await assert.rejects(() => fabric('OJKMSP', 'SetMember', ['ojk', 'OJKMSP', 'true']));
  // Simulate governance on OJK's own peer without submitting a persistent transaction.
  await fabric('OJKMSP', 'SetMember', [active[0].id, active[0].mspId, 'true']);
  const after = (await fabric('OJKMSP', 'ListCases', [])) as FraudCase[];
  assert.deepEqual(after, before);
  const report = {
    gateway: fabricConnection('OJKMSP'),
    cases: after.length,
    activeInsurers: active.length,
    threshold: simulated.rounds[0].threshold,
    regulatorBusinessWritesRejected: true,
    governanceEvaluatedWithoutCommit: true,
    existingCasesUnchanged: true,
  };
  fs.mkdirSync('.runtime/ojk-verification', { recursive: true });
  fs.writeFileSync('.runtime/ojk-verification/gateway.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
main()
  .finally(() => pool.end())
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
