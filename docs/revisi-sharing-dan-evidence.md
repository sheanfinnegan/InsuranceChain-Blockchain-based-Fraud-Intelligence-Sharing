# Revisi identifier, bukti, dan ekspor

- Nilai lengkap identifier disimpan off-chain di `caseIdentifiers` dan dibaca setelah autentikasi. Ledger hanya menerima label dan hash. Nomor klaim ditolak sebagai identifier baru. NIK harus 16 digit.
- Snapshot menghubungkan nilai dengan hash dan label pada kasus yang sama. Data lama yang hanya mempunyai hash tidak direkonstruksi atau diberi identitas rekaan. Nomor klaim lama tidak ditampilkan sebagai identifier bersama.
- Tab Bukti memuat PDF, PNG/JPG, TXT/CSV melalui endpoint file berautentikasi. Hash diperiksa sebelum preview atau unduh. File bukan aset publik. PDF dirender lokal dengan PDF.js.
- Ekspor tersedia bagi Analis/OJK, diawali dialog filter tanggal pengajuan (WIB inklusif), perusahaan, status, provinsi, dan jenis fraud. Filter yang sama diterapkan ulang di server sebelum CSV dibuat.
- `scripts/create-evidence-fixtures.py` menghasilkan delapan set bukti fiktif. Semua nama dan kejadian merupakan data contoh, NIK memakai prefix 000000 yang bukan wilayah penerbitan nyata. PNG adalah salinan visual laporan PDF, bukan foto kejadian. CSV merupakan rincian rekonsiliasi.
- `scripts/seed-rich-cases.mjs` memasukkan kasus melalui API dan voting Fabric sungguhan. Kasus tersebar pada delapan provinsi dan lima perusahaan, dengan status APPROVED, PENDING, REJECTED, INVALID. Waktu pengajuan mengikuti transaksi aktual; tanggal pemeriksaan dalam dokumen terpisah.
- Untuk mencoba pencarian lintas perusahaan, cari `Ardan Wicaksana` atau `0000000000000001`: dua kasus muncul dari organisasi berbeda.
