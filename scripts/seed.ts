import { fabric } from '../lib/fabric';
import { mutate, hash, pool } from '../lib/db';
import { saveFile } from '../lib/storage';
import type { FraudCase } from '../lib/types';
async function main() {
  await fabric('OJKMSP', 'Init', [], true);
  console.log('Ledger initialized.');
  const existing = (await fabric('Org1MSP', 'ListCases', [])) as FraudCase[];
  const examples = [
    [
      'Tagihan rawat inap terduplikasi',
      'Duplicate billing',
      48500000,
      'Org2MSP',
      'sentra',
      'PENDING',
    ],
    ['Ketidaksesuaian kode tindakan medis', 'Upcoding', 32750000, 'Org3MSP', 'arunika', 'APPROVED'],
    [
      'Dokumen rujukan tidak konsisten',
      'Pemalsuan dokumen',
      18200000,
      'Org1MSP',
      'nusantara',
      'PENDING',
    ],
    [
      'Layanan konsultasi tanpa rekam kunjungan',
      'Phantom billing',
      125000000,
      'Org2MSP',
      'sentra',
      'APPROVED',
    ],
    [
      'Penggunaan identitas pada dua fasilitas',
      'Identity fraud',
      67200000,
      'Org3MSP',
      'arunika',
      'PENDING',
    ],
    [
      'Perbedaan periode kepesertaan',
      'Manipulasi kelayakan',
      24600000,
      'Org1MSP',
      'nusantara',
      'REJECTED',
    ],
    [
      'Duplikasi faktur layanan laboratorium',
      'Duplicate billing',
      15900000,
      'Org2MSP',
      'sentra',
      'APPROVED',
    ],
    [
      'Koreksi temuan administrasi rawat jalan',
      'Pemalsuan dokumen',
      8200000,
      'Org3MSP',
      'arunika',
      'INVALID',
    ],
  ];
  for (let i = 0; i < examples.length; i++) {
    const [title, type, amount, msp, org, status] = examples[i];
    const id = 'IC-2026-' + String(i + 101).padStart(4, '0');
    if (existing.some((c) => c.id === id)) continue;
    const text = `INSURANCECHAIN — EVIDENCE SINTETIS\nKasus: ${title}\nReferensi: SIM-CLM-${101 + i}\nBerkas ini adalah data simulasi untuk penelitian. Tidak berisi informasi pasien nyata.\nTemuan: terdapat ketidaksesuaian data layanan dan dokumen pada proses review internal.\n`;
    const evidence = await saveFile(
      {
        name: `evidence-simulasi-${101 + i}.txt`,
        data: Buffer.from(text).toString('base64'),
        mime: 'text/plain',
      },
      `analyst-${org}`,
    );
    await mutate((s) => {
      s.files.push(evidence);
    });
    let c = (await fabric(
      String(msp),
      'CreateCase',
      [
        {
          id,
          title,
          fraudType: type,
          amount,
          provinceId: ['32', '31', '35', '32', '73', '51', '12', '33'][i],
          city: [
            'Kota Bandung',
            'Jakarta Selatan',
            'Kota Surabaya',
            'Kota Bekasi',
            'Kota Makassar',
            'Kota Denpasar',
            'Kota Medan',
            'Kota Semarang',
          ][i],
          description: `Dalam review internal organisasi, ditemukan indikasi ${String(type).toLowerCase()} pada dokumen klaim SIM-CLM-${101 + i}. Perbandingan dokumen pendukung menunjukkan perbedaan informasi yang perlu dinilai oleh organisasi lain.\n\nTim analis meminta cross-validation atas kronologi, kesesuaian layanan, dan evidence terlampir. Seluruh data dalam kasus ini bersifat sintetis untuk kebutuhan penelitian InsuranceChain.`,
          createdBy: `analyst-${org}`,
          identifiers: [
            { label: 'Nomor klaim', hash: hash(`sim-clm-${101 + i}`), masked: `••••${101 + i}` },
          ],
          evidence: [evidence],
        },
      ],
      true,
    )) as FraudCase;
    const others = ['Org1MSP', 'Org2MSP', 'Org3MSP'].filter((x) => x !== msp);
    if (status === 'APPROVED' || status === 'INVALID') {
      c = await fabric(
        others[0],
        'CastVote',
        [
          id,
          c.rounds[0].id,
          'seed-analyst',
          'APPROVE',
          'Evidence sintetis telah diperiksa dan mendukung temuan organisasi pengaju.',
        ],
        true,
      );
    }
    if (status === 'REJECTED') {
      for (const voter of others)
        c = await fabric(
          voter,
          'CastVote',
          [
            id,
            c.rounds[0].id,
            'seed-analyst',
            'REJECT',
            'Dokumen pembanding menjelaskan perbedaan administrasi; indikasi belum terbukti.',
          ],
          true,
        );
    }
    if (status === 'INVALID') {
      const extra = await saveFile(
        {
          name: 'klarifikasi-sintetis.txt',
          data: Buffer.from(
            'Klarifikasi sintetis: pemeriksaan lanjutan menunjukkan kesalahan pencocokan dokumen.',
          ).toString('base64'),
          mime: 'text/plain',
        },
        'seed-analyst',
      );
      await mutate((s) => {
        s.files.push(extra);
      });
      c = await fabric(
        String(msp),
        'Invalidate',
        [
          id,
          'seed-analyst',
          'Bukti klarifikasi baru menunjukkan kesalahan pencocokan dokumen pada review awal.',
          [extra],
        ],
        true,
      );
      c = await fabric(
        others[0],
        'CastVote',
        [
          id,
          c.rounds.at(-1)!.id,
          'seed-analyst',
          'APPROVE',
          'Klarifikasi telah diverifikasi, pembatalan validitas kasus dapat disetujui.',
        ],
        true,
      );
    }
    console.log(`${id}: ${c.status}`);
  }
  await pool.end();
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
  pool.end();
});
