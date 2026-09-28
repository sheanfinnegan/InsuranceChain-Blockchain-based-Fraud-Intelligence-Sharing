'use client';
import { useState } from 'react';
import type { Snapshot } from '@/lib/types';
import { filterExport, emptyExportFilters } from '@/lib/export-filter';
import { provinces } from '@/lib/provinces';
export default function ExportForm({ snapshot }: { snapshot: Snapshot }) {
  const [filters, setFilters] = useState(emptyExportFilters),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  let count = 0,
    invalid = '';
  try {
    count = filterExport(snapshot.cases, filters).length;
  } catch (e) {
    invalid = (e as Error).message;
  }
  const field = (key: keyof typeof filters, value: string) =>
    setFilters({ ...filters, [key]: value });
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
          const response = await fetch('/api/export?' + new URLSearchParams(filters));
          if (!response.ok) throw new Error((await response.json()).error);
          const url = URL.createObjectURL(await response.blob());
          const a = document.createElement('a');
          a.href = url;
          a.download = 'insurancechain-cases.csv';
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="modal-body">
        <p>
          Pilih cakupan berkas yang akan diekspor. Tanggal mengacu pada pengajuan kasus dalam WIB.
        </p>
        <div className="form-grid">
          <label>
            Dari tanggal
            <input
              type="date"
              value={filters.from}
              onChange={(e) => field('from', e.target.value)}
            />
          </label>
          <label>
            Sampai tanggal
            <input type="date" value={filters.to} onChange={(e) => field('to', e.target.value)} />
          </label>
          {(['org', 'status', 'province', 'type'] as const).map((key) => (
            <label key={key}>
              {
                { org: 'Perusahaan', status: 'Status', province: 'Provinsi', type: 'Jenis fraud' }[
                  key
                ]
              }
              <select
                aria-label={
                  {
                    org: 'Perusahaan',
                    status: 'Status',
                    province: 'Provinsi',
                    type: 'Jenis fraud',
                  }[key]
                }
                value={filters[key]}
                onChange={(e) => field(key, e.target.value)}
              >
                <option value="">Semua</option>
                {(key === 'org'
                  ? snapshot.orgs.filter((o) => o.id !== 'ojk').map((o) => [o.id, o.name])
                  : key === 'province'
                    ? provinces.map((p) => [p.id, p.name])
                    : key === 'status'
                      ? ['PENDING', 'APPROVED', 'REJECTED', 'INVALID'].map((s) => [s, s])
                      : [...new Set(snapshot.cases.map((c) => c.fraudType))].map((s) => [s, s])
                ).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <div className="note">{invalid || `${count} kasus sesuai filter · CSV UTF-8`}</div>
        {error && <p className="error">{error}</p>}
      </div>
      <div className="modal-foot">
        <button className="primary" disabled={busy || !!invalid || !count}>
          {busy ? 'Menyiapkan berkas…' : 'Ekspor data CSV'}
        </button>
      </div>
    </form>
  );
}
