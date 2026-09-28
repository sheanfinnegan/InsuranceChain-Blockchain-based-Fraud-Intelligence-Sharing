# Arsitektur dan batas implementasi

## Komponen dan alur transaksi

Next.js menyajikan antarmuka dan `/api/*` dari satu proses. API memeriksa sesi, role, organisasi, serta input sebelum memanggil penyimpanan off-chain atau Fabric Gateway. Gateway menggunakan identitas MSP organisasi pengguna. Sertifikat dan private key diambil dari `.runtime/crypto` pada server, bukan dikirim ke browser.

Penulisan melewati proposal → endorsement → ordering → validation → commit. Aplikasi menunggu status commit sebelum mengonfirmasi keberhasilan. Query menggunakan evaluate; pembacaan tidak menghasilkan blok baru. Aktivitas yang ditampilkan portal OJK adalah log integrasi aplikasi, bukan jaminan mencakup seluruh transaksi yang dikirim oleh client eksternal.

## Topologi

| Organisasi | MSP | Endpoint host | Penyimpanan |
| --- | --- | --- | --- |
| Nusantara | Org1MSP | localhost:17051 | peer1 + couch1 |
| Sentra | Org2MSP | localhost:19051 | peer2 + couch2 |
| Arunika | Org3MSP | localhost:11051 | peer3 + couch3 |
| Cakrawala | Org4MSP | localhost:12051 | peer4 + couch4 |
| Pradana | Org5MSP | localhost:13051 | peer5 + couch5 |
| OJK | OJKMSP | localhost:14051 | peer-ojk + couch-ojk |

Seluruh peer bergabung ke `insurance` dan menjalankan chaincode `insurance`. Tiga orderer menjalankan Raft. Endorsement teknis saat ini meminta dua dari tiga MSP awal; voting aplikasi menghitung perusahaan asuransi aktif dari state `members`. Penambahan peer bukan penambahan suara.

## Penyimpanan

| Data | Lokasi |
| --- | --- |
| Kasus, putaran, suara, event kasus, hash identifier, metadata evidence | Ledger / world state |
| Akun, sesi, registrasi, metadata file, nilai identifier terbaca, audit/log aplikasi | PostgreSQL |
| Byte evidence | RustFS / S3 |
| Sertifikat, private key, blok bootstrap, paket chaincode | `.runtime/`, hanya lokal |

PostgreSQL saat ini menyimpan state aplikasi dalam JSONB dengan transaksi dan row locking. File evidence diverifikasi menggunakan hash. Ledger tidak menyimpan byte berkas, namun tetap memuat deskripsi dan metadata yang mungkin sensitif. Seluruh anggota channel dapat menyimpan state on-chain; pembatasan portal bukan private data collection Fabric.

## Governance dan hak akses

OJK dapat menjalankan governance seperti `Init` dan `SetMember`, membaca melalui peer sendiri, serta mengaktifkan atau menangguhkan organisasi. OJK tidak boleh mengajukan kasus, voting, atau invalidasi. Snapshot peserta putaran tidak berubah ketika status organisasi berubah kemudian.

Claim staff hanya melihat kasus `APPROVED` atau `INVALID`; API evidence mengikuti pembatasan tersebut. Menu blockchain hanya tersedia untuk OJK dan API menolak role lain. Lihat `lib/role-access.ts`, `lib/fabric-config.ts`, dan `chaincode/regulator_test.go`.

## Batas implementasi saat ini

- Deployment ini berjalan pada satu host pengembangan. Volume terpisah membuktikan penyimpanan ledger mandiri, bukan isolasi operasional lintas lembaga atau ketahanan terhadap kehilangan host.
- Server menyimpan signing identity organisasi. Identitas bisnis pengguna dikelola oleh aplikasi; belum ada enrollment sertifikat Fabric individual bagi setiap pengguna.
- Sertifikat dihasilkan dengan cryptogen. Produksi memerlukan kebijakan pengelolaan kunci, rotasi sertifikat, backup, dan deployment antarhost yang dirancang terpisah.
- Akun awal dan data fixture diperuntukkan pengembangan. Jangan mengekspos instalasi dengan kredensial bawaan ke internet.
- Nama/NIK yang ditampilkan pada fixture adalah data buatan. Jangan memasukkan data identitas atau evidence asli ke repository publik.
- Label OJK pada portal adalah representasi regulator dalam penelitian, bukan bukti integrasi dengan sistem OJK.
- Image RustFS menggunakan tag `latest` pada konfigurasi saat ini; reproduksi yang ketat perlu mengunci digest image yang digunakan.

Tidak ada klaim audit keamanan, sertifikasi regulator, atau kesiapan produksi dalam repository ini.
