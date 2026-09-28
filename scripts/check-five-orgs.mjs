import assert from 'node:assert/strict';
const base = 'http://127.0.0.1:3000';
const cookies = [];
async function api(path, cookie, body) {
  const r = await fetch(base + '/api/' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: base,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json();
  assert.equal(r.status, 200, JSON.stringify(data));
  return { data, cookie: r.headers.get('set-cookie')?.split(';')[0] };
}
async function login(org, role = 'analis') {
  const r = await api('login', null, {
    email: `${role === 'staff' ? 'klaim' : 'analis'}@${org}.test`,
    password: 'InsuranceChain!2026',
    portal: role,
  });
  cookies.push(r.cookie);
  return r.cookie;
}
const author = await login('pradana');
const initial = (await api('snapshot', author)).data;
assert.equal(initial.network.healthy, true);
assert.equal(initial.orgs.filter((o) => o.id !== 'ojk' && o.status === 'ACTIVE').length, 5);
const title = '[SIMULASI 5 ORGANISASI] Pencocokan dokumen klaim Denpasar';
let c = initial.cases.find((c) => c.title === title);
if (!c)
  c = (
    await api('cases', author, {
      title,
      description:
        'Kasus sintetis untuk membuktikan threshold empat dari lima organisasi. Evidence simulasi disiapkan untuk penelitian.',
      fraudType: 'Pemalsuan dokumen',
      amount: 22500000,
      provinceId: '51',
      city: 'Kota Denpasar',
      identifiers: [
        { label: 'Nomor klaim', value: 'SIM-FIVE-001' },
        { label: 'Nomor rekam medis', value: 'SIM-RM-FIVE-001' },
      ],
      files: [
        {
          name: 'evidence-lima-organisasi.txt',
          mime: 'text/plain',
          data: Buffer.from(
            'Evidence sintetis untuk uji lima organisasi, bukan data pasien nyata.',
          ).toString('base64'),
        },
      ],
    })
  ).data;
assert.equal(c.rounds[0].participants.length, 5);
assert.equal(c.rounds[0].threshold, 4);
for (const org of ['nusantara', 'sentra', 'cakrawala']) {
  const cookie = await login(org);
  if (c.status === 'PENDING' && !c.rounds[0].votes.some((v) => v.orgId === org)) {
    c = (
      await api('vote', cookie, {
        caseId: c.id,
        roundId: c.rounds[0].id,
        decision: 'APPROVE',
        reason: 'Pengujian lima organisasi: dokumen sintetis telah ditinjau dan disetujui.',
      })
    ).data;
    const count = c.rounds[0].votes.length;
    assert.equal(c.status, count >= 4 ? 'APPROVED' : 'PENDING');
    console.log(`PASS ${count}/4 supports: ${c.status}`);
  }
}
assert.equal(c.status, 'APPROVED');
const staff = await login('cakrawala', 'staff');
assert.equal((await api('snapshot', staff)).data.user.role, 'CLAIM_STAFF');
const existing = initial.cases.find((c) => c.id === 'IC-2026-0101');
assert.equal(existing.rounds[0].participants.length, 3);
assert.equal(existing.rounds[0].threshold, 2);
console.log(
  'PASS five active organizations, new peers usable, old rounds retain 3-member snapshot',
);
for (const cookie of cookies) await api('logout', cookie, {});
