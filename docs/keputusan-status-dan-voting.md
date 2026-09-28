# Keputusan status dan voting InsuranceChain — v1

Tanggal: 26 September 2026. Acuan terbaru: klarifikasi pengguna dan enam diagram yang dilampirkan pada percakapan. Dokumen ini menggantikan ambiguitas status pada catatan pembacaan proposal. Pengguna menetapkan makna APPROVED/REJECTED dan INVALID serta meminta agent menentukan threshold. Detail kebijakan di bawah merupakan keputusan desain untuk prototipe, bukan klaim sebagai standar industri atau ketentuan Fabric.

## Status yang sudah diklarifikasi pengguna

- Validasi kasus baru: PENDING → APPROVED atau REJECTED.
- INVALID merupakan hasil proses case invalidation, bukan hasil penolakan validasi awal.
- Invalidation diajukan dengan alur serupa pengajuan baru: alasan, evidence, lalu voting lintas organisasi untuk menginvalidkan kasus.

## Kebijakan threshold yang ditetapkan

Gunakan minimal dua pertiga dari seluruh organisasi asuransi aktif yang terlibat dalam satu putaran, dibulatkan ke atas, untuk APPROVE maupun REJECT:

T = ceil(2 × N / 3)

N adalah jumlah organisasi asuransi aktif pada saat putaran dibuka. OJK tidak dihitung. Organisasi pengaju memberikan satu dukungan implisit APPROVE melalui tindakan submit dan tidak boleh memberikan vote tambahan. Organisasi lain memberikan vote eksplisit APPROVE atau REJECT. Satu organisasi memiliki bobot satu suara, terlepas dari jumlah analis atau peer. Putaran memerlukan N >= 3. Dalam implementasi integer Go untuk N positif: T = (2*N + 2)/3.

| Total insurer aktif (N) | Vote eksplisit yang tersedia | T untuk masing-masing keputusan |
|---|---:|---:|
| 3 | 2 | 2 |
| 4 | 3 | 3 |
| 5 | 4 | 4 |
| 6 | 5 | 4 |
| 7 | 6 | 5 |
| 10 | 9 | 7 |

Alasan: baseline konservatif yang meminta dukungan lintas organisasi lebih kuat daripada mayoritas sederhana pada banyak ukuran konsorsium, tetapi tidak selalu mensyaratkan unanimity. Pada tiga insurer, dukungan organisasi pengaju dan satu organisasi lain sudah memenuhi threshold. Ini tidak menjamin kebenaran evidence, independensi organisasi, ketahanan kolusi, atau Byzantine fault tolerance.

Denominator adalah seluruh organisasi aktif yang dibekukan pada awal putaran, bukan jumlah suara yang sudah masuk. Untuk CASE_VALIDATION, approveCount dimulai dari 1 sebagai dukungan implisit organisasi pengaju. APPROVE tercapai bila approveCount >= T, sedangkan REJECT tercapai bila rejectCount >= T. Selain itu hasil tetap PENDING. Tidak ada quorum tambahan karena T suara searah sudah memenuhi kebutuhan partisipasi minimal. Karena T > N/2, APPROVE dan REJECT tidak dapat sama-sama mencapai threshold jika setiap organisasi hanya memiliki satu posisi.

## Kebijakan putaran dan provenance

1. Simpan participantOrgIds, submittingOrgId, totalOrganizations, thresholdRequired, policyVersion, roundId, voteStage dan openedAt pada ledger ketika putaran dibuka. Membership harus dapat diverifikasi oleh chaincode, bukan daftar bebas yang dipercaya dari client. Dukungan implisit pengaju harus tercatat eksplisit pada provenance sebagai `SUBMISSION_SUPPORT`, bukan dibuat sebagai Vote kedua.
2. Anggota baru tidak masuk ke putaran berjalan. Threshold tidak berubah di tengah putaran. Organisasi suspended tidak boleh mengirim vote baru; posisi sah sebelum suspension dipertahankan dalam baseline ini beserta riwayatnya. Konsekuensinya putaran dapat tertahan dan harus ditampilkan secara jujur.
3. Satu vote immutable per (roundId, votingOrgId). Pengaju putaran tidak boleh vote; keputusan dan alasan wajib. Chaincode menegakkan semua aturan dan menolak suara setelah putaran final.
4. Tidak memilih tidak dihitung sebagai REJECT. Jika tidak ada threshold, tetap PENDING. Bila semua suara masuk tetapi terbelah, atau keputusan secara matematis tidak mungkin tercapai dengan sisa pemilih, tampilkan keterangan 'belum tercapai kesepakatan'. Tidak otomatis menurunkan threshold atau mengubahnya menjadi REJECTED.
5. Baseline prototipe tidak memakai keputusan otomatis karena timeout. Kelemahan liveness ini perlu menjadi bagian evaluasi. Deadline, pembatalan administratif, pembukaan ulang, dan penggantian electorate memerlukan policy lanjutan dengan riwayat baru, tidak mengubah vote lama.
6. Uji sensitivitas mayoritas sederhana, dua pertiga, dan unanimity dalam evaluasi dapat menjelaskan pilihan kebijakan; dua pertiga dipakai sebagai baseline implementasi, belum merupakan hasil optimasi empiris.

