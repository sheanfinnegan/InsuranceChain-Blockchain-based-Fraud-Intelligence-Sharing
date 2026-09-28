# Peer OJK mandiri — review dan hasil migrasi

Tanggal: 28 September 2026. Channel `insurance` dipertahankan; tidak dibuat ulang. Identitas regulator tetap `OJKMSP`. Tidak ada perubahan komponen frontend, CSS, atau desain portal.

## Hasil review

Sebelum migrasi, OJK sudah tercantum dalam konfigurasi channel dan memiliki CA serta identitas admin/client, tetapi template cryptogen OJK memiliki Count 0. Docker Compose tidak menyediakan peer/CouchDB OJK. `lib/fabric.ts` mengganti tujuan `ojk` menjadi `org1`, sehingga aplikasi OJK mengakses Gateway insurer. Tidak ada connection profile terpisah; alamat koneksi sebelumnya ditanam langsung dalam file tersebut.

Keanggotaan channel berbeda dari peserta voting aplikasi. Chaincode membaca daftar `members` untuk menyusun snapshot peserta setiap putaran. `OJKMSP` dapat membaca kasus dan menjalankan `Init`/`SetMember`, tetapi tidak diizinkan mengajukan kasus, voting, atau invalidasi. `SetMember` juga tidak menerima OJK sebagai insurer baru. Aturan ini sudah benar dan tidak diubah; regresinya ditambahkan dalam `chaincode/regulator_test.go`.

## Topologi sesudah migrasi

| Komponen | Konfigurasi |
| --- | --- |
| MSP | `OJKMSP` |
| Peer / Gateway | `peer0.ojk.insurance.local:7051` |
| Endpoint aplikasi Windows | `localhost:14051` |
| Container peer | `ic-peer-ojk` |
| Volume ledger | `insurancechain_peer-ojk` → `/var/hyperledger/production` |
| Container world state | `ic-couch-ojk` |
| Volume CouchDB | `insurancechain_couch-ojk` → `/opt/couchdb/data` |
| Channel | `insurance` |
| Chaincode | `insurance`, version **3**, sequence **3** |
| Package ID | `insurance_3:5815ddd7b6d22c78a0031df43b927f775e328e2897c0ea6d6cab08c3fc31bcc0` |
| Sertifikat peer | `.runtime/crypto/peerOrganizations/ojk.insurance.local/peers/peer0.ojk.insurance.local/{msp,tls}` |

Cryptogen **extend** memakai CA yang sudah ada. Checksum semua file crypto lama diperiksa setelah extend untuk memastikan tidak diganti. Anchor peer OJK ditambahkan melalui update konfigurasi channel yang ditandatangani admin OJK. MSP dan endorsement policy channel tidak diganti.

Peer OJK bergabung memakai blok genesis channel yang sudah berjalan, lalu menerima blok historis dari ordering service dan membentuk world state sendiri. Paket chaincode yang sama dengan Org1 dipasang dan disetujui oleh OJK pada sequence yang sudah committed. Tidak diperlukan upgrade sequence hanya untuk menambahkan instalasi/approval organisasi OJK.

## Koneksi aplikasi

`config/fabric-network.json` adalah profil koneksi ringan yang digunakan SDK Gateway aplikasi (bukan format legacy SDK connection profile). `lib/fabric-config.ts` memetakan enam MSP ke endpoint dan hostname TLS masing-masing. Endpoint dapat dioverride dengan `FABRIC_ORG1_ENDPOINT` hingga `FABRIC_ORG5_ENDPOINT`, serta `FABRIC_OJK_ENDPOINT`. Sertifikat TLS selalu milik organisasi tujuan; nama server TLS OJK tetap `peer0.ojk.insurance.local`.

`lib/fabric.ts` kini memakai konfigurasi tersebut dan tidak mempunyai fallback OJK → Org1. Query OJK menetapkan `endorsingOrganizations: ['OJKMSP']`; SDK mengirimnya sebagai target organisasi Evaluate. Dengan demikian pembacaan harus dilakukan pada Peer OJK. Jika OJK tidak tersedia, operasi gagal; tidak dialihkan ke insurer.

Transaksi governance melalui Gateway OJK tetap memakai discovery endorsement sesuai kebijakan channel. Kebijakan teknis yang sudah ada, `OutOf(2, Org1MSP.peer, Org2MSP.peer, Org3MSP.peer)`, dipertahankan. Ini **bukan voting bisnis**. Kehadiran peer OJK tidak mengubah N atau threshold bisnis, dan OJK tidak diwajibkan sebagai endorser transaksi.

Log aplikasi mencatat `gatewayPeer` dan `gatewayEndpoint` untuk audit rute koneksi. Field tersebut opsional agar log lama tetap kompatibel. UI tidak diubah.

## Skrip deployment yang diperbarui

