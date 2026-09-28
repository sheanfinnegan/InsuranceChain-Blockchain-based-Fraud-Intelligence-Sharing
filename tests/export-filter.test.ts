import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyExportFilters, filterExport } from '../lib/export-filter';
import type { FraudCase } from '../lib/types';
const cases = [
  {
    id: 'a',
    createdAt: '2026-09-26T17:00:00Z',
    orgId: 'one',
    status: 'APPROVED',
    provinceId: '32',
    fraudType: 'Upcoding',
  },
  {
    id: 'b',
    createdAt: '2026-09-26T16:59:59Z',
    orgId: 'two',
    status: 'PENDING',
    provinceId: '31',
    fraudType: 'Other',
  },
] as FraudCase[];
test('export dates are inclusive Jakarta days and filters intersect', () => {
  assert.deepEqual(
    filterExport(cases, {
      ...emptyExportFilters,
      from: '2026-09-27',
      to: '2026-09-27',
      org: 'one',
      status: 'APPROVED',
      province: '32',
      type: 'Upcoding',
    }).map((c) => c.id),
    ['a'],
  );
  assert.equal(
    filterExport(cases, { ...emptyExportFilters, org: 'two', status: 'APPROVED' }).length,
    0,
  );
});
test('export rejects reversed and invalid dates', () => {
  for (const f of [
    { from: '2026-09-28', to: '2026-09-27' },
    { from: '2026-02-30' },
    { from: 'garbage' },
  ])
    assert.throws(() => filterExport(cases, { ...emptyExportFilters, ...f }));
});
