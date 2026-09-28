import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeIdentifiers } from '../lib/identifiers';
import { validateLocation, provinces } from '../lib/provinces';
test('identifiers preserve readable values while ledger projection excludes them', () => {
  const ids = normalizeIdentifiers([
    { label: 'Nama lengkap', value: ' Ardan Wicaksana ' },
    { label: 'NIK', value: '0000000000000001' },
  ]);
  assert.equal(ids[0].value, 'Ardan Wicaksana');
  assert.equal(
    ids[0].hash,
    normalizeIdentifiers([{ label: 'Nama lengkap', value: 'ardanwicaksana' }])[0].hash,
  );
  const ledger = ids.map(({ value, ...i }) => i);
  assert.ok(!JSON.stringify(ledger).includes('Ardan'));
  assert.throws(() => normalizeIdentifiers([{ label: 'Nomor klaim', value: 'CLM123' }]));
  assert.throws(() => normalizeIdentifiers([{ label: 'NIK', value: '123' }]));
});
test('reject duplicate, incomplete and excessive identifiers', () => {
  assert.throws(() => normalizeIdentifiers([]));
  assert.throws(() =>
    normalizeIdentifiers([
      { label: 'NIK', value: '123' },
      { label: ' nik ', value: ' 123 ' },
    ]),
  );
  assert.throws(() => normalizeIdentifiers([{ label: 'NIK', value: '' }]));
  assert.throws(() => normalizeIdentifiers(Array(21).fill({ label: 'NIK', value: '123' })));
});
test('incident location is required and restricted to supported provinces', () => {
  assert.equal(provinces.length, 38);
  assert.equal(new Set(provinces.map((p) => p.id)).size, 38);
  assert.throws(() => validateLocation('', 'Jakarta'));
  assert.throws(() => validateLocation('99', 'Jakarta'));
  assert.throws(() => validateLocation('31', ''));
  assert.deepEqual(validateLocation('32', ' Kota Bandung '), {
    provinceId: '32',
    city: 'Kota Bandung',
  });
});
