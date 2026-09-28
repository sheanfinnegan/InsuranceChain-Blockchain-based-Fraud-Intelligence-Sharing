'use client';
import { useEffect, useRef, useState } from 'react';
export default function PdfEvidence({ url }: { url: string }) {
  const canvas = useRef<HTMLCanvasElement>(null),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    setLoading(true);
    setError('');
    (async () => {
      const pdfjs = await import('pdfjs-dist');
      if (disposed) return;
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      const task = pdfjs.getDocument({ url });
      cleanup = () => {
        void task.destroy();
      };
      const doc = await task.promise;
      if (disposed) return;
      setTotal(doc.numPages);
      const pdfPage = await doc.getPage(Math.min(page, doc.numPages));
      if (disposed || !canvas.current) return;
      const viewport = pdfPage.getViewport({ scale: 1.5 });
      canvas.current.width = viewport.width;
      canvas.current.height = viewport.height;
      await pdfPage.render({ canvas: canvas.current, viewport }).promise;
      if (!disposed) setLoading(false);
    })().catch((e) => {
      if (!disposed) {
        setError(e.message);
        setLoading(false);
      }
    });
    return () => {
      disposed = true;
      cleanup();
    };
  }, [url, page]);
  return (
    <div className="pdf-viewer">
      <div className="pdf-toolbar">
        <button type="button" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>
          ←
        </button>
        <span>
          Halaman {page} / {total || '…'}
        </span>
        <button type="button" disabled={page >= total || loading} onClick={() => setPage(page + 1)}>
          →
        </button>
      </div>
      {error ? (
        <p className="error">PDF tidak dapat ditampilkan: {error}</p>
      ) : (
        <>
          {loading && <p>Memuat halaman…</p>}
          <canvas
            ref={canvas}
            aria-label={'Dokumen PDF halaman ' + page}
            style={{ display: loading ? 'none' : 'block' }}
          />
        </>
      )}
    </div>
  );
}
