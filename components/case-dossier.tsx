'use client';
import EvidenceBoard from './evidence-board';
import { useEffect, useRef, useState } from 'react';
import {
  X,
  FolderOpen,
  FileText,
  Link2,
  MapPin,
  Clock3,
  Download,
  ShieldCheck,
  Check,
  Copy,
  ArrowUpRight,
  Vote,
  History,
} from 'lucide-react';
import type { FraudCase, User, Org, Evidence } from '@/lib/types';
import { provinceName } from '@/lib/provinces';
import { displayText } from '@/lib/presentation';
const statuses: Record<string, string> = {
  PENDING: 'Menunggu validasi',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  INVALID: 'Diinvalidasi',
};
const formatDate = (d: string) =>
  new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
export default function CaseDossier({
  caseData: c,
  user,
  orgs,
  covered,
  onClose,
  onVote,
  onInvalidate,
  onVerify,
}: {
  caseData: FraudCase;
  user: User;
  orgs: Org[];
  covered: boolean;
  onClose: () => void;
  onVote: (decision: string) => void;
  onInvalidate: () => void;
  onVerify: (id: string) => void;
}) {
  const [tab, setTab] = useState('summary'),
    [copied, setCopied] = useState('');
  const root = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const orgName = (id: string) => orgs.find((o) => o.id === id)?.name || id;
  const round = c.rounds.find((r) => r.status === 'PENDING');
  const allFiles = [
    ...new Map(
      [...c.evidence, ...c.rounds.flatMap((r) => r.evidence)].map((e) => [e.id, e]),
    ).values(),
  ];
  useEffect(() => {
    const prev = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      prev?.focus();
    };
  }, []);
  useEffect(() => {
    if (covered) return;
    root.current?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        close.current();
      }
      if (e.key === 'Tab') {
        const f = Array.from(
          root.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]),a[href],[tabindex="0"]',
          ) || [],
        ).filter((x) => x.getClientRects().length);
        if (!f.length) return;
        const first = f[0],
          last = f[f.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === root.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [covered]);
  async function copy(s: string) {
    await navigator.clipboard.writeText(s);
    setCopied(s);
    setTimeout(() => setCopied(''), 2000);
  }
  function evidence(items: Evidence[]) {
    return items.map((f, i) => (
      <article className="dossier-evidence" key={f.id}>
        <span className="evidence-number">E{String(i + 1).padStart(2, '0')}</span>
        <FileText size={25} />
        <div>
          <h3>{displayText(f.name)}</h3>
          <p>
            {f.mime} · {(f.size / 1024).toFixed(1)} KB · {formatDate(f.createdAt)}
          </p>
          <details>
            <summary>Fingerprint SHA-256</summary>
            <code>{f.hash}</code>
          </details>
        </div>
        <button
          className="icon-button"
          aria-label={'Verifikasi ' + displayText(f.name)}
          onClick={() => onVerify(f.id)}
        >
          <ShieldCheck size={18} />
        </button>
        <a
          href={'/api/file/' + f.id}
          className="icon-button"
          aria-label={'Unduh ' + displayText(f.name)}
        >
          <Download size={18} />
        </a>
      </article>
    ));
  }
  const tabs = [
    { id: 'summary', label: 'Ringkasan', icon: FolderOpen, count: undefined },
    { id: 'evidence', label: 'Bukti', icon: FileText, count: allFiles.length },
    { id: 'history', label: 'Kronologi', icon: History, count: c.events.length },
    ...(user.role !== 'CLAIM_STAFF'
      ? [{ id: 'votes', label: 'Validasi', icon: Vote, count: c.rounds.length }]
      : []),
  ];
  return (
    <div
      className="dossier-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !covered) onClose();
      }}
      aria-hidden={covered || undefined}
    >
      <section
        ref={root}
        className="case-dossier"
        role="dialog"
        aria-modal={!covered}
        aria-labelledby="dossier-title"
        tabIndex={-1}
        inert={covered}
      >
        <div className="dossier-folder-tab">
          <FolderOpen size={14} /> BERKAS INVESTIGASI <span>{c.id}</span>
        </div>
        <header className="dossier-header">
          <div>
            <div className="dossier-kicker">INSURANCECHAIN / CASE FILE</div>
            <h2 id="dossier-title">{displayText(c.title)}</h2>
            <p>
              <MapPin size={14} />
              {c.city ? c.city + ', ' : ''}
              {provinceName(c.provinceId)} <span>•</span> {orgName(c.orgId)}
            </p>
          </div>
          <div className="dossier-header-actions">
            <span className={'dossier-stamp ' + c.status.toLowerCase()}>{statuses[c.status]}</span>
            <button className="icon-button" aria-label="Tutup berkas kasus" onClick={onClose}>
              <X size={21} />
            </button>
          </div>
        </header>
        <nav className="dossier-tabs" aria-label="Bagian berkas" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              id={'dossier-tab-' + t.id}
              role="tab"
              aria-selected={tab === t.id}
              aria-controls={'dossier-section-' + t.id}
              onClick={() => setTab(t.id)}
            >
              <t.icon size={16} />
              {t.label}
              {t.count !== undefined && <span>{t.count}</span>}
            </button>
          ))}
        </nav>
        <div
          className="dossier-content"
          role="tabpanel"
          id={'dossier-section-' + tab}
          aria-labelledby={'dossier-tab-' + tab}
        >
          {tab === 'summary' && (
            <>
              <div className="dossier-facts">
                <div>
                  <span>INDIKASI FRAUD</span>
                  <strong>{c.fraudType}</strong>
                </div>
                <div>
                  <span>NILAI KLAIM</span>
                  <strong>
                    {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      maximumFractionDigits: 0,
                    }).format(c.amount)}
                  </strong>
                </div>
                <div>
                  <span>DIAJUKAN</span>
                  <strong>{formatDate(c.createdAt)}</strong>
                </div>
              </div>
              <div className="dossier-summary-grid">
                <article className="dossier-narrative">
                  <div className="section-number">01 / URAIAN TEMUAN</div>
                  <h3>Kronologi & konteks kasus</h3>
                  <p>{displayText(c.description)}</p>
                  <div className="dossier-last-update">
                    <Clock3 size={14} />
                    Diperbarui {formatDate(c.updatedAt)}
                  </div>
                </article>
                <aside className="dossier-identifiers">
                  <div className="section-number">02 / IDENTITAS TERKAIT</div>
                  <h3>{c.identifiers.length} identifier</h3>
                  {c.identifiers.map((id, i) => (
                    <div key={i}>
                      <Link2 size={15} />
                      <span>
                        <small>{displayText(id.label)}</small>
                        <code>{id.value || 'Nilai asli belum tersedia'}</code>
                      </span>
                    </div>
                  ))}
                  <p>
                    Identitas lengkap untuk pencocokan lintas perusahaan. Hash integritas tercatat
                    pada ledger.
                  </p>
                </aside>
              </div>
              <button className="evidence-jump" onClick={() => setTab('evidence')}>
                <FileText size={22} />
                <span>
                  <strong>{allFiles.length} dokumen pendukung</strong>
                  <small>Tinjau berkas dan verifikasi integritas bukti.</small>
                </span>
                <ArrowUpRight size={20} />
              </button>
            </>
          )}
          {tab === 'evidence' && (
            <>
              <div className="section-number">03 / BARANG BUKTI DIGITAL</div>
              <h3 className="dossier-section-title">Dokumen & fingerprint</h3>
              <EvidenceBoard items={allFiles} onVerify={onVerify} />
              {c.rounds
                .filter((r) => r.stage === 'CASE_INVALIDATION')
                .map((r) => (
                  <div className="dossier-invalidation" key={r.id}>
                    <h3>Permohonan invalidasi · {statuses[r.status]}</h3>
                    <p>{displayText(r.reason)}</p>
                    <small>
                      {orgName(r.proposerOrgId)} · {formatDate(r.createdAt)}
                    </small>
                  </div>
                ))}
            </>
          )}
          {tab === 'history' && (
            <>
              <div className="section-number">04 / JEJAK AUDIT</div>
              <h3 className="dossier-section-title">Riwayat yang dapat ditelusuri</h3>
              <div className="dossier-timeline">
                {c.events
                  .slice()
                  .reverse()
                  .map((e, i) => (
                    <article key={e.txId + e.action + i}>
                      <span className="timeline-dot">
                        <Check size={12} />
                      </span>
                      <div>
                        <time>{formatDate(e.at)}</time>
                        <h3>
                          {(
                            {
                              CASE_SUBMITTED: 'Kasus diajukan',
                              VOTE_RECORDED: 'Suara organisasi dicatat',
                              ROUND_FINALIZED: 'Keputusan ditetapkan',
                              INVALIDATION_REQUESTED: 'Invalidasi diajukan',
                            } as Record<string, string>
                          )[e.action] || e.action}
                        </h3>
                        <p>{displayText(e.detail)}</p>
                        <small>{orgName(e.orgId)}</small>
                        <button className="tx-link" onClick={() => copy(e.txId)}>
                          <Link2 size={12} />
                          {e.txId.slice(0, 25)}…
                          {copied === e.txId ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                    </article>
                  ))}
              </div>
            </>
          )}
          {tab === 'votes' &&
            user.role !== 'CLAIM_STAFF' &&
            c.rounds
              .slice()
              .reverse()
              .map((r) => {
                const approvals = r.votes.filter((v) => v.decision === 'APPROVE').length;
                return (
                  <article className="dossier-round" key={r.id}>
                    <div className="section-number">
                      {r.stage === 'CASE_VALIDATION' ? 'VALIDASI KASUS' : 'PERMOHONAN INVALIDASI'}
                    </div>
                    <div className="dossier-round-title">
                      <h3>{statuses[r.status]}</h3>
                      <strong>
                        {approvals}
                        <small> / {r.threshold} dukungan</small>
                      </strong>
                    </div>
                    <div className="progress-track">
                      <div
                        style={{ width: Math.min(100, (approvals / r.threshold) * 100) + '%' }}
                      />
                    </div>
                    <p>
                      Threshold ⅔ dari {r.participants.length} organisasi pada awal putaran. Pengaju
                      memberi satu dukungan.
                    </p>
                    <div className="dossier-voters">
                      {r.participants.map((id) => {
                        const vote = r.votes.find((v) => v.orgId === id);
                        return (
                          <div key={id}>
                            <span className="org-mini">{orgName(id).slice(0, 2)}</span>
                            <div>
                              <strong>{orgName(id)}</strong>
                              <p>{vote ? displayText(vote.reason) : 'Belum memberikan suara'}</p>
                            </div>
                            <span>
                              {vote?.implicit
                                ? 'Pengaju'
                                : vote?.decision === 'APPROVE'
                                  ? 'Setuju'
                                  : vote
                                    ? 'Tolak'
                                    : 'Menunggu'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
        </div>
        <footer className="dossier-footer">
          <span>
            <ShieldCheck size={15} />
            Terhubung ke ledger <code>{c.id}</code>
          </span>
          <div>
            {user.role === 'ANALYST' &&
              round &&
              round.participants.includes(user.orgId) &&
              !round.votes.some((v) => v.orgId === user.orgId) && (
                <>
                  <button className="secondary" onClick={() => onVote('REJECT')}>
                    Tolak {round.stage === 'CASE_INVALIDATION' ? 'invalidasi' : 'kasus'}
                  </button>
                  <button className="primary" onClick={() => onVote('APPROVE')}>
                    <Check size={16} />
                    Setujui {round.stage === 'CASE_INVALIDATION' ? 'invalidasi' : 'kasus'}
                  </button>
                </>
              )}
            {user.role === 'ANALYST' && c.status === 'APPROVED' && !round && (
              <button className="secondary" onClick={onInvalidate}>
                Ajukan invalidasi <ArrowUpRight size={16} />
              </button>
            )}
            <button className="secondary dossier-close" onClick={onClose}>
              Tutup berkas
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
