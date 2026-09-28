'use client';
import { useState } from 'react';
import { Plus, Trash2, Link2 } from 'lucide-react';
export default function IdentifierInput() {
  const [rows, setRows] = useState([{ id: 0, label: 'Nama lengkap', value: '' }]);
  const [next, setNext] = useState(1);
  return (
    <fieldset className="identifier-editor">
      <legend>
        <Link2 size={17} />
        Identifier terkait <span>{rows.length}/20</span>
      </legend>
      <p>Tambahkan satu atau beberapa identitas untuk pencocokan lintas kasus.</p>
      <input
        type="hidden"
        name="identifiersJSON"
        value={JSON.stringify(rows.map(({ label, value }) => ({ label, value })))}
      />
      {rows.map((r, i) => (
        <div className="identifier-row" key={r.id}>
          <span className="row-number">{String(i + 1).padStart(2, '0')}</span>
          <label>
            Jenis identifier
            <input
              aria-label={'Jenis identifier ' + (i + 1)}
              list="identifier-types"
              value={r.label}
              required
              minLength={2}
              maxLength={80}
              onChange={(e) =>
                setRows(rows.map((x) => (x.id === r.id ? { ...x, label: e.target.value } : x)))
              }
            />
          </label>
          <label>
            Nilai identifier
            <input
              aria-label={'Nilai identifier ' + (i + 1)}
              required
              minLength={3}
              maxLength={150}
              placeholder="Masukkan identitas lengkap"
              value={r.value}
              onChange={(e) =>
                setRows(rows.map((x) => (x.id === r.id ? { ...x, value: e.target.value } : x)))
              }
            />
          </label>
          <button
            className="icon-button"
            type="button"
            disabled={rows.length === 1}
            aria-label={'Hapus identifier ' + (i + 1)}
            onClick={() => setRows(rows.filter((x) => x.id !== r.id))}
          >
            <Trash2 size={17} />
          </button>
        </div>
      ))}
      <datalist id="identifier-types">
        {[
          'Nama lengkap',
          'NIK',
          'Nomor rekening',
          'Email',
          'Nomor telepon',
          'Fasilitas kesehatan',
        ].map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <button
        type="button"
        className="secondary compact"
        disabled={
          rows.length >= 20 ||
          rows.some((x) => x.value.trim().length < 3 || x.label.trim().length < 2)
        }
        onClick={() => {
          setRows([...rows, { id: next, label: 'NIK', value: '' }]);
          setNext(next + 1);
        }}
      >
        <Plus size={16} />
        Tambah identifier
      </button>
    </fieldset>
  );
}
