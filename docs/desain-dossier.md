# Identitas visual dan dossier

Logo asli pengguna disimpan tanpa perubahan pada `public/brand/insurancechain-original.png`. CSS membatasi whitespace dan menggunakan screen blending untuk menyatukan latar hitam logo dengan tema. Website menggunakan Poppins yang mendekati tipografi geometris pada gambar; identifikasi font persis dari raster tidak diasumsikan.

Detail kasus merupakan modal dossier dengan tab Ringkasan, Bukti, Kronologi, dan Validasi. Claim Staff tidak mendapat tab Validasi atau tombol keputusan. Pop-up mendukung Escape, fokus keyboard, backdrop, dan dialog konfirmasi terpisah untuk vote/invalidasi. Bukti dapat diunduh dan diverifikasi SHA-256 terhadap ledger.

Menu profil kanan atas terbuka saat hover, klik, atau tombol panah bawah. Tersedia Pengaturan akun dan Keluar. Navigasi bisnis Claim Staff tetap dibatasi dashboard dan pencarian. Aksen honeycomb putih beropacity 2,6% tampil pada permukaan latar.

Label sandbox/simulasi/sintetis dihilangkan pada presentasi UI sesuai permintaan. `displayText` hanya mengatur tampilan; data ledger dan dokumen evidence asli tidak ditulis ulang. Data pengujian tetap data fiktif untuk penelitian, dan penghapusan label UI bukan klaim kesiapan produksi.

Akun tambahan: `analis@cakrawala.test`, `analis@pradana.test`, `klaim@cakrawala.test`, `klaim@pradana.test`. Password awal lingkungan lokal mengikuti DEMO_PASSWORD. Kelima organisasi aktif. Pengujian transaksi membuktikan threshold 4 dari 5 pada putaran baru dan threshold 2 dari 3 tetap tersimpan pada putaran lama.
