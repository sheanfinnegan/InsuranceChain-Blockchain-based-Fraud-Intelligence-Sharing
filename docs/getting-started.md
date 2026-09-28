# Instalasi dan operasi

Panduan ini membedakan bootstrap dari clone baru dan operasi harian. Bootstrap menulis konfigurasi, membuat jaringan, serta menjalankan transaksi governance; jangan menggunakannya untuk menggantikan jaringan aktif tanpa backup.

## Prasyarat

- Linux x86-64, atau Ubuntu x86-64 melalui WSL2 pada Windows.
- Node.js 22 atau lebih baru dan npm; gunakan `npm ci` untuk mengikuti lockfile.
- Docker Engine dengan Compose v2 yang dapat diakses dari shell Ubuntu.
- Go 1.23 atau lebih baru, Git, curl, tar, dan Python 3.
- Akses unduhan npm, image Docker, modul Go, serta rilis Fabric.

Jalankan perintah Bash di bawah dari direktori repository. Pada Windows, gunakan satu instalasi Node/npm yang konsisten untuk proyek; jaringan Fabric dijalankan melalui Ubuntu. Jangan menjalankan dua Docker engine berbeda untuk jaringan yang sama.

## Clone dan konfigurasi

```bash
git clone https://github.com/sheanfinnegan/InsuranceChain-Blockchain-based-Fraud-Intelligence-Sharing.git
cd InsuranceChain-Blockchain-based-Fraud-Intelligence-Sharing
npm ci
node scripts/configure.mjs
node scripts/network-config.mjs
```

`configure.mjs` membuat `.env.local` dengan password database/storage acak jika file belum tersedia. File yang sudah ada dipertahankan. Ubah `DEMO_PASSWORD` sebelum inisialisasi akun pertama jika ingin memakai password sendiri. Jangan commit file ini.

`network-config.mjs` menghasilkan `.runtime/crypto-config.yaml`, `.runtime/configtx.yaml`, serta `infra/compose.yaml`. Jalankan sebelum provisioning, bukan saat sekadar menyalakan ulang layanan.

## Fabric CLI dan konfigurasi peer

Skrip bootstrap memiliki fallback path dari lingkungan pengembangan awal untuk `core.yaml`. Agar clone baru tidak bergantung pada path tersebut, sediakan binary dan konfigurasi terlebih dahulu:

```bash
mkdir -p .runtime
curl -fL https://github.com/hyperledger/fabric/releases/download/v2.5.16/hyperledger-fabric-linux-amd64-2.5.16.tar.gz \
  -o .runtime/fabric-2.5.16.tar.gz
tar -xzf .runtime/fabric-2.5.16.tar.gz -C .runtime
cp .runtime/config/core.yaml .runtime/core.yaml
test -x .runtime/bin/peer
test -f .runtime/core.yaml
```

Paket ini ditujukan Linux x86-64. Jika memakai arsitektur lain, sesuaikan binary, image, dan skrip; dukungan tersebut belum diverifikasi dalam proyek ini.

## Bootstrap jaringan

```bash
bash scripts/network-up.sh
```

Skrip membuat/menambah crypto material, menyalakan layanan, membentuk channel `insurance`, memasang chaincode, menambahkan Org4/Org5, dan memprovisikan peer OJK. Tunggu sampai seluruh proses selesai. Unduhan image dan kompilasi chaincode pertama kali dapat memerlukan waktu.

Instalasi baru memulai definisi chaincode version/sequence 1; laporan migrasi yang menyebut version/sequence 3 berasal dari jaringan pengembangan yang telah di-upgrade. Jangan memaksakan sequence tertentu hanya agar cocok dengan laporan tersebut.

## Inisialisasi peserta dan akun

Jalankan sekali pada jaringan baru setelah peer siap:

```bash
node --env-file=.env.local --import tsx -e "const {fabric}=require('./lib/fabric.ts'); const {pool}=require('./lib/db.ts'); fabric('OJKMSP','Init',[],true).then(()=>console.log('Ledger initialized')).catch(e=>{console.error(e);process.exitCode=1}).finally(()=>pool.end())"
node --env-file=.env.local --import tsx scripts/register-new-orgs.ts
npm run dev
```

`Init` menyiapkan tiga peserta bisnis awal. Skrip berikutnya mendaftarkan Cakrawala dan Pradana sebagai peserta aktif serta menyiapkan akun aplikasi. PostgreSQL membuat struktur state aplikasi dan akun awal ketika pertama diakses. Skrip registrasi mengirim transaksi governance; tidak perlu diulang setiap startup.

| Portal | Akun awal |
| --- | --- |
| `/analis` | `analis@nusantara.test`, `analis@sentra.test`, `analis@arunika.test` |
| `/analis` setelah registrasi Org4/Org5 | `analis@cakrawala.test`, `analis@pradana.test` |
| `/staff` | `klaim@nusantara.test` |
| `/ojk` | `regulator@ojk.test` |

Password mengikuti `DEMO_PASSWORD` saat akun dibuat. Nilai bawaan pengembangan adalah `InsuranceChain!2026`. Mengubah variabel tersebut setelah akun tersimpan tidak otomatis mengganti password akun yang sudah ada.