- `network-config.mjs`: menghasilkan satu peer OJK, anchor, CouchDB, port dan volume khusus dalam Compose.
- `fabric-env.sh`: konfigurasi CLI organisasi 1–5 dan OJK.
- `provision-ojk-peer.sh`: extend crypto, update anchor jika diperlukan, start container OJK, join channel jika belum, lalu sinkronkan chaincode dan query lokal. Dapat dijalankan ulang.
- `sync-peer-chaincode.sh`: membaca definisi committed dan approved Org1, memverifikasi package ID yang tepat, menunggu catch-up peer, memasang dan approve hanya bila diperlukan. Mendukung definisi saat ini dengan policy channel default, tanpa collections atau init-required; konfigurasi lain dihentikan secara eksplisit untuk ditangani, bukan diam-diam diganti.
- `network-up.sh`: menyiapkan crypto tambahan sebelum Compose, memasukkan Org4/5, lalu memprovisikan OJK.
- `add-organizations.sh`: memakai sequence yang benar-benar committed, tidak lagi hardcode versi 3 untuk peer tambahan.
- `upgrade-chaincode.sh`: setelah commit upgrade, menyinkronkan peer tambahan yang berjalan, termasuk OJK. Vendor test diperbarui sebelum menjalankan tes Go.
- `configure.mjs`: menambahkan default `FABRIC_OJK_ENDPOINT=localhost:14051` bila belum ada, tanpa mengganti kredensial.

## Verifikasi yang telah dilakukan

| Pemeriksaan | Hasil |
| --- | --- |
| Query lokal CLI dari Peer OJK dan Org1 | Isi 21 kasus identik |
| Tinggi dan hash blok | Sama, height **88**, hash `afeFKlA6tKMpJkhKn9SQ4oYzLLMW/ieM0WbP0zSgf5M=` saat pemeriksaan |
| Volume peer dan CouchDB | Terpisah dari semua insurer |
| Approval chaincode OJK | `true`, version 3 / sequence 3 |
| Restart Peer OJK | Seluruh 21 kasus tetap identik |
| Gateway aplikasi OJK | `localhost:14051`, hostname TLS OJK |
| Endpoint OJK sengaja tidak tersedia dalam proses tes | Gagal tanpa fallback |
| Evaluasi pembuatan putaran baru oleh insurer | N=5, threshold=4; tidak disubmit |
| Upaya OJK submit/vote/invalidate / mendaftar sebagai insurer | Ditolak chaincode |
| Governance SetMember | Evaluasi lokal dan endorsement lewat Gateway OJK berhasil, **tanpa submit/commit** |
| Unit test status organisasi | Suspend insurer mengubah N berikutnya; snapshot putaran lama tetap; non-OJK tidak dapat governance |
| Login tiga portal, role restriction, evidence | Lulus, ledger sehat |
| TypeScript dan 12 tes otomatis | Lulus |

Tidak dibuat kasus, suara, atau perubahan status organisasi baru untuk verifikasi ini. Approval lifecycle OJK dan update anchor adalah transaksi konfigurasi yang diperlukan untuk migrasi. Uji commit governance sengaja tidak dilakukan setelah penolakan pemeriksaan persetujuan otomatis atas transaksi uji persisten; fungsi diperiksa dengan evaluate, endorse tanpa submit, dan tes mock.

Laporan mesin dan snapshot pemeriksaan disimpan di `.runtime/ojk-verification/`. Artefak lokal tersebut tidak masuk Git. Tinggi blok bisa bertambah ketika aplikasi digunakan.

## Menjalankan kembali

Untuk pemakaian harian, perintah Compose yang sudah ada kini otomatis mencakup peer/CouchDB OJK:

```powershell
cd "C:\Users\shean\Documents\ChatGPT\Skripsi InsuranChain"
wsl -d Ubuntu --cd "/mnt/c/Users/shean/Documents/ChatGPT/Skripsi InsuranChain" -- docker compose --env-file .env.local -f infra/compose.yaml up -d
npm run dev
```

Untuk mengulang pemeriksaan (tidak mengubah ledger):

```powershell
node --env-file=.env.local --import tsx scripts/check-ojk-gateway.ts
node --env-file=.env.local --import tsx scripts/check-ojk-endorsement.ts
wsl -d Ubuntu --cd "/mnt/c/Users/shean/Documents/ChatGPT/Skripsi InsuranChain" -- bash scripts/verify-ojk-ledger.sh
```

`check-ojk-restart.sh` tersedia untuk uji persistensi; skrip ini melakukan restart singkat hanya pada Peer OJK. `provision-ojk-peer.sh` ditujukan untuk channel yang sudah ada. Untuk instalasi baru, buat konfigurasi dengan `node scripts/configure.mjs` dan `node scripts/network-config.mjs`, lalu jalankan `network-up.sh`; inisialisasi data bisnis tetap merupakan langkah terpisah.

Referensi lifecycle dan perluasan sertifikat: [Hyperledger Fabric lifecycle deployment](https://hyperledger-fabric.readthedocs.io/en/release-2.5/deploy_chaincode.html), [cryptogen](https://hyperledger-fabric.readthedocs.io/en/release-2.5/commands/cryptogen.html).
