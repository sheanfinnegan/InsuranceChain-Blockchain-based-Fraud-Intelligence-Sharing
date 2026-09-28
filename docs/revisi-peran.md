# Revisi tampilan dan akses peran — 28 September 2026

- Aktivitas blockchain hanya untuk OJK. Endpoint `/api/blockchain` mengembalikan 403 bagi analis maupun Claim Staff; URL tampilan langsung diarahkan kembali ke dashboard.
- OJK memakai Pantau validasi dan Riwayat kasus. Menu Fraud intelligence dihapus. Tautan pencarian dari peta/daftar terbaru mengarah ke riwayat dengan filter tetap berlaku. Tab penilaian pribadi dan pengajuan organisasi sendiri tidak ditampilkan.
- Claim Staff menerima hanya kasus APPROVED dan INVALID dari snapshot API. Agregat dashboard dan pencarian menggunakan himpunan yang sama; bukti kasus PENDING/REJECTED tidak dapat diunduh melalui endpoint file.
- Dashboard staff berisi total kasus, nilai klaim, peta, pola indikasi, dan kasus terbaru. Pencarian memakai satu tab Fraud case dengan filter status approved/invalid.
- Analis tetap dapat melihat kasus dan putaran yang diperlukan untuk voting. Panel aktivitas jaringan dihapus; notifikasi penilaian berada sebelum peta.

Verifikasi: `npm run typecheck`, `npm test`, dan `node scripts/check-role-revision.mjs`. Tampilan ketiga peran diperiksa melalui browser.
