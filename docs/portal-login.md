# Portal InsuranceChain

Server lokal berjalan di http://127.0.0.1:3000.

| Portal | Alamat | Akun simulasi |
| --- | --- | --- |
| Analis | /analis | analis@nusantara.test |
| Claim Staff | /staff | klaim@nusantara.test |
| OJK | /ojk | regulator@ojk.test |

Password akun lingkungan lokal: `InsuranceChain!2026`. Akun juga tersedia melalui tombol **Pilih akun** pada setiap halaman login. Alamat `/` mengarahkan ke `/analis`. Akun harus masuk melalui portal yang sesuai dengan perannya. Organisasi Cakrawala Proteksi dan Pradana Life memiliki akun analis dan staff tambahan yang tersedia pada pilihan akun.

Pemeriksaan origin POST membandingkan origin browser dengan Host HTTP, bukan alamat internal Next.js. Deployment dengan origin tambahan dapat menggunakan daftar origin eksplisit pada APP_ALLOWED_ORIGINS, dipisahkan koma. Akses dari origin lain tetap ditolak.

Validasi perubahan 26 September 2026: TypeScript, tiga pengujian origin, redirect root, tiga login dan sesi terautentikasi, penolakan portal salah, serta penolakan POST lintas origin lulus. Ketiga sesi berhasil membaca ledger setelah anchor peer dikonfigurasi. Tampilan login dan dashboard diperiksa di browser.

Jalankan `npm run dev` untuk web. Infrastruktur yang sudah dikonfigurasi dapat dijalankan dari WSL Ubuntu dengan `bash scripts/network-up.sh`. Data tersimpan pada volume Docker. Delapan kasus awal menggunakan data sintetis.
