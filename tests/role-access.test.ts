import test from 'node:test';
import assert from 'node:assert/strict';
import { canReadCase, canReadBlockchain, portalView } from '../lib/role-access';
test('claim staff sees approved and invalid cases only', () => {
  for (const status of ['PENDING', 'APPROVED', 'REJECTED', 'INVALID']) {
    assert.equal(canReadCase('CLAIM_STAFF', { status }), ['APPROVED', 'INVALID'].includes(status));
    assert.equal(canReadCase('ANALYST', { status }), true);
    assert.equal(canReadCase('OJK', { status }), true);
  }
});
test('blockchain is OJK only and direct views resolve safely', () => {
  assert.equal(canReadBlockchain('OJK'), true);
  assert.equal(canReadBlockchain('ANALYST'), false);
  assert.equal(canReadBlockchain('CLAIM_STAFF'), false);
  assert.equal(portalView('analis', 'blockchain'), 'dashboard');
  assert.equal(portalView('staff', 'blockchain'), 'dashboard');
  assert.equal(portalView('ojk', 'search'), 'history');
  assert.equal(portalView('ojk', 'blockchain'), 'blockchain');
  assert.equal(portalView('staff', 'voting'), 'dashboard');
});
