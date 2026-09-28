import assert from 'node:assert/strict';
const base = 'http://127.0.0.1:3000';
const root = await fetch(base, { redirect: 'manual' });
assert.equal(root.status, 307);
assert.equal(root.headers.get('location'), '/analis');
console.log('PASS / redirects to /analis');
for (const [portal, email, role] of [
  ['analis', 'analis@nusantara.test', 'ANALYST'],
  ['staff', 'klaim@nusantara.test', 'CLAIM_STAFF'],
  ['ojk', 'regulator@ojk.test', 'OJK'],
]) {
  const page = await fetch(base + '/' + portal);
  assert.equal(page.status, 200);
  const res = await fetch(base + '/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({ email, password: 'InsuranceChain!2026', portal }),
  });
  const data = await res.json();
  assert.equal(res.status, 200, JSON.stringify(data));
  assert.equal(data.user.role, role);
  const cookie = res.headers.get('set-cookie')?.split(';')[0];
  assert.ok(cookie);
  const session = await fetch(base + '/api/snapshot', { headers: { Cookie: cookie } });
  const snapshot = await session.json();
  assert.equal(session.status, 200, JSON.stringify(snapshot));
  assert.equal(snapshot.user.role, role);
  console.log(
    'PASS ' + portal + ' login + authenticated session; ledger healthy=' + snapshot.network.healthy,
  );
  await fetch(base + '/api/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base, Cookie: cookie },
    body: '{}',
  });
}
const wrong = await fetch(base + '/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: base },
  body: JSON.stringify({
    email: 'klaim@nusantara.test',
    password: 'InsuranceChain!2026',
    portal: 'ojk',
  }),
});
assert.equal(wrong.status, 400);
assert.match((await wrong.json()).error, /portal/);
console.log('PASS wrong-role login rejected');
const cross = await fetch(base + '/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: 'https://evil.test' },
  body: JSON.stringify({
    email: 'analis@nusantara.test',
    password: 'InsuranceChain!2026',
    portal: 'analis',
  }),
});
assert.equal(cross.status, 403);
console.log('PASS cross-origin POST rejected');
