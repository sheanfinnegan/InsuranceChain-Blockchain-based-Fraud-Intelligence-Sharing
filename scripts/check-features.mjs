import assert from 'node:assert/strict';
const base = 'http://127.0.0.1:3000';
async function request(path, cookie, body) {
  const r = await fetch(base + '/api/' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: base,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: r.status,
    data: await r.json(),
    cookie: r.headers.get('set-cookie')?.split(';')[0],
  };
}
async function login(email, portal) {
  const r = await request('login', null, { email, portal, password: 'InsuranceChain!2026' });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  return r.cookie;
}
const analyst = await login('analis@nusantara.test', 'analis');
const staff = await login('klaim@nusantara.test', 'staff');
const minimal = {
  title: 'Validasi lokasi simulasi',
  description: 'Kasus sintetis untuk pengujian lokasi dan identifier skripsi.',
  fraudType: 'Duplicate billing',
  amount: 1000000,
  identifiers: [
    { label: 'Nomor klaim', value: 'SIM-MAP-001' },
    { label: 'NIK sintetis', value: 'SIM-NIK-001' },
  ],
  files: [
    {
      name: 'evidence-heatmap-sintetis.txt',
      mime: 'text/plain',
      data: Buffer.from(
        'Evidence simulasi untuk pengujian skripsi. Bukan data pasien nyata.',
      ).toString('base64'),
    },
  ],
};
assert.equal((await request('cases', analyst, minimal)).status, 400);
console.log('PASS missing location rejected');
assert.equal(
  (await request('cases', analyst, { ...minimal, provinceId: '99', city: 'Kota Uji' })).status,
  400,
);
console.log('PASS invalid province rejected');
assert.equal(
  (
    await request('cases', analyst, {
      ...minimal,
      provinceId: '32',
      city: 'Kota Bandung',
      identifiers: [minimal.identifiers[0], minimal.identifiers[0]],
    })
  ).status,
  400,
);
console.log('PASS duplicate identifier rejected');
for (const path of ['cases', 'vote', 'invalidate'])
  assert.equal((await request(path, staff, {})).status, 403);
assert.equal((await request('blockchain', staff)).status, 403);
console.log('PASS staff denied case mutation, voting, invalidation and explorer API');
const initial = (await request('snapshot', analyst)).data;
assert.equal(initial.network.healthy, true);
const cases = [];
for (const [i, provinceId, city] of [
  [1, '32', 'Kota Bandung'],
  [2, '32', 'Kota Bekasi'],
  [3, '31', 'Jakarta Selatan'],
  [4, '73', 'Kota Makassar'],
]) {
  const title = `[SIMULASI PETA ${i}] Review dokumen klaim ${city}`;
  let c = initial.cases.find((c) => c.title === title);
  if (!c) {
    const created = await request('cases', analyst, { ...minimal, title, provinceId, city });
    assert.equal(created.status, 200, JSON.stringify(created.data));
    c = created.data;
  }
  assert.equal(c.provinceId, provinceId);
  assert.equal(c.city, city);
  assert.equal(c.identifiers.length, 2);
  assert.equal(c.identifiers[0].value, undefined);
  cases.push(c);
}
console.log('PASS 4 geographically located synthetic cases with 2 hashed identifiers');
const voter = await login('analis@sentra.test', 'analis');
if (cases[0].status === 'PENDING') {
  const vote = await request('vote', voter, {
    caseId: cases[0].id,
    roundId: cases[0].rounds[0].id,
    decision: 'APPROVE',
    reason: 'Pengujian skripsi: evidence sintetis sudah diperiksa dan sesuai temuan.',
  });
  assert.equal(vote.status, 200, JSON.stringify(vote.data));
  assert.equal(vote.data.status, 'APPROVED');
}
const logs = (await request('blockchain', analyst)).data.logs;
const committed = logs.find((l) => l.method === 'CreateCase' && l.status === 'COMMITTED');
assert.ok(committed);
assert.ok(committed.txId);
assert.ok(committed.blockNumber);
assert.deepEqual(
  committed.steps.map((s) => s.stage),
  ['PROPOSED', 'ENDORSED', 'SUBMITTED', 'COMMITTED'],
);
console.log('PASS real transaction stages, tx ID and block number captured');
const snapshot = (await request('snapshot', analyst)).data;
for (const c of cases)
  assert.equal(snapshot.cases.find((x) => x.id === c.id).provinceId, c.provinceId);
console.log('PASS locations persisted in Fabric ledger');
for (const cookie of [analyst, staff, voter]) await request('logout', cookie, {});
