# Menyalakan InsuranceChain

Panduan ini untuk instalasi yang sudah tersedia di komputer ini, dengan WSL Ubuntu dan data jaringan yang sudah dibuat.

## Komponen

| Komponen | Cara berjalan |
| --- | --- |
| Frontend React dan backend API | Satu proses Next.js, `npm run dev`, port 3000 |
| Blockchain Hyperledger Fabric | Docker: 5 peer perusahaan + 1 peer OJK dan 3 orderer; chaincode dijalankan oleh peer |
| World state | 6 CouchDB dalam Docker, masing-masing untuk satu peer |
| Akun, sesi, metadata aplikasi | PostgreSQL dalam Docker |
| Berkas evidence | RustFS dalam Docker |

## 1. Nyalakan infrastruktur dari PowerShell

```powershell
cd "C:\Users\shean\Documents\ChatGPT\Skripsi InsuranChain"
wsl -d Ubuntu --cd "/mnt/c/Users/shean/Documents/ChatGPT/Skripsi InsuranChain" -- docker compose --env-file .env.local -f infra/compose.yaml up -d
```

Perintah `up -d` menyalakan layanan di latar belakang dan memakai kembali volume data yang sudah ada. Tidak perlu menjalankan seed, provisioning organisasi, atau upgrade chaincode setiap kali membuka proyek.

## 2. Nyalakan frontend dan backend

Di PowerShell, masih dalam folder proyek:

```powershell
npm run dev
```

Biarkan terminal ini terbuka. Tunggu pesan `Ready`, lalu buka:

- Analis: http://127.0.0.1:3000/analis
- Claim Staff: http://127.0.0.1:3000/staff
- OJK: http://127.0.0.1:3000/ojk

Backend berada di `/api/*` pada server yang sama; tidak ada perintah backend terpisah. Gunakan tombol **Pilih akun** pada halaman login.

## 3. Periksa layanan

Jalankan di terminal PowerShell kedua:

```powershell
cd "C:\Users\shean\Documents\ChatGPT\Skripsi InsuranChain"
wsl -d Ubuntu --cd "/mnt/c/Users/shean/Documents/ChatGPT/Skripsi InsuranChain" -- docker compose --env-file .env.local -f infra/compose.yaml ps
node scripts/check-portals.mjs
```

Hasil pemeriksaan portal seharusnya menampilkan `ledger healthy=true` untuk ketiga peran. Script ini menguji login dan pembacaan ledger, bukan membuat kasus baru.

## Mematikan

Untuk Next.js yang dijalankan dengan `npm run dev`, tekan **Ctrl+C** di terminalnya. Untuk infrastruktur:

```powershell
wsl -d Ubuntu --cd "/mnt/c/Users/shean/Documents/ChatGPT/Skripsi InsuranChain" -- docker compose --env-file .env.local -f infra/compose.yaml stop
```

`stop` mempertahankan data. Hindari `down -v`, karena opsi `-v` menghapus volume data.

## Jika gagal

- Port 3000 sudah digunakan: server mungkin masih hidup. Buka alamat aplikasi terlebih dahulu; jangan menyalakan proses kedua. Periksa dengan `Get-NetTCPConnection -LocalPort 3000 -State Listen`.
- Docker tidak tersambung: cek `wsl -d Ubuntu -- docker info`. Nyalakan Docker engine yang digunakan instalasi Ubuntu sebelum mengulang langkah 1.
- Ledger tidak tersedia: periksa status container dan log dengan perintah berikut:

```powershell
wsl -d Ubuntu --cd "/mnt/c/Users/shean/Documents/ChatGPT/Skripsi InsuranChain" -- docker compose --env-file .env.local -f infra/compose.yaml logs --tail 80
```

Server yang dinyalakan agent di latar belakang menulis log ke `.runtime/web.stdout.log` dan `.runtime/web.stderr.log`. Instalasi ini memerlukan `.env.local` dan sertifikat dalam `.runtime/crypto`; simpan keduanya bersama data lokal.
