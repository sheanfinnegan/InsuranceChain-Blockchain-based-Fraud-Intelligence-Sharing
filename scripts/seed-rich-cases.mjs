import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const base = 'http://127.0.0.1:3000',
  cookies = {};
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
for (const org of ['nusantara', 'sentra', 'arunika', 'cakrawala', 'pradana'])
  cookies[org] = (
    await api('login', null, {
      email: `analis@${org}.test`,
      password: 'InsuranceChain!2026',
      portal: 'analis',
    })
  ).cookie;
try {
  const initial = (await api('snapshot', cookies.nusantara)).data;
  for (const fixture of JSON.parse(await fs.readFile('output/evidence-manifest.json', 'utf8'))) {
    const files = await Promise.all(
      fixture.paths.map(async (p) => ({
        name: p.split(/[\\/]/).pop(),
        data: (await fs.readFile(p)).toString('base64'),
      })),
    );
    let c = initial.cases.find((c) => c.title === fixture.title);
    if (!c)
      c = (
        await api('cases', cookies[fixture.org], {
          ...fixture,
          identifiers: [
            { label: 'Nama lengkap', value: fixture.name },
            { label: 'NIK', value: fixture.nik },
          ],
          files,
        })
      ).data;
    if (fixture.status !== 'PENDING')
      for (const [org, cookie] of Object.entries(cookies)) {
        if (c.status !== 'PENDING') break;
        if (org === fixture.org) continue;
        c = (
          await api('vote', cookie, {
            caseId: c.id,
            roundId: c.rounds[0].id,
            decision: fixture.status === 'REJECTED' ? 'REJECT' : 'APPROVE',
            reason:
              fixture.status === 'REJECTED'
                ? 'Nota retur menjelaskan duplikasi; bukti tidak mendukung temuan fraud.'
                : 'Laporan rekonsiliasi dan rincian layanan mendukung temuan yang diajukan.',
          })
        ).data;
      }
    if (fixture.status === 'INVALID' && c.status === 'APPROVED') {
      if (!c.rounds.some((r) => r.stage === 'CASE_INVALIDATION'))
        c = (
          await api('invalidate', cookies[fixture.org], {
            caseId: c.id,
            reason:
              'Rekonsiliasi lanjutan mengonfirmasi layanan tambahan yang sah. Temuan awal perlu diinvalidasi berdasarkan dokumen koreksi.',
            files: [files[0]],
          })
        ).data;
      for (const [org, cookie] of Object.entries(cookies)) {
        const round = c.rounds.find((r) => r.status === 'PENDING');
        if (!round) break;
        if (round.votes.some((v) => v.orgId === org)) continue;
        c = (
          await api('vote', cookie, {
            caseId: c.id,
            roundId: round.id,
            decision: 'APPROVE',
            reason: 'Dokumen koreksi menjelaskan perbedaan biaya; invalidasi dapat disetujui.',
          })
        ).data;
      }
    }
    assert.equal(c.status, fixture.status);
    console.log(c.id, c.status, fixture.title);
  }
  const final = (await api('snapshot', cookies.nusantara)).data;
  assert.equal(
    final.cases.filter((c) => c.identifiers.some((i) => i.value === 'Ardan Wicaksana')).length,
    2,
  );
  const f = final.cases.find((c) => c.identifiers.some((i) => i.value === 'Ardan Wicaksana'))
    .evidence[0];
  const r = await fetch(base + '/api/file/' + f.id + '?preview=1', {
    headers: { Cookie: cookies.nusantara },
  });
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-disposition'), /^inline/);
  assert.match(r.headers.get('content-type'), /pdf/);
  const exported = await fetch(base + '/api/export?status=INVALID&org=arunika', {
    headers: { Cookie: cookies.nusantara },
  });
  assert.equal(exported.status, 200);
  const csv = await exported.text();
  assert.match(csv, /Koreksi temuan/);
  assert.ok(!csv.includes('Rawat inap ditagihkan'));
  assert.equal((await fetch(base + '/api/file/' + f.id + '?preview=1')).status, 401);
  console.log('PASS full identifiers, inline PDF, filtered CSV, unauthenticated evidence denied');
} finally {
  for (const cookie of Object.values(cookies)) await api('logout', cookie, {});
}
