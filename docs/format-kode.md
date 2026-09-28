# Format kode

Pemformatan menjaga logika, teks antarmuka, dan desain tetap sama.

JavaScript, TypeScript, TSX, CSS, JSON, YAML, dan shell memakai Prettier:

```powershell
npm run format
npm run format:check
```

Aturan ada di `.prettierrc.json`: dua spasi, lebar target 100 karakter, dan
baris LF. `.prettierignore` mengecualikan dependency, aset, data runtime,
berkas hasil generate, serta lockfile.

Python memakai Black (instal dengan `python -m pip install black`):

```powershell
python -m black scripts/create-evidence-fixtures.py
python -m black --check scripts/create-evidence-fixtures.py
```

Chaincode memakai gofmt dari direktori proyek di WSL:

```bash
gofmt -w chaincode/main.go chaincode/regulator_test.go
cd chaincode
go test ./...
```

Python di dalam heredoc shell sudah dirapikan dan dibandingkan AST-nya.
Prettier mempertahankan isi heredoc dan template literal; jika bagian tersebut
diedit, periksa format sesuai bahasa yang tertanam di dalamnya.

Pemeriksaan aplikasi:

```powershell
npm run typecheck
npm test
node scripts/check-portals.mjs
node scripts/check-role-revision.mjs
node scripts/check-evidence-access.mjs
```

Tiga skrip terakhir membutuhkan layanan aplikasi dan jaringan yang menyala.
Pemformatan chaincode tidak memerlukan upgrade deployment atau reset ledger.
