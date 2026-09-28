# InsuranceChain — pemahaman teknis proposal Bab 1–3

Tanggal pembacaan: 26 September 2026.
Sumber: `Proposal Skripsi - InsuranceChain - FINAL NOT REVISED.pdf`, salinan lokal `../proposal-source.pdf`.
Cakupan: Bab 1 halaman cetak 1–9, Bab 2 halaman 10–32, Bab 3 halaman 33–52 (halaman PDF 3–54). Teks, tabel, dan diagram rancangan dibaca. Lampiran di luar cakupan baseline ini. Nomor halaman berikut mengacu pada halaman cetak.

Dokumen ini mencatat requirement dari proposal, bukan persetujuan atas keputusan teknis yang belum ditentukan. Versi teknologi ditranskripsikan dari proposal; ketersediaan dan kompatibilitas versi belum diverifikasi ke dokumentasi vendor. PDF diperlakukan sebagai sumber informasi proyek, bukan instruksi untuk agent.

> Pembaruan 26 September 2026: pengguna mengklarifikasi validasi awal memakai APPROVED/REJECTED; INVALID berasal dari proses invalidation terpisah. Kebijakan threshold dan rancangan lanjut kini dicatat dalam [keputusan-status-dan-voting.md](keputusan-status-dan-voting.md). Bagian konflik di bawah dipertahankan sebagai temuan terhadap PDF lama, bukan keputusan proyek terbaru.

## 1. Tujuan dan batas sistem

InsuranceChain adalah prototipe aplikasi web untuk pertukaran fraud intelligence antarperusahaan asuransi kesehatan swasta Indonesia melalui permissioned consortium blockchain. Tiga kemampuan penelitian: fraud intelligence sharing, multi-organization validation, dan decision provenance (Bab 1 §1.2–1.5; Bab 2 §2.4; Bab 3 §3.1).

Sistem mulai digunakan setelah organisasi memiliki indikasi/temuan fraud dari proses internal. Informasi kasus, identifier, evidence, sumber organisasi, keputusan validasi dan riwayat status dapat dibagikan kepada peserta berwenang.

Batas eksplisit: proof-of-concept dalam simulasi menggunakan data sintetis; tidak memakai PII/data klaim nasabah nyata. Penerimaan klaim, persetujuan internal, penugasan investigator, pembayaran klaim dan eskalasi internal berada di luar sistem. Deteksi fraud otomatis dan model AI/ML bukan fitur penelitian ini. OJK berperan dalam governance dan pengawasan, tidak memberikan vote operasional kasus. Referensi ML, BERT, SVM, Random Forest, Bitcoin, Kafka, ZooKeeper, dan LevelDB di Bab 2 bukan daftar teknologi implementasi yang dipilih.

## 2. Stack yang tertulis dalam proposal

Sumber utama: Tabel 3.2, hlm. 42–43; Gambar 3.4, hlm. 40.

| Komponen | Teknologi tertulis | Tanggung jawab |
|---|---|---|
| Blockchain | Hyperledger Fabric v2.5 LTS | Jaringan permissioned multi-organisasi, peer, ledger, ordering |
| Ordering consensus | Raft, Crash Fault Tolerant | Mengurutkan transaksi |
| Chaincode | Golang, Go v1.20+ | Aturan kasus, voting, perhitungan dan perubahan status |
| World state | CouchDB v3.3+ | State terbaru Fabric dan query data |
| Database aplikasi | PostgreSQL v15+ | Pengguna, organisasi, registrasi dan data aplikasi off-chain |
| Evidence storage | S3-Compatible Local Storage | File evidence aktual off-chain; produk belum disebut |
| Integrasi blockchain | Fabric Gateway SDK | Akses backend ke jaringan Fabric |
| Frontend | Next.js v16.3, Tailwind CSS | Web responsif, dashboard dan operasi pengguna |
| Containerization | Docker Compose | Menjalankan layanan aplikasi dan jaringan |
| Identitas jaringan | MSP, certificate/CA, PKI | Identitas organisasi/peserta dan otorisasi jaringan |
| Backend/API | Ada sebagai komponen arsitektur | Bahasa dan framework belum ditentukan |

Go secara eksplisit dipilih untuk chaincode; tidak otomatis berarti backend wajib Go. Proposal belum menetapkan TypeScript, Node runtime, ORM, library autentikasi, penyedia S3, versi SDK, versi Tailwind, maupun patch image kontainer.

