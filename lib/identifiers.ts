import { createHash } from 'node:crypto';
export function normalizeIdentifiers(input: unknown) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 20)
    throw new Error('Masukkan 1–20 identifier.');
  const seen = new Set<string>();
  return input.map((x) => {
    if (
      typeof x?.label !== 'string' ||
      x.label.trim().length < 2 ||
      x.label.length > 80 ||
      typeof x.value !== 'string' ||
      x.value.trim().length < 3 ||
      x.value.length > 150
    )
      throw new Error('Lengkapi jenis dan nilai setiap identifier.');
    const label = x.label.trim(),
      value = x.value.trim();
    if (/klaim|claim/i.test(label))
      throw new Error(
        'Nomor klaim tidak digunakan sebagai identifier bersama. Gunakan nama, NIK, atau identitas terkait.',
      );
    if (/^(nik|ktp|nomor ktp)$/i.test(label) && !/^\d{16}$/.test(value))
      throw new Error('NIK harus berisi 16 digit.');
    const normalized = value.toLowerCase().replace(/\s+/g, '');
    const key = label.toLowerCase() + ':' + normalized;
    if (seen.has(key)) throw new Error('Identifier yang sama tidak boleh dimasukkan dua kali.');
    seen.add(key);
    return {
      label,
      hash: createHash('sha256').update(normalized).digest('hex'),
      masked: '',
      value,
    };
  });
}
