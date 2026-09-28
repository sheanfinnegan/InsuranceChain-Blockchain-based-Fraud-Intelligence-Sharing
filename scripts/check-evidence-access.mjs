import assert from 'node:assert/strict';
const base = 'http://127.0.0.1:3000';
const login = await fetch(base + '/api/login', {
  method: 'POST',
  headers: { Origin: base, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'klaim@nusantara.test',
    password: 'InsuranceChain!2026',
    portal: 'staff',
  }),
});
assert.equal(login.status, 200);
const cookie = login.headers.get('set-cookie').split(';')[0];
try {
  const snapshot = await (
    await fetch(base + '/api/snapshot', { headers: { Cookie: cookie } })
  ).json();
  const c = snapshot.cases.find((c) => c.identifiers.some((i) => i.value === 'Ardan Wicaksana'));
  assert.ok(c);
  const r = await fetch(base + '/api/file/' + c.evidence[1].id + '?preview=1', {
    headers: { Cookie: cookie },
  });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'image/png');
  for (const path of ['export', 'blockchain'])
    assert.equal((await fetch(base + '/api/' + path, { headers: { Cookie: cookie } })).status, 403);
  console.log('PASS staff reads full identifiers and evidence; export/blockchain remain forbidden');
} finally {
  await fetch(base + '/api/logout', {
    method: 'POST',
    headers: { Origin: base, Cookie: cookie, 'Content-Type': 'application/json' },
    body: '{}',
  });
}
