'use client';
import { useEffect, useState, useMemo, type FormEvent, type ReactNode } from 'react';
import {
  ShieldCheck,
  LayoutDashboard,
  Search,
  Vote as VoteIcon,
  History,
  Users,
  Building2,
  Settings,
  LogOut,
  ArrowUpRight,
  ArrowRight,
  Plus,
  ChevronRight,
  ChevronDown,
  Check,
  CheckCheck,
  Clock3,
  FileText,
  Download,
  Upload,
  X,
  AlertTriangle,
  Shield,
  Activity,
  Filter,
  Menu,
  RefreshCw,
  Loader2,
  KeyRound,
  Link2,
  CheckCircle2,
  Copy,
  ExternalLink,
  MoreHorizontal,
  Network,
  Mail,
  UserRound,
  LockKeyhole,
  Eye,
} from 'lucide-react';
import ExportForm from './export-form';
import { portalView } from '@/lib/role-access';
import ProfileMenu from './profile-menu';
import CaseDossier from './case-dossier';
import { displayText } from '@/lib/presentation';
import IndonesiaMap from './indonesia-map';
import IdentifierInput from './identifier-input';
import BlockchainExplorer from './blockchain-explorer';
import LivingNetwork from './living-network';
import { provinces, provinceName } from '@/lib/provinces';
import type { Snapshot, FraudCase, Round, Evidence } from '@/lib/types';
type UploadFile = { name: string; data: string; mime: string };
const roleName: Record<string, string> = {
  ANALYST: 'Fraud Analyst',
  CLAIM_STAFF: 'Claim Staff',
  OJK: 'Regulator OJK',
};
const statuses: Record<string, string> = {
  PENDING: 'Menunggu validasi',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  INVALID: 'Diinvalidasi',
  ACTIVE: 'Aktif',
  SUSPENDED: 'Ditangguhkan',
  INACTIVE: 'Nonaktif',
  SUBMITTED: 'Menunggu review',
};
const money = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n);
const compact = (n: number) =>
  new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
const date = (d: string) =>
  new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const time = (d: string) =>
  new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
const initials = (n: string) =>
  n
    .split(' ')
    .slice(0, 2)
    .map((x) => x[0])
    .join('');
