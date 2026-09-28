'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight, MapPin } from 'lucide-react';
import type { FraudCase } from '@/lib/types';
import { provinces } from '@/lib/provinces';
type Geometry = { type: string; coordinates: number[][][][] };
export const project = (lon: number, lat: number) => [(lon - 94) * 19 + 20, (6.8 - lat) * 19 + 25];
export function useIndonesia() {
  const [paths, setPaths] = useState<string[]>([]);
  useEffect(() => {
    fetch('/maps/indonesia.json')
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((g: Geometry) =>
        setPaths(
          g.coordinates.map((poly) =>
            poly
              .map(
                (ring) =>
                  ring
                    .map(([lon, lat], i) => {
                      const [x, y] = project(lon, lat);
                      return (i ? 'L' : 'M') + x.toFixed(2) + ',' + y.toFixed(2);
                    })
                    .join(' ') + 'Z',
              )
              .join(' '),
          ),
        ),
      )
      .catch(() => setPaths([]));
  }, []);
  return paths;
}
export default function IndonesiaMap({
  cases,
  healthy,
  onSelect,
  finalOnly = false,
}: {
  cases: FraudCase[];
  healthy: boolean;
  onSelect: (id: string, scope: string) => void;
  finalOnly?: boolean;
}) {
  const selectProvince = (id: string) => onSelect(id, scope);
  const paths = useIndonesia();
  const [hover, setHover] = useState('');
  const [scope, setScope] = useState('ALL');
  const scoped = cases.filter((c) => scope === 'ALL' || c.status === 'APPROVED');
  const counts = provinces.map((p) => ({
    ...p,
    count: scoped.filter((c) => c.provinceId === p.id).length,
  }));
  const ranking = [...counts].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const max = Math.max(1, ...counts.map((p) => p.count));
  const unknown = scoped.filter((c) => !c.provinceId).length;
  const active = counts.find((p) => p.id === hover);
  const mapped = scoped.length - unknown;
  return (
    <section className="panel geography-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">FRAUD GEOGRAPHY</span>
          <h2>Satu peta. Perspektif nasional.</h2>
          <p>Klik titik provinsi untuk menjelajahi kasus dari wilayah tersebut.</p>
        </div>
        <select
          aria-label="Cakupan heatmap"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
        >
          <option value="ALL">
            {finalOnly ? 'Kasus approved & invalid' : 'Semua kasus dilaporkan'}
          </option>
          <option value="APPROVED">Kasus disetujui</option>
        </select>
      </div>
      <div className="geography-grid">
        <div className="map-area">
          <div className="map-summary">
            <span>
              <i className="live-dot" />
              {healthy ? 'Terhubung ke ledger' : 'Data belum tersedia'}
            </span>
            <strong>
              {mapped}
              <small> kasus dipetakan</small>
            </strong>
          </div>
          <svg
            viewBox="0 0 950 385"
            role="group"
            aria-label="Heatmap kasus menurut provinsi Indonesia"
          >
            <defs>
              <radialGradient id="map-halo">
                <stop stopColor="#b692ff" stopOpacity=".7" />
                <stop offset="1" stopColor="#9871ee" stopOpacity="0" />
              </radialGradient>
              <pattern id="map-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r=".65" fill="#635476" opacity=".35" />
              </pattern>
            </defs>
            <rect width="950" height="385" fill="url(#map-grid)" />
            {paths.map((d, i) => (
              <path key={i} d={d} className="island" />
            ))}
            {counts
              .filter((p) => p.count > 0)
              .map((p) => {
                const [x, y] = project(p.lon, p.lat);
                return (
                  <circle
                    key={'heat' + p.id}
                    cx={x}
                    cy={y}
                    r={20 + (27 * p.count) / max}
                    fill="url(#map-halo)"
                    pointerEvents="none"
                  />
                );
              })}
            {counts.map((p) => {
              const [x, y] = project(p.lon, p.lat);
              return (
                <g
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${p.name}: ${p.count} kasus. Buka pencarian.`}
                  onMouseEnter={() => setHover(p.id)}
                  onFocus={() => setHover(p.id)}
                  onClick={() => selectProvince(p.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      selectProvince(p.id);
                    }
                  }}
                  className={'province-point ' + (hover === p.id ? 'hovered' : '')}
                >
                  <title>
                    {p.name}: {p.count} kasus
                  </title>
                  <circle cx={x} cy={y} r={10} fill="transparent" />
                  <circle
                    cx={x}
                    cy={y}
                    r={p.count ? 4 + (5 * p.count) / max : 3}
                    fill={p.count ? '#cfb8ff' : '#675974'}
                    stroke={p.count ? '#eee4ff' : '#9e8fb2'}
                    strokeWidth="1.3"
                  />
                  {p.count > 0 && (
                    <text x={x} y={y - 13} textAnchor="middle" fill="#f3ecff" fontSize="11">
                      {p.count}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          <div className="map-bottom">
            <span>
              <MapPin size={14} />
              {active
                ? `${active.name} · ${active.count} kasus`
                : 'Arahkan ke titik untuk melihat provinsi'}
            </span>
            <span className="heat-legend">
              Rendah <i /> Tinggi
            </span>
          </div>
          {!paths.length && (
            <p className="map-note">
              Garis peta belum tersedia. Gunakan pilihan provinsi di bawah.
            </p>
          )}
          <p className="map-note">
            Titik mewakili provinsi, bukan alamat kejadian. Jumlah laporan bukan tingkat risiko
            penduduk.{' '}
            {scope === 'ALL'
              ? finalOnly
                ? 'Hanya kasus approved dan invalid.'
                : 'Termasuk pending, rejected, dan invalid.'
              : 'Hanya kasus approved.'}
          </p>
        </div>
        <aside className="region-ranking">
          <div className="ranking-title">
            <span>WILAYAH TERBANYAK</span>
            <strong>
              {counts.filter((p) => p.count > 0).length}
              <small> provinsi</small>
            </strong>
          </div>
          {ranking
            .filter((p) => p.count > 0)
            .slice(0, 5)
            .map((p, i) => (
              <button key={p.id} onClick={() => selectProvince(p.id)}>
                <span className="region-rank">0{i + 1}</span>
                <div>
                  <strong>{p.name}</strong>
                  <span className="region-bar">
                    <i style={{ width: (p.count / max) * 100 + '%' }} />
                  </span>
                </div>
                <b>{p.count}</b>
                <ArrowUpRight size={14} />
              </button>
            ))}
          {!mapped && (
            <p className="map-empty">
              Belum ada kasus berlokasi. Kasus baru wajib mencantumkan provinsi dan kota.
            </p>
          )}
          <label className="map-select">
            Jelajahi semua provinsi
            <select
              aria-label="Jelajahi provinsi"
              value=""
              onChange={(e) => selectProvince(e.target.value)}
            >
              <option value="" disabled>
                Pilih wilayah…
              </option>
              {counts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.count})
                </option>
              ))}
            </select>
          </label>
          {unknown > 0 && (
            <button className="unmapped" onClick={() => selectProvince('UNKNOWN')}>
              {unknown} kasus belum memiliki lokasi <ArrowUpRight size={15} />
            </button>
          )}
        </aside>
      </div>
      <div className="map-credit">
        Garis pantai: Natural Earth · Agregasi: ledger insurancechain
      </div>
    </section>
  );
}
