import type { FraudCase } from './types';
export type ExportFilters = {
  from: string;
  to: string;
  org: string;
  status: string;
  province: string;
  type: string;
};
export const emptyExportFilters: ExportFilters = {
  from: '',
  to: '',
  org: '',
  status: '',
  province: '',
  type: '',
};
export function filterExport(cases: FraudCase[], f: ExportFilters) {
  for (const date of [f.from, f.to])
    if (
      date &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        Number.isNaN(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date)
    )
      throw new Error('Tanggal tidak valid.');
  if (f.from && f.to && f.from > f.to) throw new Error('Tanggal akhir harus setelah tanggal awal.');
  return cases.filter((c) => {
    const day = new Date(Date.parse(c.createdAt) + 7 * 3600000).toISOString().slice(0, 10);
    return (
      (!f.from || day >= f.from) &&
      (!f.to || day <= f.to) &&
      (!f.org || c.orgId === f.org) &&
      (!f.status || c.status === f.status) &&
      (!f.province || c.provinceId === f.province) &&
      (!f.type || c.fraudType === f.type)
    );
  });
}