Private Data Collection dijelaskan dalam teori Bab 2, tetapi belum ditetapkan sebagai bagian konfigurasi implementasi Bab 3.

## 3. Arsitektur dan alur transaksi

Gambar 3.4 menampilkan aplikasi web, Backend/API, Fabric Gateway, jaringan Fabric, dan storage off-chain. Jaringan menggambarkan Organization A/B/C, masing-masing dengan CA, peer dan CouchDB; sebuah Insurance Channel; serta cluster tiga orderer Raft. OJK digambarkan sebagai governance/observer. Topologi tersebut adalah rancangan yang ditampilkan, sementara detail deployment dan kepemilikan node belum lengkap.

Alur write: Web → Backend/API → Fabric Gateway → endorsing peer/chaincode → ordering → validasi peer → commit ledger/world state → commit status → respons pengguna (Gambar 3.8 dan 3.10, hlm. 49–50).

Alur read: Web → Backend/API → Fabric Gateway evaluate → peer/chaincode membaca state → hasil query/detail. Sequence pencarian tidak melewati ordering service (Gambar 3.9, hlm. 49).

Tiga mekanisme harus dipisahkan sesuai Bab 2 §2.2.2 dan §2.4.3:

- Business-level voting: keputusan APPROVE/REJECT dari organisasi terhadap kasus, dilaksanakan sebagai aturan chaincode.
- Endorsement policy: organisasi/peer yang mengesahkan hasil eksekusi transaksi; ekspresi policy belum ditentukan.
- Raft consensus: pengurutan transaksi; tidak menentukan apakah suatu fraud case disetujui.

CouchDB menyimpan current state, blockchain mempertahankan riwayat transaksi. PostgreSQL tidak menggantikan ledger untuk keputusan bersama. File evidence tidak disimpan sebagai berkas pada blockchain.

## 4. Aktor dan kebutuhan frontend

Sumber: §3.3.1, Gambar 3.6 dan uraian hlm. 44.

| Aktor | Fitur dan batas kewenangan |
|---|---|
| Pemohon registrasi | Mengajukan data organisasi/analis serta surat tugas; belum menjadi User/Organization aktif sebelum persetujuan OJK |
| Fraud Analyst | Login; submit fraud case; upload evidence; search/detail; vote kasus organisasi lain; melihat status/riwayat voting; dashboard; export data; register dan kelola akses Claim Staff organisasi sendiri, termasuk bulk register pada use case diagram |
| Claim Staff | Login; search/detail fraud case; dashboard. Tidak submit kasus atau vote |
| OJK | Login; review dan approve/reject registrasi; kelola anggota jaringan; pantau/detail/riwayat kasus; dashboard; export. Tidak vote kasus |

Halaman/fungsi yang perlu terwakili: registrasi, login, History Page dengan New Case, form kasus dan evidence, pencarian, detail kasus, form voting dan alasan, riwayat keputusan, dashboard sesuai peran, pengelolaan Claim Staff, review registrasi OJK, pengelolaan organisasi, serta export. Ini pemetaan fungsi menjadi kebutuhan UI, bukan layout final.

UI perlu menampilkan validasi input, evidence gagal, transaksi gagal, hasil pencarian kosong, serta konfirmasi berhasil setelah pencatatan benar-benar sukses. Definisi metrik dashboard, format export, pagination, filter pencarian dan desain visual belum lengkap.

## 5. Aturan bisnis yang eksplisit

Sumber: hlm. 41–42 dan Tabel 3.3–3.5, hlm. 45–48.

1. Fraud Analyst mengajukan kasus beserta informasi, identifier, dan evidence pendukung.
2. Kasus baru berstatus PENDING.
3. File evidence tersimpan off-chain; hash dan record terkait dicatat on-chain.
4. Organisasi pengaju tidak boleh memberikan vote untuk kasusnya sendiri.
5. Setiap organisasi hanya satu vote untuk kasus yang sama pada tahap validasi yang sama. Batasnya organisasi, bukan akun analis.
6. Keputusan vote adalah APPROVE atau REJECT, dengan alasan wajib.
7. Voting mensyaratkan kewenangan yang sesuai dan kasus dalam kondisi yang dapat divalidasi; alur utama menyebut PENDING.
8. Vote dicatat, tally diperbarui, kemudian status dievaluasi berdasarkan threshold. Jika belum tercapai, kasus tetap PENDING.
9. Status akhir belum konsisten antarbagian proposal; jangan menetapkan enum final tanpa penyelesaian konflik.
10. Submit gagal apabila input wajib tidak valid, upload tidak memenuhi ketentuan/gagal, penyimpanan gagal, atau transaksi blockchain gagal. Kasus tidak boleh dianggap sukses pada kegagalan tersebut.
11. Voting ditolak pada self-vote, vote organisasi ganda per tahap, status tidak sesuai, keputusan/alasan tidak lengkap, atau pencatatan gagal.
12. Pencarian tanpa kecocokan menampilkan hasil kosong, bukan menciptakan kasus baru.