Buka **http://127.0.0.1:3000**. Buat kasus melalui portal analis untuk menjalankan flow pengajuan, evidence, voting lintas perusahaan, dan invalidasi. Kasus baru memerlukan lokasi kejadian serta identifier; gunakan data buatan saat pengujian.

## Operasi harian

```bash
docker compose --env-file .env.local -f infra/compose.yaml up -d
npm run dev
```

Frontend dan backend berada dalam proses yang sama. Untuk menghentikan web, tekan Ctrl+C. Untuk menghentikan infrastruktur tanpa menghapus data:

```bash
docker compose --env-file .env.local -f infra/compose.yaml stop
```

Jangan memakai `down -v` jika data hendak dipertahankan. Backup perlu mencakup volume Docker, `.env.local`, dan `.runtime/crypto`; menyimpan source code saja tidak mencadangkan ledger atau evidence.

## Verifikasi

```bash
npm test
npm run typecheck
npm run format:check
node scripts/check-portals.mjs
node scripts/check-role-revision.mjs
node scripts/check-evidence-access.mjs
node --env-file=.env.local --import tsx scripts/check-ojk-gateway.ts
bash scripts/verify-ojk-ledger.sh
```

Jalankan `go test ./...` dari folder `chaincode/` untuk aturan smart contract. Pada clone baru, jika TypeScript meminta tipe route Next.js, jalankan `npx next typegen` terlebih dahulu.

Skrip integrasi memakai akun pengembangan dan sebagian memerlukan kasus/evidence yang sudah tersedia. Gunakan password/default fixture yang sesuai atau sesuaikan skrip bila konfigurasi akun berbeda. `check-ojk-gateway.ts` mengevaluasi governance tanpa commit; `verify-ojk-ledger.sh` membandingkan state/ledger Org1 dan OJK. `check-ojk-restart.sh` me-restart peer dan bukan pemeriksaan tanpa gangguan.

## Data contoh opsional

Skrip `create-evidence-fixtures.py` membuat PDF, PNG, dan CSV buatan; memerlukan ReportLab, pypdf, serta Poppler. Path executable `pdftoppm` saat ini masih spesifik komputer pengembangan dan harus disesuaikan pada mesin lain. `seed-rich-cases.mjs` memakai manifest hasil generator, akun bawaan, dan aplikasi yang sudah berjalan; skrip ini mengajukan kasus serta memberikan suara sungguhan ke ledger lokal.

Jangan jalankan seed pada jaringan berisi data penting. Skrip lama `seed.ts`, `check-features.mjs`, dan `check-five-orgs.mjs` merekam fase pengembangan sebelumnya dan bukan prosedur bootstrap yang direkomendasikan. Pengajuan manual melalui portal tidak memerlukan fixture tersebut.

## Variabel lingkungan

| Variabel | Fungsi |
| --- | --- |
| `DATABASE_URL` | Koneksi PostgreSQL dari aplikasi |
| `POSTGRES_PASSWORD` | Password container PostgreSQL; harus cocok dengan URL |
| `COUCHDB_PASSWORD` | Password CouchDB pada konfigurasi peer |
| `S3_ENDPOINT` | Endpoint RustFS, default lokal port 19000 |
| `S3_ACCESS_KEY`, `S3_SECRET_KEY` | Kredensial storage |
| `FABRIC_CRYPTO_PATH` | Direktori crypto, default `.runtime/crypto` |
| `FABRIC_ORG1_ENDPOINT` … `FABRIC_ORG5_ENDPOINT` | Override endpoint gateway perusahaan |
| `FABRIC_OJK_ENDPOINT` | Gateway OJK, default `localhost:14051` |
| `DEMO_PASSWORD` | Password akun saat bootstrap |

Profil default berada di `config/fabric-network.json`. Jangan mengganti endpoint OJK ke peer perusahaan untuk menyembunyikan gangguan peer OJK.

## Troubleshooting

| Gejala | Pemeriksaan |
| --- | --- |
| Docker tidak tersedia | `docker info` dan `docker compose version` pada Ubuntu yang sama |
| `core.yaml` tidak ditemukan | Selesaikan bagian Fabric CLI sebelum menjalankan bootstrap |
| Port 3000 terpakai | Periksa apakah aplikasi sudah berjalan; hindari proses web ganda |
| Login ditolak | Gunakan portal sesuai role dan password saat akun pertama dibuat |
| Ledger tidak sehat | `docker compose --env-file .env.local -f infra/compose.yaml ps` dan `logs --tail 80` |
| Gateway OJK gagal | Periksa `ic-peer-ojk`, `ic-couch-ojk`, port 14051, dan sertifikat OJK |
| Query chaincode gagal setelah instalasi | Pastikan provisioning selesai, peer sudah join, dan chaincode tersedia pada peer |
| Minimal tiga organisasi | Periksa state peserta bisnis dan status aktif perusahaan, bukan jumlah container peer |

Bootstrap dari clone baru belum diuji ulang dengan menghapus jaringan pengembangan yang berjalan. Dokumentasi membedakan langkah penyiapan dari hasil verifikasi jaringan aktif agar data yang sudah ada tetap terjaga.
