import assert from 'node:assert/strict';
const base = 'http://127.0.0.1:3000';
let allCases = [];
for (const [portal, email] of [
  ['analis', 'analis@nusantara.test'],
  ['staff', 'klaim@nusantara.test'],
  ['ojk', 'regulator@ojk.test'],
]) {
  const r = await fetch(base + '/api/login', {
    method: 'POST',
    headers: { Origin: base, 'Content-Type': 'application/json' },
    body: JSON.stringify({ portal, email, password: 'InsuranceChain!2026' }),
  });
  assert.equal(r.status, 200);
  const cookie = r.headers.get('set-cookie').split(';')[0],
    headers = { Cookie: cookie };
  try {
    const s = await (await fetch(base + '/api/snapshot', { headers })).json();
    assert.equal(s.network.healthy, true);
    assert.equal(
      (await fetch(base + '/api/blockchain', { headers })).status,
      portal === 'ojk' ? 200 : 403,
    );
    if (portal === 'analis') allCases = s.cases;
    if (portal === 'staff') {
      assert.deepEqual(
        s.cases.map((c) => c.id).sort(),
        allCases
          .filter((c) => ['APPROVED', 'INVALID'].includes(c.status))
          .map((c) => c.id)
          .sort(),
      );
      const hidden = allCases.find(
        (c) => ['PENDING', 'REJECTED'].includes(c.status) && c.evidence.length,
      );
      assert.ok(hidden);
      assert.equal(
        (await fetch(base + '/api/file/' + hidden.evidence[0].id + '?preview=1', { headers }))
          .status,
        403,
      );
      console.log('PASS staff totals use only approved/invalid; pending evidence denied');
    }
    console.log('PASS ' + portal + ' blockchain permission; ledger healthy');
  } finally {
    await fetch(base + '/api/logout', {
      method: 'POST',
      headers: { ...headers, Origin: base, 'Content-Type': 'application/json' },
      body: '{}',
    });
  }
}