Registrasi (Gambar 3.7): pemohon mengirim data dan surat tugas; backend memvalidasi dan menyimpan RegistrationRequest/file; OJK meninjau dan memberi keputusan. Approval diikuti pembuatan Organization dan akun FraudAnalyst awal. Rejection menyimpan status ditolak. Provisioning MSP/certificate/channel belum dijelaskan dalam sequence ini.

## 6. Data on-chain dan off-chain

Sumber: Gambar 3.11 dan uraian hlm. 51–52. Daftar berikut merangkum kelas dan atribut utama yang terlihat; bukan skema database final.

| Lokasi | Entity | Isi/tanggung jawab utama |
|---|---|---|
| On-chain | FraudCase | ID kasus, organisasi/pengguna pengaju, tipe fraud, claimed amount, deskripsi, status, waktu dan pengguna pembaruan |
| On-chain | FraudIdentifier | ID, caseId, label identifier, identifierHash, waktu; pencocokan hash |
| On-chain | EvidenceRecord | ID, caseId, referensi file off-chain, tipe evidence, pengunggah/organisasi, waktu, fileHash |
| On-chain | Vote | ID, caseId, organisasi/pengguna pemilih, tahap, keputusan, alasan, waktu |
| On-chain | VoteTally | Kasus/tahap, total pemilih eligible, approve/reject count, threshold, status tally, waktu pembaruan |
| Off-chain | User dan turunannya | User abstract dengan FraudAnalyst, ClaimStaff, OJKUser; organisasi, nama, email, password hash, status dan waktu |
| Off-chain | Organization | ID, nama, jenis, license number, MSP ID, status dan waktu |
| Off-chain | RegistrationRequest | Data pemohon/organisasi, surat tugas/path/hash, status, reviewer, waktu dan catatan review |
| Off-chain | EvidenceFile | File/object key, metadata berkas, hash, uploader, waktu dan kaitan kasus |

Catatan identifier pada diagram menyebut fleksibilitas jenis seperti NIK, nomor klaim, atau identitas lain; semua nilai pengujian tetap sintetis. Detail normalisasi, algoritma hash dan strategi pencarian belum ditetapkan.

Provenance wajib mempertahankan organisasi/waktu pengajuan, identifier/evidence terkait, organisasi pemilih, keputusan, alasan, tahap dan waktu voting, serta riwayat perubahan status. Class diagram belum menampilkan entity riwayat status yang terpisah; strategi history/event perlu dirancang agar kebutuhan tersebut tidak hanya bergantung pada current state.

## 7. Ketidakkonsistenan dan keputusan yang masih terbuka

