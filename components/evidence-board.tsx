'use client';
import PdfEvidence from './pdf-evidence';
import { useEffect, useState } from 'react';
import type { Evidence } from '@/lib/types';
export default function EvidenceBoard({
  items,
  onVerify,
}: {
  items: Evidence[];
  onVerify: (id: string) => void;
}) {
  const [selected, setSelected] = useState(items[0]?.id),
    [url, setUrl] = useState(''),
    [text, setText] = useState(''),
    [error, setError] = useState('');
  const file = items.find((f) => f.id === selected);
  useEffect(() => {
    let disposed = false,
      objectUrl = '';
    const controller = new AbortController();
    setUrl('');
    setText('');
    setError('');
    if (file)
      fetch('/api/file/' + file.id + '?preview=1', { signal: controller.signal })
        .then(async (r) => {
          if (!r.ok) throw new Error((await r.json()).error);
          const blob = await r.blob();
          if (disposed) return;
          if (file.mime.startsWith('text/')) {
            const content = await blob.text();
            if (!disposed) setText(content);
          } else {
            objectUrl = URL.createObjectURL(blob);
            setUrl(objectUrl);
          }
        })
        .catch((e) => {
          if (!disposed) setError(e.message);
        });
    return () => {
      disposed = true;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file]);
  if (!file) return <p>Belum ada bukti.</p>;
  return (
    <div className="evidence-board">
      <aside aria-label="Daftar barang bukti">
        {items.map((f, i) => (
          <button
            key={f.id}
            className={f.id === selected ? 'selected' : ''}
            onClick={() => setSelected(f.id)}
          >
            <span>
              E{String(i + 1).padStart(2, '0')} · {f.name.split('.').pop()?.toUpperCase()}
            </span>
            <strong>{f.name}</strong>
            <small>{(f.size / 1024).toFixed(1)} KB</small>
          </button>
        ))}
      </aside>
      <section>
        <header>
          <div>
            <small>BARANG BUKTI / ORIGINAL FILE</small>
            <h3>{file.name}</h3>
          </div>
          <a className="secondary" href={'/api/file/' + file.id}>
            Unduh
          </a>
        </header>
        <div className="evidence-preview">
          {error ? (
            <p className="error">{error}</p>
          ) : text ? (
            <pre>{text}</pre>
          ) : url ? (
            file.mime.startsWith('image/') ? (
              <img src={url} alt={'Bukti ' + file.name} />
            ) : file.mime === 'application/pdf' ? (
              <PdfEvidence key={file.id} url={url} />
            ) : (
              <p>Preview format ini belum tersedia. Gunakan Unduh.</p>
            )
          ) : (
            <p>Memeriksa integritas & memuat bukti…</p>
          )}
        </div>
        <footer>
          <span>Diunggah {new Date(file.createdAt).toLocaleString('id-ID')}</span>
          <button className="secondary" onClick={() => onVerify(file.id)}>
            Verifikasi SHA-256
          </button>
        </footer>
        <details>
          <summary>Fingerprint berkas</summary>
          <code>{file.hash}</code>
        </details>
      </section>
    </div>
  );
}
