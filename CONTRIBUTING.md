# Berkontribusi

Gunakan issue untuk menjelaskan masalah atau usulan perubahan. Sertakan langkah reproduksi, perilaku yang diharapkan, serta versi Node, Go, dan Docker jika relevan. Jangan melampirkan `.env.local`, private key, sertifikat, data pasien, atau evidence asli.

1. Ikuti [panduan instalasi](docs/getting-started.md).
2. Buat branch untuk perubahan yang terfokus.
3. Pertahankan pembatasan role dan pisahkan voting bisnis dari endorsement Fabric.
4. Jalankan `npm run typecheck`, `npm test`, dan `npm run format:check`.
5. Untuk perubahan chaincode, jalankan `go test ./...` dari `chaincode/` dan dokumentasikan kebutuhan upgrade sequence.
6. Sertakan hasil pengujian serta perubahan dokumentasi dalam pull request. Untuk perubahan UI, tambahkan screenshot dengan data buatan.

Jangan menjalankan ulang seed atau mereset volume sebagai bagian dari tes biasa pada jaringan yang berisi data penting. Skrip provisioning dan seed dapat mengirim transaksi serta mengubah state jaringan.

Format kode dijelaskan di [panduan formatter](docs/format-kode.md). Penggunaan dan redistribusi proyek mengikuti izin pemilik; belum ada lisensi open-source yang ditetapkan.