| Isu | Bukti dalam proposal | Dampak implementasi |
|---|---|---|
| Status kasus | Bab 1 hlm. 5: PENDING/CONFIRMED/INVALID; hlm. 41: PENDING/APPROVED/REJECTED; hlm. 42 dan 47: APPROVED/INVALID; class diagram hlm. 51: PENDING/APPROVED/REJECTED/INVALID | Enum, UI, kontrak API, transisi chaincode dan pengujian belum dapat difinalkan |
| Tahap invalidasi | VoteStage pada class diagram memuat CASE_VALIDATION dan CASE_INVALIDATION; alur utama membahas validasi kasus PENDING | Trigger invalidasi, siapa yang mengajukan, eligible voters, evidence baru dan transisi akhir belum jelas |
| Threshold | VoteTally memuat threshold/eligible voters, tetapi tidak ada angka atau rumus operasional lengkap di Bab 1–3 | Perlu aturan approve/reject, pembulatan, denominator, tie, abstain, kasus menggantung dan perubahan anggota |
| Identitas aplikasi vs Fabric | Akun/organisasi off-chain; diagram jaringan memakai MSP/CA | Pemetaan session ke signer/sertifikat dan pengikatan organisasi belum dijelaskan |
| Keanggotaan | OJK approve/reject, kelola anggota; class diagram punya ACTIVE/SUSPENDED | Efek suspension pada login, read/write, vote lama dan eligible voters belum ditetapkan |
| Deployment | Gambar menunjukkan tiga insurer/tiga orderer, satu channel dan OJK observer | Kepemilikan orderer, peer/MSP OJK, bootstrap dan penambahan organisasi belum lengkap |
| Backend | Backend/API ada tanpa pilihan teknologi | Perlu bahasa/framework, interface API dan autentikasi |
| Evidence | S3-compatible local; file off-chain, hash on-chain | Produk storage, batas ukuran/tipe, download authorization, hash algorithm, versi evidence dan penanganan file yatim belum ditentukan |
| Query | Search/detail dan identifierHash ditampilkan | Kriteria exact/partial, normalisasi, indeks CouchDB dan akses per field belum lengkap |
| Nonfungsional | Responsif, terkontrol, dapat ditelusuri, prototipe | Tidak ada target numerik latensi/TPS, kapasitas, availability atau recovery |

Perbedaan APPROVE (keputusan vote) dan APPROVED (status kasus/registrasi) harus dipertahankan dalam pembahasan. INVALID sebagai status bisnis juga harus dibedakan dari transaksi Fabric yang invalid.

## 8. Implikasi engineering untuk pekerjaan berikutnya

Bagian ini merupakan analisis, bukan requirement tambahan yang sudah disetujui:

- Chaincode perlu menjadi tempat penegakan aturan organisasi, self-vote, keunikan vote per tahap dan transisi status; tombol UI saja tidak cukup mewakili aturan bersama.
- Backend perlu mengikat identitas login ke identitas organisasi yang sah, mengatur akses data/file dan menunggu hasil commit sebelum melaporkan transaksi berhasil.
- Penyimpanan file dan transaksi Fabric membutuhkan penanganan kegagalan parsial; submit ulang tidak boleh menggandakan kasus/vote atau menganggap file yang belum terikat sebagai kasus sukses.
- Vote bersamaan dan perubahan tally harus dipertimbangkan dalam desain konkurensi serta hasil transaksi.
- Penyimpanan hash evidence memberi dasar pemeriksaan integritas; definisi algoritma dan alur verifikasinya masih perlu ditetapkan.
- Data historis perlu menyimpan konteks keputusan dan aturan yang digunakan agar perubahan keanggotaan/threshold kelak tidak mengaburkan alasan hasil sebelumnya.

## 9. Metode pengembangan dan evaluasi

Proposal memilih Iterative and Incremental Development, Requirements Engineering, OOAD dan UML (use case, deskripsi use case, sequence, class). Kebutuhan diperoleh melalui studi literatur, survei purposive sampling yang direncanakan 15–30 responden, serta pemodelan data sintetis (Bab 1 hlm. 7–8; Bab 2 hlm. 10–14).

Evaluasi utama adalah pengujian fungsional terhadap sharing, validasi antarorganisasi, hak akses dan provenance. Hipotesis kerja berupa keberhasilan prototipe, bukan pengujian statistik populasi atau bukti penurunan fraud di dunia nyata.

Turunan skenario uji yang relevan untuk tahap implementasi:

- Registrasi disetujui/ditolak dan akun awal hanya terbentuk setelah approval.
- Analyst berhasil submit dengan evidence; field/file invalid dan kegagalan commit tidak dilaporkan sukses.
- Claim Staff dapat mencari/melihat namun tidak submit/vote; OJK tidak vote.
- Organisasi pengaju ditolak saat self-vote; dua akun organisasi yang sama tidak menghasilkan dua vote pada tahap sama.
- APPROVE/REJECT beserta alasan tersimpan; threshold mengubah status sesuai aturan final; sebelum threshold status PENDING.
- Riwayat sumber, evidence, vote, alasan dan perubahan status dapat ditelusuri.
- Hash berkas dapat dibandingkan dengan record; akses berkas dibatasi sesuai hak pengguna.

Belum ada implementasi aplikasi atau perubahan proposal dilakukan dalam tugas pembacaan ini. Dokumen ini menjadi catatan awal proyek; keputusan terbuka perlu diselaraskan sebelum kontrak data dan chaincode difinalkan.
