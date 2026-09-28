// Presentation labels only. Original ledger records and evidence remain intact.
export function displayText(value: string) {
  return value
    .replace(/^\[SIMULASI[^\]]*\]\s*/i, '')
    .replace(/Seluruh data dalam kasus ini[^.]*\./gi, '')
    .replace(/untuk (?:kebutuhan )?penelitian InsuranceChain\.?/gi, '')
    .replace(/\b(?:sandbox|proof-of-concept|simulasi|sintetis)\b/gi, '')
    .replace(/Pengujian (?:skripsi|lima organisasi):\s*/gi, '')
    .replace(
      /Kasus\s+untuk pengujian lokasi dan identifier skripsi\./gi,
      'Review dokumen klaim dengan pencocokan lokasi dan identifier terkait.',
    )
    .replace(
      /Kasus\s+untuk membuktikan threshold empat dari lima organisasi\.\s*Evidence\s+disiapkan untuk penelitian\./gi,
      'Dokumen klaim ditinjau bersama bukti pendukung dan identifier terkait.',
    )
    .replace(/ {2,}/g, ' ')
    .trim();
}
