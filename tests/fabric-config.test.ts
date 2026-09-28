import test from 'node:test';
import assert from 'node:assert/strict';
import { fabricConnection, queryOrganizations } from '../lib/fabric-config';
test('OJK has its own TLS peer and gateway with no insurer fallback', () => {
  const c = fabricConnection('OJKMSP', {});
  assert.equal(c.org, 'ojk');
  assert.equal(c.endpoint, 'localhost:14051');
  assert.equal(c.peer, 'peer0.ojk.insurance.local');
  assert.equal(
    fabricConnection('OJKMSP', { FABRIC_OJK_ENDPOINT: 'peer0.ojk.insurance.local:7051' }).endpoint,
    'peer0.ojk.insurance.local:7051',
  );
  assert.throws(() => fabricConnection('UnknownMSP', {}));
});
test('regulator evaluate stays in OJK while governance keeps channel endorsement policy', () => {
  assert.deepEqual(queryOrganizations('OJKMSP', false), ['OJKMSP']);
  assert.equal(queryOrganizations('OJKMSP', true), undefined);
  assert.equal(queryOrganizations('Org1MSP', false), undefined);
  assert.equal(fabricConnection('Org1MSP', {}).endpoint, 'localhost:17051');
});