## Rancangan invalidation yang dipilih untuk melengkapi klarifikasi

Baseline: invalidation hanya terhadap kasus APPROVED. Fraud Analyst dari insurer aktif dapat mengajukan, termasuk organisasi pengaju kasus asli. Seperti submit kasus baru, organisasi pengaju invalidation memberikan satu dukungan implisit untuk menyetujui invalidasi dan tidak boleh memberikan vote kedua. Organisasi pengaju kasus asli boleh memberikan vote apabila bukan pengaju invalidation. Ini keputusan baseline, bukan aturan yang sudah tertulis lengkap dalam proposal.

Buat record InvalidationRequest terpisah yang merujuk caseId dan memiliki requestId, requesterOrgId, requesterUserId, reason, evidenceRefs, status, roundId dan timestamps. Tidak membuat FraudCase kedua yang kehilangan kaitan dengan kasus asal. Hanya satu permohonan invalidation aktif per kasus.

| Tahap | APPROVE mencapai T | REJECT mencapai T | Threshold belum tercapai |
|---|---|---|---|
| CASE_VALIDATION | Kasus APPROVED | Kasus REJECTED | Kasus PENDING |
| CASE_INVALIDATION | Request APPROVED; kasus INVALID | Request REJECTED; kasus tetap APPROVED | Request PENDING; kasus tetap APPROVED dengan penanda sedang ditinjau |

APPROVE pada CASE_INVALIDATION berarti menyetujui pembatalan validitas kasus. UI harus menggunakan label 'Setujui invalidasi' dan 'Tolak invalidasi' agar tidak tertukar dengan persetujuan fraud awal. INVALID tidak menghapus kasus, evidence, atau suara terdahulu. Seluruh rantai keputusan tetap dapat ditelusuri. Putaran invalidation memakai electorate baru pada waktu dibuka dan threshold yang sama; tidak memakai tally dari validasi awal.

Permohonan invalidation ulang setelah penolakan hanya dibuka dengan alasan/evidence baru dan request/round baru; aturan verifikasi kebaruan detail dapat dirinci pada implementasi. Tidak ada reaktivasi kasus INVALID dalam baseline ini.

## Perubahan yang diperlukan pada diagram/model

- Class diagram sudah tepat memuat FraudCaseStatus PENDING/APPROVED/REJECTED/INVALID dan VoteStage CASE_VALIDATION/CASE_INVALIDATION.
- Tambahkan InvalidationRequest dan identitas putaran. Unik (caseId, voteStage, orgId) saja tidak cukup jika invalidation dapat diajukan kembali.
- Vote dan VoteTally perlu roundId; tally menyimpan snapshot electorate dan versi policy, bukan hanya jumlah pemilih.
- Tambahkan use case pengajuan/review invalidation dan sequence yang mengacu pada requestId serta kasus asal.
- Pengecekan 'case masih PENDING' pada sequence voting berlaku untuk CASE_VALIDATION. CASE_INVALIDATION memeriksa request PENDING dan target case APPROVED.
- Evidence invalidation harus merujuk request/round terkait sehingga tidak tercampur dengan evidence validasi awal.
- Diagram baru memperjelas EvidenceRecord.evidenceHash dan EvidenceFile.fileHash; keduanya harus cocok. Catatan proposal sebelumnya merangkum hash secara generik.

## Batas antara business voting dan Fabric

Angka dua pertiga ini adalah keputusan desain business-level voting dalam chaincode. Endorsement policy mengatur pengesahan eksekusi transaksi dan merupakan konfigurasi terpisah. Dokumentasi resmi tidak menetapkan threshold keputusan fraud:
https://hyperledger-fabric.readthedocs.io/en/latest/endorsement-policies.html

## Contoh penerimaan

- Tiga insurer A/B/C; A submit dan memberi dukungan implisit; N=3, T=2. Satu APPROVE dari B atau C menghasilkan APPROVED. Jika B dan C sama-sama REJECT, kasus menjadi REJECTED. Jika B APPROVE dan C REJECT, hasil tetap APPROVED karena dukungan A+B mencapai threshold.
- Empat insurer A/B/C/D; A submit; N=4, T=3. Diperlukan dua APPROVE tambahan untuk APPROVED atau tiga REJECT dari organisasi lain untuk REJECTED.
- Lima insurer; A submit; N=5, T=4. Diperlukan tiga APPROVE tambahan untuk APPROVED atau empat REJECT untuk REJECTED.
- Invalidation disetujui mengubah APPROVED menjadi INVALID; invalidation ditolak tidak mengubah kasus menjadi REJECTED.
- Vote eksplisit dari pengaju putaran, OJK, Claim Staff, pemilih di luar snapshot, organisasi suspended, dan vote ganda ditolak.
- Anggota baru tidak mengubah N/T putaran berjalan; dua akun organisasi yang sama tetap memiliki satu suara.
