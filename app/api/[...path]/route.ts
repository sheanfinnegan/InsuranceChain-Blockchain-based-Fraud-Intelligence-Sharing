import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, randomUUID } from 'node:crypto';
import { readState, mutate, hash, passwordHash, verifyPassword } from '@/lib/db';
import { validateLocation, provinceName } from '@/lib/provinces';
import { normalizeIdentifiers } from '@/lib/identifiers';
import { filterExport, emptyExportFilters } from '@/lib/export-filter';
import { canReadCase } from '@/lib/role-access';
import { blockchainLogs } from '@/lib/blockchain-log';
import { fabric } from '@/lib/fabric';
import { isAllowedOrigin } from '@/lib/request-origin';
import { saveFile, readFile } from '@/lib/storage';
import type { AppState, User, Evidence, FraudCase, Role } from '@/lib/types';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const publicUser = (u: User) => {
  const { passwordHash: _, ...safe } = u;
  return safe;
};
const text = (v: unknown, min = 1, max = 5000) => {
  if (typeof v !== 'string' || v.trim().length < min || v.length > max)
    throw new Error(`Isian wajib berisi ${min}–${max} karakter.`);
  return v.trim();
};
const email = (v: unknown) => {
  const e = text(v, 5, 200).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new Error('Email tidak valid.');
  return e;
};
function authorize(s: AppState, req: NextRequest) {
  const token = req.cookies.get('ic_session')?.value;
  const session = s.sessions.find((x) => x.hash === hash(token || '') && x.expires > Date.now());
  const user = s.users.find((u) => u.id === session?.userId && u.status === 'ACTIVE');
  if (!user || s.orgs.find((o) => o.id === user.orgId)?.status !== 'ACTIVE')
    throw new Error('UNAUTHORIZED');
  return user;
}
function role(u: User, ...roles: Role[]) {
  if (!roles.includes(u.role)) throw new Error('FORBIDDEN');
}
function audit(s: AppState, u: User, action: string, detail: string) {
  s.audit.unshift({
    id: randomUUID(),
    action,
    orgId: u.orgId,
    userId: u.id,
    at: new Date().toISOString(),
    txId: '',
    detail,
  });
}
async function upload(s: AppState, files: unknown, u: string): Promise<Evidence[]> {
  if (!Array.isArray(files) || !files.length || files.length > 5)
    throw new Error('Lampirkan 1–5 berkas evidence.');
  const result = [];
  for (const f of files) {
    const v = await saveFile(f, u);
    s.files.push(v);
    result.push(v);
  }
  return result;
}
const loginAttempts = new Map<string, { count: number; until: number }>();
async function handle(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const route = (await context.params).path.join('/');
  try {
    if (req.method === 'POST') {
      const origin = req.headers.get('origin');
      if (
        !isAllowedOrigin(
          origin,
          req.headers.get('host'),
          req.nextUrl.protocol,
          process.env.APP_ALLOWED_ORIGINS,
        )
      )
        throw new Error('FORBIDDEN');
      if (Number(req.headers.get('content-length') || 0) > 14 * 1024 * 1024)
        throw new Error('Permintaan terlalu besar. Maksimal total berkas 8 MB.');
      const b = await req.json();
      if (route === 'login') {
        const e = email(b.email),
          p = text(b.password, 1, 200);
        const entry = loginAttempts.get(e);
        if (entry && entry.until > Date.now() && entry.count >= 10)
          throw new Error('Terlalu banyak percobaan. Coba lagi dalam 10 menit.');
        const token = randomBytes(32).toString('hex');
        const user = await mutate((s) => {
          const u = s.users.find((x) => x.email === e);
          if (
            !u ||
            !verifyPassword(p, u.passwordHash || '') ||
            u.status !== 'ACTIVE' ||
            s.orgs.find((o) => o.id === u.orgId)?.status !== 'ACTIVE'
          ) {
            loginAttempts.set(e, { count: (entry?.count || 0) + 1, until: Date.now() + 600000 });
            throw new Error('Email/password tidak sesuai atau akses tidak aktif.');
          }
          const portalRoles: Record<string, Role> = {
            analis: 'ANALYST',
            staff: 'CLAIM_STAFF',
            ojk: 'OJK',
          };
          if (!portalRoles[b.portal] || u.role !== portalRoles[b.portal])
            throw new Error(
              'Akun ini tidak sesuai dengan portal yang dipilih. Gunakan halaman masuk untuk peran Anda.',
            );
          s.sessions = s.sessions.filter((x) => x.expires > Date.now());
          s.sessions.push({ hash: hash(token), userId: u.id, expires: Date.now() + 8 * 3600000 });
          return publicUser(u);
        });
        loginAttempts.delete(e);
        const res = NextResponse.json({ user });
        res.cookies.set('ic_session', token, {
          httpOnly: true,
          sameSite: 'strict',
          secure: req.nextUrl.protocol === 'https:',
          maxAge: 8 * 3600,
          path: '/',
        });
        return res;
      }
      if (route === 'register') {
        const result = await mutate(async (s) => {
          const e = email(b.email);
          if (
            s.users.some((x) => x.email === e) ||
            s.registrations.some((x) => x.email === e && x.status === 'SUBMITTED')
          )
            throw new Error('Email sudah terdaftar atau sedang ditinjau.');
          const id = randomUUID();
          const letter = (await upload(s, [b.file], id))[0];
          const registration = {
            id,
            organization: text(b.organization, 3, 150),
            license: text(b.license, 3, 100),
            name: text(b.name, 3, 100),
            email: e,
            passwordHash: passwordHash(text(b.password, 12, 200)),
            reason: text(b.reason, 20),
            letter,
            status: 'SUBMITTED',
            createdAt: new Date().toISOString(),
          };
          s.registrations.push(registration);
          return { id, status: 'SUBMITTED' };
        });
        return NextResponse.json(result);
      }
      if (route === 'logout') {
        await mutate((s) => {
          s.sessions = s.sessions.filter(
            (x) => x.hash !== hash(req.cookies.get('ic_session')?.value || ''),
          );
        });
        const r = NextResponse.json({ ok: true });
        r.cookies.delete('ic_session');
        return r;
      }
      const result = await mutate(async (s) => {
        const u = authorize(s, req);
        const org = s.orgs.find((o) => o.id === u.orgId)!;
        if (route === 'cases') {
          role(u, 'ANALYST');
          const amount = Number(b.amount);
          if (!Number.isFinite(amount) || amount < 0 || amount > 1e15)
            throw new Error('Nilai klaim tidak valid.');
          const title = text(b.title, 5, 180),
            description = text(b.description, 20),
            fraudType = text(b.fraudType, 3, 100);
          const { provinceId, city } = validateLocation(b.provinceId, b.city);
          const identifiers = normalizeIdentifiers(b.identifiers);
          const evidence = await upload(s, b.files, u.id);
          const id =
            'IC-' + new Date().getFullYear() + '-' + randomBytes(3).toString('hex').toUpperCase();
          const result = await fabric(
            org.mspId,
            'CreateCase',
            [
              {
                id,
                title,
                description,
                fraudType,
                amount,
                provinceId,
                city,
                createdBy: u.id,
                identifiers: identifiers.map(({ value, ...i }) => i),
                evidence,
              },
            ],
            true,
          );
          s.caseIdentifiers ??= {};
          s.caseIdentifiers[id] = identifiers;
          return result;
        }
        if (route === 'vote') {
          role(u, 'ANALYST');
          return await fabric(
            org.mspId,
            'CastVote',
            [text(b.caseId), text(b.roundId), u.id, text(b.decision), text(b.reason, 10)],
            true,
          );
        }
        if (route === 'invalidate') {
          role(u, 'ANALYST');
          const reason = text(b.reason, 20);
          const evidence = await upload(s, b.files, u.id);
          return await fabric(
            org.mspId,
            'Invalidate',
            [text(b.caseId), u.id, reason, evidence],
            true,
          );
        }
        if (route === 'staff') {
          role(u, 'ANALYST');
          const entries = Array.isArray(b.entries) ? b.entries : [b];
          if (entries.length > 50) throw new Error('Maksimal 50 akun per batch.');
          const created: User[] = [];
          for (const entry of entries) {
            const e = email(entry.email);
            if (s.users.some((x) => x.email === e) || created.some((x) => x.email === e))
              throw new Error(`Email ${e} sudah digunakan.`);
            created.push({
              id: randomUUID(),
              orgId: u.orgId,
              name: text(entry.name, 3, 100),
              email: e,
              role: 'CLAIM_STAFF',
              status: 'ACTIVE',
              passwordHash: passwordHash(text(entry.password, 12, 200)),
            });
          }
          s.users.push(...created);
          audit(s, u, 'STAFF_CREATED', `${created.length} akun Claim Staff ditambahkan`);
          return { created: created.length };
        }
        if (route === 'staff-status') {
          role(u, 'ANALYST');
          const target = s.users.find(
            (x) => x.id === b.userId && x.orgId === u.orgId && x.role === 'CLAIM_STAFF',
          );
          if (!target) throw new Error('FORBIDDEN');
          if (!['ACTIVE', 'INACTIVE'].includes(b.status)) throw new Error('Status tidak valid.');
          target.status = b.status;
          if (b.status === 'INACTIVE')
            s.sessions = s.sessions.filter((x) => x.userId !== target.id);
          audit(s, u, 'STAFF_STATUS', `${target.name}: ${target.status}`);
          return { ok: true };
        }
        if (route === 'org-status') {
          role(u, 'OJK');
          const target = s.orgs.find((x) => x.id === b.orgId && x.id !== 'ojk');
          if (!target) throw new Error('Organisasi tidak ditemukan.');
          if (!['ACTIVE', 'SUSPENDED'].includes(b.status)) throw new Error('Status tidak valid.');
          await fabric(
            'OJKMSP',
            'SetMember',
            [target.id, target.mspId, String(b.status === 'ACTIVE')],
            true,
          );
          target.status = b.status;
          audit(s, u, 'ORGANIZATION_STATUS', `${target.name}: ${target.status}`);
          return { ok: true };
        }
        if (route === 'review-registration') {
          role(u, 'OJK');
          const reg = s.registrations.find((x) => x.id === b.requestId && x.status === 'SUBMITTED');
          if (!reg) throw new Error('Permohonan tidak ditemukan atau sudah ditinjau.');
          const note = text(b.note, 10);
          if (!['APPROVED', 'REJECTED'].includes(b.decision))
            throw new Error('Keputusan tidak valid.');
          if (b.decision === 'APPROVED') {
            const existing = s.orgs.find(
              (o) => o.license.toLowerCase() === reg.license.toLowerCase() && o.id !== 'ojk',
            );
            if (!existing)
              throw new Error(
                'Organisasi baru memerlukan provisioning MSP. Gunakan nomor izin organisasi konsorsium yang sudah tersedia untuk menambahkan analis, atau jalankan provisioning jaringan terlebih dahulu.',
              );
            if (existing.status !== 'ACTIVE') throw new Error('Organisasi sedang dinonaktifkan.');
            if (s.users.some((x) => x.email === reg.email))
              throw new Error('Email sudah digunakan.');
            s.users.push({
              id: randomUUID(),
              orgId: existing.id,
              name: reg.name,
              email: reg.email,
              role: 'ANALYST',
              status: 'ACTIVE',
              passwordHash: reg.passwordHash,
            });
          }
          reg.status = b.decision;
          reg.reviewNote = note;
          reg.reviewedAt = new Date().toISOString();
          audit(s, u, 'REGISTRATION_REVIEWED', `${reg.organization}: ${reg.status}`);
          return { ok: true };
        }
        if (route === 'settings') {
          u.name = text(b.name, 3, 100);
          if (b.newPassword) {
            if (!verifyPassword(text(b.currentPassword), u.passwordHash || ''))
              throw new Error('Password saat ini salah.');
            u.passwordHash = passwordHash(text(b.newPassword, 12, 200));
            s.sessions = s.sessions.filter(
              (x) =>
                x.userId !== u.id || x.hash === hash(req.cookies.get('ic_session')?.value || ''),
            );
          }
          audit(s, u, 'PROFILE_UPDATED', 'Profil diperbarui');
          return { ok: true };
        }
        throw new Error('Endpoint tidak ditemukan.');
      });
      return NextResponse.json(result || { ok: true });
    }
    const s = await readState();
    const u = authorize(s, req);
    const org = s.orgs.find((o) => o.id === u.orgId)!;
    if (route === 'blockchain') {
      role(u, 'OJK');
      return NextResponse.json(
        { logs: await blockchainLogs(), at: new Date().toISOString() },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }
    if (route === 'snapshot') {
      let cases: FraudCase[] = [];
      let healthy = true,
        message = 'Terhubung ke jaringan konsorsium';
      try {
        cases = await fabric(org.mspId, 'ListCases', []);
      } catch (e) {
        healthy = false;
        message = 'Jaringan blockchain belum tersedia. Coba muat ulang.';
        console.error(e);
      }
      return NextResponse.json({
        user: publicUser(u),
        users: s.users.filter((x) => u.role === 'OJK' || x.orgId === u.orgId).map(publicUser),
        orgs: s.orgs,
        registrations:
          u.role === 'OJK' ? s.registrations.map(({ passwordHash: _, ...r }) => r) : [],
        cases: cases
          .filter((c) => canReadCase(u.role, c))
          .map((c) => ({
            ...c,
            identifiers: c.identifiers
              .filter((i) => !/klaim|claim/i.test(i.label))
              .map((i) => ({
                ...i,
                value: s.caseIdentifiers?.[c.id]?.find(
                  (v) => v.hash === i.hash && v.label === i.label,
                )?.value,
              })),
          }))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        audit:
          u.role === 'CLAIM_STAFF'
            ? []
            : s.audit.filter((e) => u.role === 'OJK' || e.orgId === u.orgId),
        network: { mode: 'Hyperledger Fabric 2.5', channel: 'insurance', healthy, message },
      });
    }
    if (route === 'export') {
      role(u, 'ANALYST', 'OJK');
      const filters = { ...emptyExportFilters };
      for (const key of Object.keys(filters) as (keyof typeof filters)[])
        filters[key] = req.nextUrl.searchParams.get(key) || '';
      const cases = filterExport(
        (await fabric(org.mspId, 'ListCases', [])) as FraudCase[],
        filters,
      );
      const cell = (v: unknown) =>
        '"' +
        String(v ?? '')
          .replace(/^[\s]*[=+@-]/, "'$&")
          .replaceAll('"', '""') +
        '"';
      const rows = [
        [
          'ID',
          'Judul',
          'Organisasi',
          'Tipe',
          'Provinsi',
          'Kota',
          'Nilai klaim',
          'Status',
          'Tanggal',
          'Identitas terkait',
        ],
        ...cases.map((c) => [
          c.id,
          c.title,
          s.orgs.find((o) => o.id === c.orgId)?.name,
          c.fraudType,
          provinceName(c.provinceId),
          c.city || '',
          c.amount,
          c.status,
          c.createdAt,
          c.identifiers
            .filter((i) => !/klaim|claim/i.test(i.label))
            .map((i) => {
              const value = s.caseIdentifiers?.[c.id]?.find(
                (v) => v.hash === i.hash && v.label === i.label,
              )?.value;
              return value ? `${i.label}: ${value}` : '';
            })
            .filter(Boolean)
            .join(' | '),
        ]),
      ];
      return new NextResponse('\uFEFF' + rows.map((r) => r.map(cell).join(',')).join('\r\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="insurancechain-cases.csv"',
          'Cache-Control': 'no-store',
        },
      });
    }
    if (route.startsWith('file/')) {
      const id = route.slice(5);
      let file = s.files.find((x) => x.id === id);
      if (!file) throw new Error('Berkas tidak ditemukan.');
      let accessible = u.role === 'OJK' && s.registrations.some((r) => r.letter.id === id);
      if (!accessible) {
        const cases = (await fabric(org.mspId, 'ListCases', [])) as FraudCase[];
        accessible = cases.some(
          (c) =>
            canReadCase(u.role, c) &&
            [...c.evidence, ...c.rounds.flatMap((r) => r.evidence)].some((f) => f.id === id),
        );
      }
      if (!accessible) throw new Error('FORBIDDEN');
      const data = await readFile(id);
      const valid = hash(data) === file.hash;
      if (req.nextUrl.searchParams.has('verify'))
        return NextResponse.json({ valid, expected: file.hash, actual: hash(data) });
      if (!valid) throw new Error('Hash evidence tidak cocok. Integritas berkas gagal.');
      return new NextResponse(new Uint8Array(data), {
        headers: {
          'Content-Type': file.mime,
          'Content-Disposition': `${req.nextUrl.searchParams.has('preview') ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'no-store',
        },
      });
    }
    return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Terjadi kesalahan.';
    const status = msg === 'UNAUTHORIZED' ? 401 : msg === 'FORBIDDEN' ? 403 : 400;
    console.error(`[${route}]`, msg);
    let friendly = msg;
    if (msg.includes('transaction response')) friendly = msg.split('message=')[1] || msg;
    if (msg.length > 600)
      friendly =
        'Transaksi blockchain gagal. Data belum dianggap berhasil; muat ulang sebelum mencoba kembali.';
    return NextResponse.json({ error: friendly }, { status });
  }
}
export const GET = handle;
export const POST = handle;
