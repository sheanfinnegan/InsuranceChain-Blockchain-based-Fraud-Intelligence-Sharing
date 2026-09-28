'use client';
import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Copy,
  Pause,
  Play,
  RefreshCw,
  Search,
} from 'lucide-react';
import type { BlockchainLog } from '@/lib/blockchain-log';
const names: Record<string, string> = {
  PROPOSED: 'Proposal dibuat',
  ENDORSED: 'Endorsement diterima',
  SUBMITTED: 'Diterima ordering service',
  COMMITTED: 'Commit valid',
  INVALID: 'Commit invalid',
  FAILED: 'Gagal sebelum submit',
  UNKNOWN: 'Hasil commit belum diketahui',
  EVALUATED: 'Query selesai',
};
export default function BlockchainExplorer() {
  const [logs, setLogs] = useState<BlockchainLog[]>([]),
    [selected, setSelected] = useState(''),
    [error, setError] = useState(''),
    [live, setLive] = useState(true),
    [filter, setFilter] = useState('WRITE'),
    [query, setQuery] = useState(''),
    [at, setAt] = useState(''),
    [copied, setCopied] = useState(false);
  async function refresh() {
    try {
      const r = await fetch('/api/blockchain', { cache: 'no-store' });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setLogs(data.logs);
      setAt(data.at);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    refresh();
    if (live) {
      const t = setInterval(refresh, 3000);
      return () => clearInterval(t);
    }
  }, [live]);
  const visible = logs.filter(
    (l) =>
      (filter === 'ALL' || l.kind === filter) &&
      [l.txId, l.method, l.mspId, l.status].join(' ').toLowerCase().includes(query.toLowerCase()),
  );
  const current = visible.find((l) => l.id === selected) || visible[0];
  const stages =
    current?.kind === 'READ'
      ? ['PROPOSED', 'EVALUATED']
      : ['PROPOSED', 'ENDORSED', 'SUBMITTED', 'COMMITTED'];
  return (
    <div className="blockchain-explorer">
      <div className="explorer-toolbar">
        <span>
          <i className={live ? 'live-dot' : 'warning-dot'} />
          {live ? 'Pembaruan otomatis · 3 detik' : 'Pembaruan dijeda'}
          {at && <small>Terakhir {new Date(at).toLocaleTimeString('id-ID')}</small>}
        </span>
        <button className="secondary compact" onClick={() => setLive(!live)}>
          {live ? <Pause size={15} /> : <Play size={15} />} {live ? 'Jeda' : 'Lanjutkan'}
        </button>
        <button className="icon-button" aria-label="Muat ulang log" onClick={refresh}>
          <RefreshCw size={17} />
        </button>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="explorer-stats">
        <div>
          <Activity size={19} />
          <strong>{logs.filter((l) => l.kind === 'WRITE').length}</strong>
          <span>Transaksi tulis tercatat</span>
        </div>
        <div>
          <CheckCircle2 size={19} />
          <strong>{logs.filter((l) => l.status === 'COMMITTED').length}</strong>
          <span>Commit valid</span>
        </div>
        <div>
          <Search size={19} />
          <strong>{logs.filter((l) => l.kind === 'READ').length}</strong>
          <span>Query / evaluate</span>
        </div>
      </div>
      <section className="panel transaction-flow">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">TRANSACTION JOURNEY</span>
            <h2>{current ? current.method : 'Menunggu aktivitas pertama'}</h2>
            <p>
              {current?.kind === 'READ'
                ? 'Query hanya membaca state; tidak melalui orderer atau membuat blok.'
                : 'Tahap diperbarui berdasarkan respons nyata Fabric Gateway.'}
            </p>
          </div>
          {current && (
            <span className="badge approved">{names[current.status] || current.status}</span>
          )}
        </div>
        <div className="flow-stages">
          {stages.map((s, i) => {
            const step = current?.steps.find((x) => x.stage === s);
            return (
              <div className={'flow-stage ' + (step ? 'completed' : '')} key={s}>
                <div className="flow-icon">
                  {step ? <CheckCircle2 size={22} /> : <Clock3 size={22} />}
                </div>
                <strong>
                  {
                    [
                      'Aplikasi → gateway',
                      'Peer endorsement',
                      'Ordering service',
                      'Ledger / world state',
                    ][current?.kind === 'READ' && i === 1 ? 3 : i]
                  }
                </strong>
                <span>{names[s]}</span>
                <small>
                  {step ? new Date(step.at).toLocaleTimeString('id-ID') : 'Belum teramati'}
                </small>
                {i < stages.length - 1 && <ArrowRight className="flow-arrow" size={20} />}
              </div>
            );
          })}
        </div>
        {current && (
          <div className="tx-metadata">
            <div>
              <span>Transaction ID</span>
              <code>{current.txId || 'Belum dibuat'}</code>
              <button
                className="icon-button"
                aria-label="Salin transaction ID"
                onClick={async () => {
                  await navigator.clipboard.writeText(current.txId);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <CheckCircle2 size={15} /> : <Copy size={15} />}
              </button>
            </div>
            <div>
              <span>Identitas organisasi</span>
              <strong>{current.mspId}</strong>
            </div>
            <div>
              <span>Channel / chaincode</span>
              <strong>insurance / insurance</strong>
            </div>
            <div>
              <span>Blok / validation code</span>
              <strong>
                {current.blockNumber ?? '—'} / {current.code ?? '—'}
              </strong>
            </div>
            {current.error && <p className="error">{current.error}</p>}
          </div>
        )}
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>Log aktivitas</h2>
          <span className="muted">Maksimal 200 aktivitas terbaru</span>
        </div>
        <div className="filters">
          <div className="search-field">
            <Search size={17} />
            <input
              aria-label="Cari log blockchain"
              placeholder="Cari transaction ID, metode, atau MSP…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            aria-label="Jenis aktivitas blockchain"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="WRITE">Transaksi tulis</option>
            <option value="READ">Query / evaluate</option>
            <option value="ALL">Semua aktivitas</option>
          </select>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Metode / transaction ID</th>
                <th>Organisasi</th>
                <th>Hasil</th>
                <th>Blok</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((l) => (
                <tr
                  key={l.id}
                  className={l.id === current?.id ? 'selected-log' : ''}
                  tabIndex={0}
                  onClick={() => setSelected(l.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setSelected(l.id);
                  }}
                >
                  <td>
                    {new Date(l.startedAt).toLocaleTimeString('id-ID')}
                    <small>{new Date(l.startedAt).toLocaleDateString('id-ID')}</small>
                  </td>
                  <td>
                    <strong>{l.method}</strong>
                    <small className="mono">{l.txId.slice(0, 24) || l.id}…</small>
                  </td>
                  <td>
                    {l.mspId}
                    <small>{l.kind === 'WRITE' ? 'Submit' : 'Evaluate'}</small>
                  </td>
                  <td>{names[l.status] || l.status}</td>
                  <td>{l.blockNumber ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visible.length && (
          <div className="empty">
            <Activity size={28} />
            <h3>Belum ada aktivitas yang sesuai</h3>
            <p>Ajukan kasus atau berikan suara. Query muncul pada filter Query / evaluate.</p>
          </div>
        )}
      </section>
      <p className="explorer-disclosure">
        Log disimpan di PostgreSQL sejak fitur ini diaktifkan, berdasarkan panggilan aplikasi ke
        Fabric Gateway. Ini bukan pemantau seluruh trafik peer. Waktu tahap adalah waktu respons
        diamati aplikasi; blok dan validation code berasal dari Fabric. Riwayat kasus lama tetap
        tersedia pada detail kasus. Statistik mencakup 200 aktivitas terakhir.
      </p>
    </div>
  );
}