const types = [
  'Duplicate billing',
  'Phantom billing',
  'Pemalsuan dokumen',
  'Upcoding',
  'Identity fraud',
  'Manipulasi kelayakan',
  'Unbundling',
  'Penyalahgunaan identitas',
];
async function api(path: string, body?: unknown) {
  const r = await fetch('/api/' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Permintaan gagal.');
  return data;
}
function Badge({ status }: { status: string }) {
  return (
    <span className={'badge ' + status.toLowerCase()}>
      <span />
      {statuses[status] || status}
    </span>
  );
}
function Logo({ large = false }: { large?: boolean }) {
  return (
    <div className={'official-logo ' + (large ? 'large' : '')}>
      <img src="/brand/insurancechain-original.png" alt="InsuranceChain" />
    </div>
  );
}
function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function Empty({
  title = 'Belum ada data',
  detail = 'Data akan muncul di sini setelah aktivitas pertama.',
  action,
}: {
  title?: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Search size={25} />
      </div>
      <h3>{title}</h3>
      <p>{detail}</p>
      {action}
    </div>
  );
}
function FileInput({
  files,
  onChange,
}: {
  files: UploadFile[];
  onChange: (v: UploadFile[]) => void;
}) {
  const [error, setError] = useState('');
  return (
    <div>
      <label className="upload">
        <Upload size={23} />
        <strong>Pilih berkas pendukung</strong>
        <span>PDF, JPG, PNG, TXT, CSV · total maks. 8 MB</span>
        <input
          aria-label="Berkas pendukung"
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.txt,.csv"
          onChange={async (e) => {
            const list = Array.from(e.target.files || []);
            if (list.length > 5 || list.reduce((s, f) => s + f.size, 0) > 8 * 1024 * 1024) {
              setError('Maksimal 5 berkas dengan total 8 MB.');
              return;
            }
            setError('');
            const next = await Promise.all(
              list.map(
                (f) =>
                  new Promise<UploadFile>((resolve, reject) => {
                    const r = new FileReader();
                    r.onload = () =>
                      resolve({ name: f.name, mime: f.type, data: String(r.result).split(',')[1] });
                    r.onerror = reject;
                    r.readAsDataURL(f);
                  }),
              ),
            );
            onChange(next);
          }}
        />
      </label>
      {files.map((f, i) => (
        <div className="attached" key={i}>
          <FileText size={16} />
          <span>{displayText(f.name)}</span>
          <button
            type="button"
            aria-label={'Hapus ' + f.name}
            onClick={() => onChange(files.filter((_, j) => j !== i))}
          >
            <X size={15} />
          </button>
        </div>
      ))}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  useEffect(() => {
    const prev = document.activeElement as HTMLElement;
    const el = document.querySelector<HTMLElement>('.modal');
    el?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && el) {
        const f = Array.from(
          el.querySelectorAll<HTMLElement>(
            'button:not([disabled]),input,textarea,select,[tabindex="0"]',
          ),
        );
        const first = f[0],
          last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      prev?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className={'modal ' + (wide ? 'wide' : '')}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Tutup dialog">
            <X size={21} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export default function App({ portal }: { portal: 'analis' | 'staff' | 'ojk' }) {
  const portalInfo = {
    analis: {
      role: 'ANALYST',
      name: 'Fraud Analyst',
      description: 'Ajukan temuan dan validasi bukti bersama konsorsium.',
    },
    staff: {
      role: 'CLAIM_STAFF',
      name: 'Claim Staff',
      description: 'Telusuri intelligence untuk mendukung peninjauan klaim.',
    },
    ojk: {
      role: 'OJK',
      name: 'OJK',
      description: 'Kelola keanggotaan dan awasi keputusan konsorsium.',
    },
  }[portal];
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null),
    [loading, setLoading] = useState(true),
    [page, setPage] = useState('dashboard'),
    [selected, setSelected] = useState<string | null>(null),
    [modal, setModal] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [toast, setToast] = useState(''),
    [mobile, setMobile] = useState(false);
  const [province, setProvince] = useState('ALL');
  const [query, setQuery] = useState(''),
    [status, setStatus] = useState('ALL'),
    [orgFilter, setOrgFilter] = useState('ALL'),
    [since, setSince] = useState(''),
    [tab, setTab] = useState('all');
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [showDemo, setShowDemo] = useState(false),
    [register, setRegister] = useState(false),
    [registrationId, setRegistrationId] = useState('');
  const [files, setFiles] = useState<UploadFile[]>([]),
    [decision, setDecision] = useState('APPROVE'),
    [registration, setRegistration] = useState<string | null>(null);
  async function refresh() {
    try {
      const s = await api('snapshot');
      setSnapshot(s.user.role === portalInfo.role ? s : null);
      setError('');
    } catch (e) {
      if ((e as Error).message === 'UNAUTHORIZED') setSnapshot(null);
      else setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
    const pop = () => {
      const p = new URLSearchParams(location.search);
      const requested = p.get('view') || 'dashboard',
        view = portalView(portal, requested);
      setPage(view);
      setSelected(view === requested ? p.get('case') : null);
      setProvince(p.get('province') || 'ALL');
      setStatus(p.get('status') || 'ALL');
      if (view !== requested) history.replaceState({}, '', `/${portal}?view=${view}`);
    };
    pop();
    addEventListener('popstate', pop);
    return () => removeEventListener('popstate', pop);
  }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 6000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  function go(
    p: string,
    id: string | null = null,
    region: string = 'ALL',
    statusFilter: string = 'ALL',
  ) {
    p = portalView(portal, p);
    if (p !== page) window.scrollTo({ top: 0, behavior: 'auto' });
    setProvince(region);
    setPage(p);
    setSelected(id);
    setMobile(false);
    setQuery('');
    setStatus(statusFilter);
    setTab('all');
    setError('');
    history.pushState(
      {},
      '',
      `/${portal}?view=${p}${id ? '&case=' + id : ''}${region !== 'ALL' ? '&province=' + encodeURIComponent(region) : ''}${statusFilter !== 'ALL' ? '&status=' + statusFilter : ''}`,
    );
  }
  function open(m: string) {
    setFiles([]);
    setError('');
    setModal(m);
  }
  async function act(path: string, body: unknown, message: string) {
    setBusy(true);
    setError('');
    try {
      const r = await api(path, body);
      await refresh();
      setToast(message);
      setModal('');
      setRegistration(null);
      return r;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function login(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('login', { email, password, portal });
      await refresh();
      go('dashboard');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const cases = snapshot?.cases || [];
  const user = snapshot?.user;
  const orgName = (id: string) => snapshot?.orgs.find((o) => o.id === id)?.name || id;
  const current = cases.find((c) => c.id === selected);
  const activeRound = (c: FraudCase) => c.rounds.find((r) => r.status === 'PENDING');
  const pending = cases.filter((c) => activeRound(c));
  const mine = cases.filter((c) => c.orgId === user?.orgId);
  const needsVote = cases.filter((c) => {
    const r = activeRound(c);
    return (
      r &&
      r.participants.includes(user?.orgId || '') &&
      !r.votes.some((v) => v.orgId === user?.orgId)
    );
  });
  const totals = {
    all: cases.length,
    pending: cases.filter((c) => c.status === 'PENDING').length,
    approved: cases.filter((c) => c.status === 'APPROVED').length,
    invalid: cases.filter((c) => c.status === 'INVALID').length,
    rejected: cases.filter((c) => c.status === 'REJECTED').length,
  };
  const events = useMemo(
    () =>
      cases
        .flatMap((c) => c.events.map((e) => ({ ...e, caseId: c.id, title: c.title })))
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 8),
    [snapshot],
  );
  const filtered = (list: FraudCase[]) =>
    list.filter(
      (c) =>
        (province === 'ALL' ||
          (province === 'UNKNOWN' ? !c.provinceId : c.provinceId === province)) &&
        (status === 'ALL' || c.status === status) &&
        (orgFilter === 'ALL' || c.orgId === orgFilter) &&
        (!since || c.createdAt.slice(0, 10) >= since) &&
        (!query ||
          [
            c.id,
            c.title,
            c.description,
            c.fraudType,
            orgName(c.orgId),
            ...c.identifiers.map((i) => i.value || ''),
          ]
            .join(' ')
            .toLowerCase()
            .includes(query.toLowerCase())),
    );
  const nav = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'search', label: 'Fraud intelligence', icon: Search },
    {
      id: 'voting',
      label: user?.role === 'OJK' ? 'Pantau validasi' : 'Validasi & voting',
      icon: VoteIcon,
      count: needsVote.length,
    },
    { id: 'history', label: 'Riwayat kasus', icon: History },
    ...(user?.role === 'ANALYST' ? [{ id: 'staff', label: 'Claim Staff', icon: Users }] : []),
    ...(user?.role === 'OJK'
      ? [
          { id: 'organizations', label: 'Anggota konsorsium', icon: Building2 },
          {
            id: 'registrations',
            label: 'Permohonan akses',
            icon: UserRound,
            count: snapshot?.registrations.filter((r) => r.status === 'SUBMITTED').length,
          },
        ]
      : []),
  ].filter(
    (n) =>
      (user?.role !== 'CLAIM_STAFF' || ['dashboard', 'search'].includes(n.id)) &&
      (user?.role !== 'OJK' || n.id !== 'search'),
  );
  if (user?.role === 'OJK')
    nav.push({ id: 'blockchain', label: 'Aktivitas blockchain', icon: Activity });
  function Table({ items }: { items: FraudCase[] }) {
    return items.length ? (
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Kasus / indikasi fraud</th>
              <th>Organisasi pengaju</th>
              <th>Status</th>
              <th>Dukungan</th>
              <th>Tanggal</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((c) => {
              const r = activeRound(c) || c.rounds.at(-1)!;
              const approve = r.votes.filter((v) => v.decision === 'APPROVE').length;
              return (
                <tr
                  key={c.id}
                  onClick={() => go(page === 'dashboard' ? 'search' : page, c.id, province, status)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter')
                      go(page === 'dashboard' ? 'search' : page, c.id, province, status);
                  }}
                >
                  <td>
                    <div className="case-title">
                      <span className="case-glyph">
                        <FileText size={18} />
                      </span>
                      <div>
                        <strong>{displayText(c.title)}</strong>
                        <small>
                          {c.id} <span>·</span> {c.fraudType}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="org-mini">{initials(orgName(c.orgId))}</span>
                    {orgName(c.orgId).split(' ').slice(0, 2).join(' ')}
                  </td>
                  <td>
                    <Badge status={c.status} />
                    {activeRound(c)?.stage === 'CASE_INVALIDATION' && (
                      <small className="amber">Invalidasi ditinjau</small>
                    )}
                  </td>
                  <td>
                    <div className="tally">
                      <div className="vote-pips">
                        {r.participants.map((_, i) => (
                          <i key={i} className={i < approve ? 'filled' : ''} />
                        ))}
                      </div>
                      <small>
                        {approve}/{r.threshold}
                      </small>
                    </div>
                  </td>
                  <td className="muted nowrap">{date(c.createdAt)}</td>
                  <td>
                    <ChevronRight size={17} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    ) : (
      <Empty
        title="Tidak ada kasus yang cocok"
        detail="Coba ubah pencarian atau filter, atau ajukan kasus baru."
      />
    );
  }
  function Filters() {
    return (
      <div className="filters">
        <div className="search-field">
          <Search size={18} />
          <input
            aria-label="Cari kasus"
            placeholder="Cari judul, ID kasus, atau indikasi…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button aria-label="Bersihkan pencarian" onClick={() => setQuery('')}>
              <X size={16} />
            </button>
          )}
        </div>
        <select
          aria-label="Filter status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="ALL">Semua status</option>
          {(user?.role === 'CLAIM_STAFF'
            ? ['APPROVED', 'INVALID']
            : ['PENDING', 'APPROVED', 'REJECTED', 'INVALID']
          ).map((s) => (
            <option key={s} value={s}>
              {statuses[s]}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter organisasi"
          value={orgFilter}
          onChange={(e) => setOrgFilter(e.target.value)}
        >
          <option value="ALL">Semua organisasi</option>
          {snapshot?.orgs
            .filter((o) => o.id !== 'ojk')
            .map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
        </select>
        <select
          aria-label="Filter provinsi"
          value={province}
          onChange={(e) => {
            setProvince(e.target.value);
            const url = new URL(location.href);
            e.target.value === 'ALL'
              ? url.searchParams.delete('province')
              : url.searchParams.set('province', e.target.value);
            history.replaceState({}, '', url);
          }}
        >
          <option value="ALL">Semua provinsi</option>
          <option value="UNKNOWN">Lokasi belum dilengkapi</option>
          {provinces.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          aria-label="Sejak tanggal"
          title="Sejak tanggal"
          value={since}
          onChange={(e) => setSince(e.target.value)}
        />
        {(status !== 'ALL' || orgFilter !== 'ALL' || since || province !== 'ALL') && (
          <button
            className="icon-button"
            aria-label="Reset filter"
            onClick={() => {
              setStatus('ALL');
              setOrgFilter('ALL');
              setSince('');
              setProvince('ALL');
              history.replaceState({}, '', `/${portal}?view=search`);
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>
    );
  }
  function EvidenceList({ items }: { items: Evidence[] }) {
    return (
      <div className="evidence-list">
        {items.map((f) => (
          <div className="evidence-row" key={f.id}>
            <span className="file-icon">
              <FileText size={22} />
            </span>
            <div className="grow">
              <strong>{displayText(f.name)}</strong>
              <small>
                {(f.size / 1024).toFixed(1)} KB · SHA-256 <code>{f.hash.slice(0, 12)}…</code>
              </small>
            </div>
            <button
              className="icon-button"
              title="Verifikasi integritas"
              aria-label={'Verifikasi ' + f.name}
              onClick={async () => {
                try {
                  const r = await api('file/' + f.id + '?verify=1');
                  setToast(
                    r.valid
                      ? 'Integritas terverifikasi. Hash berkas cocok dengan ledger.'
                      : 'Hash tidak cocok!',
                  );
                } catch (e) {
                  setToast((e as Error).message);
                }
              }}
            >
              <ShieldCheck size={18} />
            </button>
            <a
              className="icon-button"
              title="Unduh evidence"
              aria-label={'Unduh ' + f.name}
              href={'/api/file/' + f.id}
            >
              <Download size={18} />
            </a>
          </div>
        ))}
      </div>
    );
  }

  if (loading)
    return (
      <div className="boot">
        <Logo large />
        <Loader2 className="spin" />
        <p>Preparing Fraud Network…</p>
      </div>
    );
  if (!snapshot)
    return (
      <main className="auth">
        <section className="auth-story">
          <Logo large />
          <div className="auth-copy">
            <h1>
              Shared Fraud Intelligence.
              <br />
              <em>Stronger Together Against Fraud.</em>
            </h1>
            <LivingNetwork />
            <div className="login-assurance">
              <span>01 / One Network</span>
              <span>02 / Shared Intelligence</span>
              <span>03 / Stronger Prespectives</span>
            </div>
            <div className="auth-principles">
              <div>
                <span>01</span>
                <strong>Bagikan temuan</strong>
                <p>Informasi relevan, tersedia bagi konsorsium.</p>
              </div>
              <div>
                <span>02</span>
                <strong>Validasi bersama</strong>
                <p>Setiap organisasi membawa perspektifnya.</p>
              </div>
              <div>
                <span>03</span>
                <strong>Telusuri keputusan</strong>
                <p>Bukti dan riwayat yang dapat diverifikasi.</p>
              </div>
            </div>
          </div>
        </section>
        <section className="auth-form">
          <div className="auth-mobile pt-2">
            <Logo />
          </div>
          <div className="auth-card">
            <nav className="portal-tabs" aria-label="Pilih portal masuk">
              {[
                ['analis', 'Analis'],
                ['staff', 'Claim Staff'],
                ['ojk', 'OJK'],
              ].map(([path, label]) => (
                <a
                  key={path}
                  className={portal === path ? 'active' : ''}
                  href={'/' + path}
                  aria-current={portal === path ? 'page' : undefined}
                >
                  {label}
                </a>
              ))}
            </nav>
            {registrationId ? (
              <>
                <div className="success-seal">
                  <CheckCheck size={35} />
                </div>
                <h2>Permohonan terkirim</h2>
                <p>
                  OJK akan meninjau informasi organisasi dan surat tugas Anda. Akun dapat digunakan
                  setelah disetujui.
                </p>
                <div className="note">
                  Referensi permohonan
                  <br />
                  <code>{registrationId}</code>
                </div>
                <button
                  className="primary full"
                  onClick={() => {
                    setRegistrationId('');
                    setRegister(false);
                  }}
                >
                  Kembali ke login <ArrowRight size={17} />
                </button>
              </>
            ) : register && portal === 'analis' ? (
              <>
                <span className="eyebrow">GABUNG KONSORSIUM</span>
                <h2>Ajukan akses organisasi</h2>
                <p>Lengkapi identitas dan surat tugas untuk ditinjau OJK.</p>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const b = Object.fromEntries(new FormData(e.currentTarget));
                    setBusy(true);
                    setError('');
                    try {
                      const r = await api('register', { ...b, file: files[0] });
                      setRegistrationId(r.id);
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <div className="form-grid">
                    <Field label="Nama organisasi">
                      <input
                        name="organization"
                        required
                        minLength={3}
                        placeholder="PT Asuransi…"
                      />
                    </Field>
                    <Field label="Nomor izin">
                      <input name="license" required placeholder="Nomor izin organisasi" />
                    </Field>
                    <Field label="Nama lengkap">
                      <input name="name" required minLength={3} />
                    </Field>
                    <Field label="Email perusahaan">
                      <input name="email" type="email" required />
                    </Field>
                  </div>
                  <Field label="Password" hint="Minimal 12 karakter">
                    <input name="password" type="password" required minLength={12} />
                  </Field>
                  <Field label="Tujuan bergabung">
                    <textarea name="reason" required minLength={20} rows={2} />
                  </Field>
                  <Field label="Surat tugas">
                    <FileInput files={files} onChange={setFiles} />
                  </Field>
                  {error && (
                    <div role="alert" className="error">
                      {error}
                    </div>
                  )}
                  <button className="primary full" disabled={busy || files.length !== 1}>
                    {busy ? (
                      <Loader2 className="spin" size={18} />
                    ) : (
                      <>
                        Kirim permohonan <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
                <button
                  className="text-button"
                  onClick={() => {
                    setRegister(false);
                    setError('');
                  }}
                >
                  Sudah punya akun? Masuk
                </button>
              </>
            ) : (
              <>
                <span className="portal-icon">
                  {portal === 'ojk' ? (
                    <Building2 size={24} />
                  ) : portal === 'staff' ? (
                    <Search size={24} />
                  ) : (
                    <ShieldCheck size={24} />
                  )}
                </span>
                <span className="eyebrow">PORTAL {portalInfo.name.toUpperCase()}</span>
                <h2>Selamat datang kembali.</h2>
                <p></p>
                <form onSubmit={login}>
                  <Field label="Email perusahaan">
                    <div className="input-icon">
                      <Mail size={18} />
                      <input
                        type="email"
                        required
                        autoComplete="username"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nama@perusahaan.co.id"
                      />
                    </div>
                  </Field>
                  <Field label="Password">
                    <div className="input-icon">
                      <KeyRound size={18} />
                      <input
                        type="password"
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Masukkan password"
                      />
                    </div>
                  </Field>
                  {error && (
                    <div role="alert" className="error">
                      {error}
                    </div>
                  )}
                  <button className="primary full" disabled={busy}>
                    {busy ? (
                      <Loader2 className="spin" size={18} />
                    ) : (
                      <>
                        Masuk sebagai {portalInfo.name} <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
                <div className="divider">
                  <span>akses akun</span>
                </div>
                <button className="secondary full" onClick={() => setShowDemo(!showDemo)}>
                  <Users size={17} /> Pilih akun <ChevronDown size={16} />
                </button>
                {showDemo && (
                  <div className="demo-list">
                    {[
                      ['analis@nusantara.test', 'Aditya · Nusantara', 'Fraud Analyst', 'analis'],
                      ['analis@sentra.test', 'Nadia · Sentra', 'Fraud Analyst', 'analis'],
                      ['analis@arunika.test', 'Raka · Arunika', 'Fraud Analyst', 'analis'],
                      ['analis@cakrawala.test', 'Alya · Cakrawala', 'Fraud Analyst', 'analis'],
                      ['analis@pradana.test', 'Fajar · Pradana', 'Fraud Analyst', 'analis'],
                      ['klaim@cakrawala.test', 'Tim Klaim · Cakrawala', 'Claim Staff', 'staff'],
                      ['klaim@pradana.test', 'Tim Klaim · Pradana', 'Claim Staff', 'staff'],
                      ['klaim@nusantara.test', 'Dewi · Nusantara', 'Claim Staff', 'staff'],
                      ['regulator@ojk.test', 'Ratna · OJK', 'Regulator', 'ojk'],
                    ]
                      .filter((x) => x[3] === portal)
                      .map(([e, n, r]) => (
                        <button
                          key={e}
                          onClick={() => {
                            setEmail(e);
                            setPassword('InsuranceChain!2026');
                            setShowDemo(false);
                          }}
                        >
                          <span className="avatar small">{initials(n)}</span>
                          <span>
                            <strong>{n}</strong>
                            <small>{r}</small>
                          </span>
                          <ArrowUpRight size={16} />
                        </button>
                      ))}
                  </div>
                )}
                {portal === 'analis' ? (
                  <p className="auth-register flex items-center gap-1">
                    Organisasi belum memiliki akses?{' '}
                    <button
                      className="flex items-center gap-0.5"
                      onClick={() => {
                        setRegister(true);
                        setFiles([]);
                        setError('');
                      }}
                    >
                      Ajukan akses <ArrowUpRight size={13} />
                    </button>
                  </p>
                ) : (
                  <p className="auth-register">
                    {portal === 'staff'
                      ? 'Akun disediakan oleh Fraud Analyst organisasi Anda.'
                      : 'Akses khusus pengguna regulator yang terdaftar.'}
                  </p>
                )}
              </>
            )}
          </div>
        </section>
      </main>
    );

  return (
    <div className="workspace">
      {mobile && <div className="mobile-scrim" onClick={() => setMobile(false)} />}
      <aside className={'sidebar ' + (mobile ? 'shown' : '')}>
        <Logo />
        <div className="workspace-selector">
          <span className="org-icon">
            <Building2 size={19} />
          </span>
          <div>
            <strong>{orgName(user!.orgId)}</strong>
            <small>{user!.role === 'OJK' ? 'Regulatory oversight' : 'Anggota konsorsium'}</small>
          </div>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {nav.map((n) => (
            <button className={page === n.id ? 'active' : ''} key={n.id} onClick={() => go(n.id)}>
              <n.icon size={19} />
              <span>{n.label}</span>
              {!!n.count && <b>{n.count}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="network-summary">
            <div>
              <span className={snapshot.network.healthy ? 'live-dot' : 'warning-dot'} />
              <strong>
                {snapshot.network.healthy ? 'Connected to Network' : 'Jaringan belum tersedia'}
              </strong>
            </div>
            <p>
              {snapshot.orgs.filter((o) => o.id !== 'ojk' && o.status === 'ACTIVE').length}{' '}
              organisasi aktif
            </p>
          </div>
          <div className="sidebar-user">
            <span className="avatar">{initials(user!.name)}</span>
            <div>
              <strong>{user!.name}</strong>
              <small>{roleName[user!.role]}</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Buka navigasi"
            onClick={() => setMobile(true)}
          >
            <Menu size={21} />
          </button>
          <div className="breadcrumb">
            Workspace <ChevronRight size={13} />
            <span>{nav.find((n) => n.id === page)?.label || 'Pengaturan'}</span>
            {current && (
              <>
                <ChevronRight size={13} />
                <span>Detail kasus</span>
              </>
            )}
          </div>
          <div className="topbar-right">
            <button
              className="icon-button"
              title="Muat ulang"
              aria-label="Muat ulang"
              onClick={refresh}
            >
              <RefreshCw size={17} />
            </button>
            <span className="top-divider" />
            <ProfileMenu
              name={user!.name}
              role={roleName[user!.role]}
              onSettings={() => go('settings')}
              onLogout={async () => {
                await api('logout', {});
                setSnapshot(null);
                setPassword('');
                setEmail('');
                go('dashboard');
              }}
            />
          </div>
        </header>
        <main className="content">
          {!snapshot.network.healthy && (
            <div className="notice danger">
              <AlertTriangle size={18} />
              {snapshot.network.message}
              <button onClick={refresh}>Coba lagi</button>
            </div>
          )}
          {error && !modal && (
            <div className="notice danger">
              <AlertTriangle size={18} />
              {error}
              <button onClick={() => setError('')}>
                <X size={16} />
              </button>
            </div>
          )}
          {current && (
            <CaseDossier
              caseData={current}
              user={user!}
              orgs={snapshot.orgs}
              covered={!!modal}
              onClose={() => go(page, null, province, status)}
              onVote={(d) => {
                setDecision(d);
                open('vote');
              }}
              onInvalidate={() => open('invalidate')}
              onVerify={async (id) => {
                try {
                  const r = await api('file/' + id + '?verify=1');
                  setToast(
                    r.valid
                      ? 'Integritas terverifikasi. Hash berkas cocok dengan ledger.'
                      : 'Hash tidak cocok!',
                  );
                } catch (e) {
                  setToast((e as Error).message);
                }
              }}
            />
          )}
          <>
            <div className="page-heading">
              <div>
                <div className="eyebrow">
                  {page === 'dashboard'
                    ? 'CONSORTIUM WORKSPACE'
                    : page === 'search'
                      ? 'SHARED INTELLIGENCE'
                      : page === 'voting'
                        ? 'COLLECTIVE VALIDATION'
                        : page === 'history'
                          ? 'DECISION PROVENANCE'
                          : page === 'settings'
                            ? 'PREFERENSI AKUN'
                            : 'ACCESS & GOVERNANCE'}
                </div>
                <h1>
                  {
                    (
                      {
                        dashboard: `Selamat datang, ${user!.name.split(' ')[0]}.`,
                        search: 'Fraud intelligence',
                        voting: user!.role === 'OJK' ? 'Pantau validasi' : 'Validasi & voting',
                        history: 'Riwayat kasus',
                        staff: 'Claim Staff',
                        organizations: 'Anggota konsorsium',
                        registrations: 'Permohonan akses',
                        blockchain: 'Aktivitas blockchain',
                        settings: 'Pengaturan akun',
                      } as Record<string, string>
                    )[page]
                  }
                </h1>
              </div>
              <div className="heading-actions">
                {['dashboard', 'search', 'history'].includes(page) &&
                  user!.role !== 'CLAIM_STAFF' && (
                    <button className="secondary" onClick={() => open('export')}>
                      <Download size={16} /> Ekspor
                    </button>
                  )}
                {['dashboard', 'search', 'history'].includes(page) && user!.role === 'ANALYST' && (
                  <button className="primary" onClick={() => open('case')}>
                    <Plus size={18} /> Ajukan kasus
                  </button>
                )}
                {page === 'staff' && (
                  <>
                    <button className="secondary" onClick={() => open('bulk')}>
                      <Upload size={16} /> Import CSV
                    </button>
                    <button className="primary" onClick={() => open('staff')}>
                      <Plus size={17} /> Tambah anggota
                    </button>
                  </>
                )}
              </div>
            </div>
            {page === 'blockchain' && user!.role === 'OJK' && <BlockchainExplorer />}
            {page === 'dashboard' && (
              <>
                <div className={'stat-grid ' + (user!.role === 'CLAIM_STAFF' ? 'staff-stats' : '')}>
                  {[
                    {
                      label: 'Total fraud case',
                      value: totals.all,
                      detail: 'Informasi lintas organisasi',
                      icon: FileText,
                      cls: '',
                    },
                    {
                      label: 'Menunggu validasi',
                      value: totals.pending,
                      detail:
                        user!.role === 'ANALYST'
                          ? `${needsVote.length} dapat Anda tinjau`
                          : 'Dalam proses validasi konsorsium',
                      icon: Clock3,
                      cls: 'amber',
                    },
                    {
                      label: 'Kasus disetujui',
                      value: totals.approved,
                      detail: 'Dukungan konsorsium tercapai',
                      icon: ShieldCheck,
                      cls: 'green',
                    },
                    {
                      label: 'Nilai klaim terkait',
                      value:
                        'Rp ' +
                        compact(
                          cases
                            .filter((c) => c.status === 'APPROVED')
                            .reduce((n, c) => n + c.amount, 0),
                        ),
                      detail: 'Total nilai klaim kasus valid (APPROVED)',
                      icon: Activity,
                      cls: 'blue',
                    },
                  ]
                    .filter(
                      (s) =>
                        user!.role !== 'CLAIM_STAFF' ||
                        ['Total fraud case', 'Nilai klaim terkait'].includes(s.label),
                    )
                    .map((s, i) => (
                      <section
                        className={'stat-card ' + (i === 2 ? 'highlight' : '')}
                        key={s.label}
                      >
                        <div>
                          <span>{s.label}</span>
                          <s.icon className={s.cls} size={19} />
                        </div>
                        <strong>{s.value}</strong>
                        <small>{s.detail}</small>
                      </section>
                    ))}
                </div>
                {user!.role !== 'CLAIM_STAFF' && (
                  <div className="attention-strip">
                    <div className="attention-icon">
                      <VoteIcon size={22} />
                    </div>
                    <div>
                      <strong>
                        {user!.role === 'ANALYST'
                          ? `${needsVote.length} kasus membutuhkan penilaian Anda`
                          : `${pending.length} putaran validasi sedang berlangsung`}
                      </strong>
                      <p>
                        {user!.role === 'ANALYST'
                          ? 'Kontribusi Anda melengkapi perspektif konsorsium.'
                          : 'Ikuti proses pengambilan keputusan lintas organisasi.'}
                      </p>
                    </div>
                    <button onClick={() => go('voting')}>
                      Tinjau kasus <ArrowRight size={17} />
                    </button>
                  </div>
                )}
                <IndonesiaMap
                  finalOnly={user!.role === 'CLAIM_STAFF'}
                  cases={cases}
                  healthy={snapshot.network.healthy}
                  onSelect={(id, scope) => go('search', null, id, scope)}
                />
                <div
                  className={
                    'overview-grid ' + (user!.role === 'CLAIM_STAFF' ? 'staff-overview' : '')
                  }
                >
                  <section className="panel overview-main">
                    <div className="panel-heading">
                      <div>
                        <h2>Pola indikasi fraud</h2>
                        <p>Sebaran indikasi fraud yang dibagikan</p>
                      </div>
                      <span className="subtle-chip">
                        Semua kasus <ChevronDown size={13} />
                      </span>
                    </div>
                    <div className="chart-bars">
                      {types.map((type, i) => {
                        const n = cases.filter((c) => c.fraudType === type).length;
                        const max = Math.max(
                          1,
                          ...types.map((t) => cases.filter((c) => c.fraudType === t).length),
                        );
                        return (
                          <div className="bar-row" key={type}>
                            <span>{type}</span>
                            <div className="bar-track">
                              <div
                                style={{
                                  width: Math.max(n ? 5 : 0, (n / max) * 100) + '%',
                                  opacity: 1 - i * 0.09,
                                }}
                              />
                            </div>
                            <strong>{String(n).padStart(2, '0')}</strong>
                          </div>
                        );
                      })}
                    </div>
                    <div className="chart-bottom">
                      <span>
                        <span className="live-dot" /> Data dari shared ledger
                      </span>
                      <span>
                        {snapshot.orgs.filter((o) => o.id !== 'ojk').length} organisasi
                        berpartisipasi
                      </span>
                    </div>
                  </section>
                  {user!.role !== 'CLAIM_STAFF' && (
                    <section className="panel status-panel">
                      <div className="panel-heading">
                        <h2>Status konsorsium</h2>
                        <Network size={18} />
                      </div>
                      <div
                        className="donut"
                        style={{
                          background: `conic-gradient(#a78bfa 0 ${(totals.approved / Math.max(1, totals.all)) * 100}%, #eee9f7 ${(totals.approved / Math.max(1, totals.all)) * 100}% ${((totals.approved + totals.pending) / Math.max(1, totals.all)) * 100}%, #62596f ${((totals.approved + totals.pending) / Math.max(1, totals.all)) * 100}% 100%)`,
                        }}
                      >
                        <div>
                          <strong>{totals.all}</strong>
                          <span>Total kasus</span>
                        </div>
                      </div>
                      <div className="legend">
                        <div>
                          <span>
                            <i className="green-dot" />
                            Disetujui
                          </span>
                          <strong>{totals.approved}</strong>
                        </div>
                        <div>
                          <span>
                            <i className="amber-dot" />
                            Menunggu
                          </span>
                          <strong>{totals.pending}</strong>
                        </div>
                        <div>
                          <span>
                            <i className="red-dot" />
                            Ditolak / invalid
                          </span>
                          <strong>{totals.rejected + totals.invalid}</strong>
                        </div>
                      </div>
                    </section>
                  )}
                </div>
                <section className="panel">
                  <div className="panel-heading">
                    <div className="inline">
                      <h2>Kasus terbaru</h2>
                      <span className="count-pill">{cases.length}</span>
                    </div>
                    <button className="text-button" onClick={() => go('search')}>
                      Lihat semua <ArrowUpRight size={16} />
                    </button>
                  </div>
                  <Table items={cases.slice(0, 5)} />
                </section>
                {user!.role === 'OJK' && (
                  <section className="panel">
                    <div className="panel-heading">
                      <h2>Aktivitas jaringan</h2>
                      <span className="muted">Tercatat pada ledger</span>
                    </div>
                    <div className="activity-feed">
                      {events.length ? (
                        events.slice(0, 4).map((e, i) => (
                          <button key={e.id + i} onClick={() => go('history', e.caseId)}>
                            <span className="activity-icon">
                              <Link2 size={17} />
                            </span>
                            <div>
                              <strong>{displayText(e.title)}</strong>
                              <small>
                                {orgName(e.orgId)} · {displayText(e.detail).slice(0, 90)}
                              </small>
                            </div>
                            <span>{time(e.at)}</span>
                            <ArrowUpRight size={15} />
                          </button>
                        ))
                      ) : (
                        <Empty
                          title="Belum ada aktivitas"
                          detail="Pengajuan dan keputusan pertama akan tercatat di sini."
                        />
                      )}
                    </div>
                  </section>
                )}
              </>
            )}
            {['search', 'voting', 'history'].includes(page) && (
              <>
                <div className="tabs">
                  {(page === 'voting'
                    ? [
                        ['all', 'Semua putaran', pending.length],
                        ['action', 'Perlu penilaian saya', needsVote.length],
                        [
                          'invalidation',
                          'Invalidasi',
                          cases.filter((c) => activeRound(c)?.stage === 'CASE_INVALIDATION').length,
                        ],
                      ]
                    : page === 'history'
                      ? [
                          ['all', 'Semua kasus', cases.length],
                          ['mine', 'Diajukan organisasi saya', mine.length],
                          [
                            'final',
                            'Keputusan final',
                            cases.filter((c) => c.status !== 'PENDING').length,
                          ],
                        ]
                      : user!.role === 'CLAIM_STAFF'
                        ? [['all', 'Fraud case', cases.length]]
                        : [
                            ['all', 'Semua intelligence', cases.length],
                            ['approved', 'Disetujui', totals.approved],
                            ['pending', 'Menunggu', totals.pending],
                          ]
                  )
                    .filter(
                      ([id]) => user!.role !== 'OJK' || !['action', 'mine'].includes(String(id)),
                    )
                    .map(([id, label, count]) => (
                      <button
                        className={tab === id ? 'active' : ''}
                        key={id}
                        onClick={() => setTab(String(id))}
                      >
                        {label}
                        <span>{count}</span>
                      </button>
                    ))}
                </div>
                <section className="panel">
                  {Filters()}
                  <Table
                    items={filtered(
                      page === 'voting'
                        ? tab === 'action'
                          ? needsVote
                          : tab === 'invalidation'
                            ? cases.filter((c) => activeRound(c)?.stage === 'CASE_INVALIDATION')
                            : pending
                        : page === 'history'
                          ? tab === 'mine'
                            ? mine
                            : tab === 'final'
                              ? cases.filter((c) => c.status !== 'PENDING')
                              : cases
                          : tab === 'approved'
                            ? cases.filter((c) => c.status === 'APPROVED')
                            : tab === 'pending'
                              ? cases.filter((c) => c.status === 'PENDING')
                              : cases,
                    )}
                  />
                  <div className="table-foot">
                    <span>Akses sesuai kewenangan organisasi</span>
                    <span>{cases.length} kasus dalam konsorsium</span>
                  </div>
                </section>
              </>
            )}
            {page === 'staff' && (
              <section className="panel">
                <div className="panel-heading">
                  <h2>Anggota tim klaim</h2>
                  <span className="muted">{orgName(user!.orgId)}</span>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Nama anggota</th>
                        <th>Email</th>
                        <th>Peran</th>
                        <th>Status</th>
                        <th>Akses</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.users
                        .filter((u) => u.role === 'CLAIM_STAFF')
                        .map((u) => (
                          <tr key={u.id}>
                            <td>
                              <div className="inline">
                                <span className="avatar small">{initials(u.name)}</span>
                                <strong>{u.name}</strong>
                              </div>
                            </td>
                            <td>{u.email}</td>
                            <td>Claim Staff</td>
                            <td>
                              <Badge status={u.status} />
                            </td>
                            <td>
                              <button
                                disabled={busy}
                                className="secondary compact"
                                onClick={() =>
                                  act(
                                    'staff-status',
                                    {
                                      userId: u.id,
                                      status: u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                                    },
                                    'Akses anggota diperbarui.',
                                  )
                                }
                              >
                                {u.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'}
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                {!snapshot.users.some((u) => u.role === 'CLAIM_STAFF') && (
                  <Empty
                    title="Tim klaim belum ditambahkan"
                    detail="Tambahkan anggota agar tim dapat mencari dan meninjau fraud intelligence."
                  />
                )}
              </section>
            )}
            {page === 'organizations' && (
              <div className="org-grid">
                {snapshot.orgs
                  .filter((o) => o.id !== 'ojk')
                  .map((o) => (
                    <section className="panel org-card" key={o.id}>
                      <div className="org-card-top">
                        <span className="org-large">
                          <Building2 size={29} />
                        </span>
                        <Badge status={o.status} />
                      </div>
                      <h2>{o.name}</h2>
                      <p>{o.license}</p>
                      <div className="org-stats">
                        <div>
                          <strong>{cases.filter((c) => c.orgId === o.id).length}</strong>
                          <span>Kasus diajukan</span>
                        </div>
                        <div>
                          <strong>{snapshot.users.filter((u) => u.orgId === o.id).length}</strong>
                          <span>Pengguna</span>
                        </div>
                      </div>
                      <div className="org-card-bottom">
                        <small>Bergabung {date(o.joinedAt)}</small>
                        <button
                          className="secondary compact"
                          disabled={busy}
                          onClick={() =>
                            act(
                              'org-status',
                              {
                                orgId: o.id,
                                status: o.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                              },
                              'Status organisasi diperbarui di jaringan.',
                            )
                          }
                        >
                          {o.status === 'ACTIVE' ? 'Tangguhkan' : 'Aktifkan'}
                        </button>
                      </div>
                    </section>
                  ))}
              </div>
            )}
            {page === 'registrations' && (
              <section className="panel">
                <div className="panel-heading">
                  <h2>Daftar permohonan</h2>
                  <span className="count-pill">{snapshot.registrations.length}</span>
                </div>
                {snapshot.registrations.length ? (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Organisasi</th>
                          <th>Pemohon</th>
                          <th>Tanggal</th>
                          <th>Status</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {snapshot.registrations
                          .slice()
                          .reverse()
                          .map((r) => (
                            <tr key={r.id}>
                              <td>
                                <strong>{r.organization}</strong>
                                <small>{r.license}</small>
                              </td>
                              <td>
                                {r.name}
                                <small>{r.email}</small>
                              </td>
                              <td>{date(r.createdAt)}</td>
                              <td>
                                <Badge status={r.status} />
                              </td>
                              <td>
                                <button
                                  className="secondary compact"
                                  onClick={() => {
                                    setRegistration(r.id);
                                    open('registration');
                                  }}
                                >
                                  Tinjau <ArrowUpRight size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty
                    title="Semua permohonan sudah tertangani"
                    detail="Permohonan registrasi organisasi baru akan muncul di sini."
                  />
                )}
              </section>
            )}
            {page === 'settings' && (
              <div className="settings-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <h2>Profil & keamanan</h2>
                  </div>
                  <form
                    className="padded-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      act(
                        'settings',
                        Object.fromEntries(new FormData(e.currentTarget)),
                        'Profil berhasil disimpan.',
                      );
                    }}
                  >
                    <div className="profile-summary">
                      <span className="avatar xl">{initials(user!.name)}</span>
                      <div>
                        <h2>{user!.name}</h2>
                        <p>
                          {roleName[user!.role]} · {orgName(user!.orgId)}
                        </p>
                      </div>
                    </div>
                    <Field label="Nama lengkap">
                      <input name="name" defaultValue={user!.name} minLength={3} required />
                    </Field>
                    <Field label="Email">
                      <input value={user!.email} disabled />
                    </Field>
                    <div className="form-section-title">
                      <KeyRound size={17} />
                      <h3>Ubah password</h3>
                    </div>
                    <Field label="Password saat ini">
                      <input
                        type="password"
                        name="currentPassword"
                        autoComplete="current-password"
                      />
                    </Field>
                    <Field
                      label="Password baru"
                      hint="Kosongkan jika tidak ingin mengubah password. Minimal 12 karakter."
                    >
                      <input
                        type="password"
                        name="newPassword"
                        minLength={12}
                        autoComplete="new-password"
                      />
                    </Field>
                    <button className="primary" disabled={busy}>
                      {busy ? <Loader2 className="spin" size={17} /> : <Check size={17} />}Simpan
                      perubahan
                    </button>
                  </form>
                </section>
                <section className="panel settings-info">
                  <ShieldCheck size={28} />
                  <h2>Akses terverifikasi</h2>
                  <p>Hak akses Anda mengikuti peran dan status organisasi dalam konsorsium.</p>
                  <div>
                    <span>Peran</span>
                    <strong>{roleName[user!.role]}</strong>
                  </div>
                  <div>
                    <span>Organisasi</span>
                    <strong>{orgName(user!.orgId)}</strong>
                  </div>
                  <div>
                    <span>Lingkungan</span>
                    <strong>Jaringan privat</strong>
                  </div>
                  <div>
                    <span>Ledger</span>
                    <strong>Hyperledger Fabric 2.5</strong>
                  </div>
                </section>
              </div>
            )}
          </>
          <footer className="page-footer">
            <span>insurancechain</span>
            <span>
              <ShieldCheck size={13} /> Setiap keputusan punya jejak.
            </span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          <span>{toast}</span>
          <button aria-label="Tutup notifikasi" onClick={() => setToast('')}>
            <X size={16} />
          </button>
        </div>
      )}
      {modal && (
        <Modal
          title={
            (
              {
                export: 'Ekspor data fraud',
                case: 'Ajukan fraud case',
                vote: decision === 'APPROVE' ? 'Konfirmasi persetujuan' : 'Konfirmasi penolakan',
                invalidate: 'Ajukan invalidasi kasus',
                staff: 'Tambah Claim Staff',
                bulk: 'Import akun Claim Staff',
                registration: 'Tinjau permohonan akses',
              } as Record<string, string>
            )[modal]
          }
          subtitle={
            modal === 'case'
              ? 'Bagikan temuan beserta bukti untuk divalidasi konsorsium.'
              : modal === 'invalidate'
                ? 'Jelaskan bukti baru yang mendasari pembatalan validitas kasus.'
                : undefined
          }
          onClose={() => {
            if (!busy) {
              setModal('');
              setError('');
            }
          }}
          wide={modal === 'case' || modal === 'registration'}
        >
          {modal === 'export' && <ExportForm snapshot={snapshot} />}
          {modal === 'case' && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const b = Object.fromEntries(new FormData(e.currentTarget));
                const r = await act(
                  'cases',
                  { ...b, identifiers: JSON.parse(String(b.identifiersJSON)), files },
                  'Kasus tercatat pada ledger. Menunggu validasi organisasi lain.',
                );
                if (r) go('history', r.id);
              }}
            >
              <div className="modal-body">
                <Field label="Judul kasus">
                  <input
                    name="title"
                    minLength={5}
                    maxLength={180}
                    required
                    placeholder="Contoh: Tagihan ganda layanan rawat inap"
                  />
                </Field>
                <div className="form-grid">
                  <Field label="Jenis indikasi">
                    <select name="fraudType">
                      {types.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Nilai klaim (Rp)">
                    <input
                      name="amount"
                      type="number"
                      min="0"
                      max="1000000000000000"
                      step="1"
                      required
                      placeholder="0"
                    />
                  </Field>
                </div>
                <Field
                  label="Ringkasan & hasil temuan"
                  hint="Minimal 20 karakter. Jelaskan temuan secara lengkap."
                >
                  <textarea
                    name="description"
                    rows={4}
                    minLength={20}
                    required
                    placeholder="Jelaskan kronologi, pola yang ditemukan, dan konteks evidence…"
                  />
                </Field>
                <div className="form-grid">
                  <Field
                    label="Provinsi asal kejadian"
                    hint="Lokasi terjadinya indikasi fraud, bukan kantor pengaju."
                  >
                    <select name="provinceId" required defaultValue="">
                      <option value="" disabled>
                        Pilih provinsi
                      </option>
                      {provinces.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Kabupaten / kota">
                    <input
                      name="city"
                      required
                      minLength={3}
                      maxLength={100}
                      placeholder="Contoh: Kota Bandung"
                    />
                  </Field>
                </div>
                <IdentifierInput />
                <Field label="Evidence pendukung">
                  <FileInput files={files} onChange={setFiles} />
                </Field>
                <div className="note">
                  <ShieldCheck size={17} />
                  <span>
                    Pengajuan Anda dihitung sebagai satu dukungan. Organisasi lain akan meninjau
                    bukti sebelum memberikan keputusan.
                  </span>
                </div>
              </div>
              <div className="modal-foot">
                {error && <p className="error">{error}</p>}
                <button
                  className="secondary"
                  type="button"
                  disabled={busy}
                  onClick={() => setModal('')}
                >
                  Batal
                </button>
                <button className="primary" disabled={busy || !files.length}>
                  {busy ? (
                    <>
                      <Loader2 className="spin" size={17} />
                      Mencatat ke ledger…
                    </>
                  ) : (
                    <>
                      Kirim kasus <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
          {modal === 'vote' && current && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const b = Object.fromEntries(new FormData(e.currentTarget));
                act(
                  'vote',
                  {
                    caseId: current.id,
                    roundId: activeRound(current)!.id,
                    decision,
                    reason: b.reason,
                  },
                  'Keputusan organisasi berhasil tercatat pada ledger.',
                );
              }}
            >
              <div className="modal-body">
                <div className="note">
                  <VoteIcon size={20} />
                  <span>
                    Anda mewakili <strong>{orgName(user!.orgId)}</strong>. Keputusan ini tidak dapat
                    diubah setelah tercatat.
                  </span>
                </div>
                <Field
                  label="Alasan keputusan"
                  hint="Minimal 10 karakter. Jelaskan dasar penilaian Anda."
                >
                  <textarea
                    name="reason"
                    rows={4}
                    minLength={10}
                    required
                    placeholder="Berdasarkan peninjauan evidence…"
                  />
                </Field>
              </div>
              <div className="modal-foot">
                {error && <p className="error">{error}</p>}
                <button
                  className="secondary"
                  type="button"
                  disabled={busy}
                  onClick={() => setModal('')}
                >
                  Kembali
                </button>
                <button
                  className={decision === 'REJECT' ? 'danger-button' : 'primary'}
                  disabled={busy}
                >
                  {busy ? <Loader2 className="spin" size={17} /> : <Check size={17} />}Catat{' '}
                  {decision === 'APPROVE' ? 'persetujuan' : 'penolakan'}
                </button>
              </div>
            </form>
          )}
          {modal === 'invalidate' && current && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const b = Object.fromEntries(new FormData(e.currentTarget));
                act(
                  'invalidate',
                  { caseId: current.id, reason: b.reason, files },
                  'Permohonan invalidasi tercatat. Status kasus menunggu hasil peninjauan.',
                );
              }}
            >
              <div className="modal-body">
                <div className="note amber">
                  <AlertTriangle size={20} />
                  <span>
                    Kasus tetap APPROVED selama permohonan ditinjau. Riwayat keputusan sebelumnya
                    tetap tersimpan.
                  </span>
                </div>
                <Field label="Alasan invalidasi">
                  <textarea name="reason" minLength={20} required rows={4} />
                </Field>
                <Field label="Evidence baru">
                  <FileInput files={files} onChange={setFiles} />
                </Field>
              </div>
              <div className="modal-foot">
                {error && <p className="error">{error}</p>}
                <button className="primary" disabled={busy || !files.length}>
                  {busy ? <Loader2 className="spin" size={17} /> : <ArrowRight size={17} />}Ajukan
                  invalidasi
                </button>
              </div>
            </form>
          )}
          {modal === 'staff' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                act(
                  'staff',
                  Object.fromEntries(new FormData(e.currentTarget)),
                  'Akun Claim Staff berhasil ditambahkan.',
                );
              }}
            >
              <div className="modal-body">
                <Field label="Nama lengkap">
                  <input name="name" minLength={3} required />
                </Field>
                <Field label="Email">
                  <input type="email" name="email" required />
                </Field>
                <Field
                  label="Password awal"
                  hint="Minimal 12 karakter. Sampaikan kepada anggota melalui jalur aman."
                >
                  <input name="password" type="password" minLength={12} required />
                </Field>
              </div>
              <div className="modal-foot">
                {error && <p className="error">{error}</p>}
                <button className="primary" disabled={busy}>
                  Buat akun <Plus size={17} />
                </button>
              </div>
            </form>
          )}
          {modal === 'bulk' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const rows = String(new FormData(e.currentTarget).get('csv'))
                  .trim()
                  .split(/\r?\n/)
                  .filter(Boolean);
                const entries = rows
                  .filter((r, i) => !(i === 0 && r.toLowerCase().startsWith('name,')))
                  .map((r) => {
                    const [name, email, password] = r.split(',').map((x) => x.trim());
                    return { name, email, password };
                  });
                act('staff', { entries }, 'Akun Claim Staff berhasil diimpor.');
              }}
            >
              <div className="modal-body">
                <div className="note">
                  Tempel CSV sederhana dengan kolom name,email,password. Maksimal 50 anggota; tidak
                  mendukung koma di dalam nilai.
                </div>
                <Field label="Data CSV">
                  <textarea
                    name="csv"
                    className="code-input"
                    required
                    rows={7}
                    placeholder={
                      'name,email,password\nBudi Santoso,budi@perusahaan.test,PasswordAwal!2026'
                    }
                  />
                </Field>
              </div>
              <div className="modal-foot">
                {error && <p className="error">{error}</p>}
                <button className="primary" disabled={busy}>
                  <Upload size={17} />
                  Import anggota
                </button>
              </div>
            </form>
          )}
          {modal === 'registration' &&
            (() => {
              const r = snapshot.registrations.find((r) => r.id === registration);
              return r ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const b = Object.fromEntries(new FormData(e.currentTarget));
                    act(
                      'review-registration',
                      { requestId: r.id, decision: b.decision, note: b.note },
                      'Keputusan registrasi disimpan.',
                    );
                  }}
                >
                  <div className="modal-body">
                    <div className="detail-facts">
                      <div>
                        <span>Organisasi</span>
                        <strong>{r.organization}</strong>
                      </div>
                      <div>
                        <span>Nomor izin</span>
                        <strong>{r.license}</strong>
                      </div>
                      <div>
                        <span>Pemohon</span>
                        <strong>{r.name}</strong>
                      </div>
                      <div>
                        <span>Email</span>
                        <strong>{r.email}</strong>
                      </div>
                    </div>
                    <p className="panel-copy">{r.reason}</p>
                    <EvidenceList items={[r.letter]} />
                    {r.status === 'SUBMITTED' ? (
                      <>
                        <Field label="Keputusan">
                          <select name="decision">
                            <option value="APPROVED">Setujui akses</option>
                            <option value="REJECTED">Tolak permohonan</option>
                          </select>
                        </Field>
                        <Field label="Catatan review">
                          <textarea name="note" minLength={10} required rows={3} />
                        </Field>
                      </>
                    ) : (
                      <div className="note">
                        <Badge status={r.status} />
                        <span>{r.reviewNote}</span>
                      </div>
                    )}
                  </div>
                  {r.status === 'SUBMITTED' && (
                    <div className="modal-foot">
                      {error && <p className="error">{error}</p>}
                      <button className="primary" disabled={busy}>
                        {busy ? <Loader2 className="spin" size={17} /> : <Check size={17} />}Simpan
                        keputusan
                      </button>
                    </div>
                  )}
                </form>
              ) : null;
            })()}
        </Modal>
      )}
    </div>
  );
}
