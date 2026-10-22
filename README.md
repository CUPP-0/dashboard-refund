# MTT Transaction Dashboard

Dashboard internal Next.js yang membaca data dari seluruh tab Google Sheets dan menampilkan ringkasan pembelian, refund, transfer, filter entitas, pencarian, grafik, dan ekspor CSV.

## 1. Prasyarat

- Node.js 20.9 atau lebih baru
- Akun Google yang memiliki akses ke spreadsheet
- Google Cloud project dengan Google Sheets API aktif
- Git dan akun GitHub

## 2. Siapkan Google Sheets API

1. Buka https://console.cloud.google.com/
2. Buat/pilih project.
3. Aktifkan **Google Sheets API**.
4. Buat service account di **IAM & Admin → Service Accounts**.
5. Buat key JSON untuk service account dan simpan dengan aman.
6. Buka spreadsheet yang dipakai, klik **Share**, lalu bagikan ke alamat email service account sebagai **Viewer**.
7. Jangan pernah mengunggah file key ke GitHub.

Spreadsheet ID yang sudah dipasang sebagai default berasal dari URL:
`1DLW9Qcb89n2qqop4F3wTSxVIWU4l9ezgeu3vU3UwGIo`

## 3. Jalankan secara lokal

```bash
npm install
copy .env.example .env.local
```

Di PowerShell, edit `.env.local` lalu isi:
- `GOOGLE_SHEETS_ID`
- `GOOGLE_SERVICE_ACCOUNT_JSON` dengan seluruh isi file JSON service account dalam satu baris, atau gunakan `GOOGLE_SERVICE_ACCOUNT_FILE=./service-account.json`
- `DASHBOARD_PASSWORD` dengan password yang kuat
- `SESSION_SECRET` dengan random secret minimal 32 karakter

Untuk menghasilkan secret di PowerShell:
```powershell
-join ((1..48) | ForEach-Object { "{0:x}" -f (Get-Random -Maximum 16) })
```

Jika memakai file lokal, simpan key sebagai `service-account.json` di root project dan pastikan file itu tidak di-commit.

Jalankan:
```bash
npm run dev
```
Buka http://localhost:3000

## 4. Push ke GitHub

Buat repository **private** kosong di GitHub bernama `mtt-transaction-dashboard`, lalu jalankan dari folder project:

```bash
git init
git add .
git commit -m "Initial MTT transaction dashboard"
git branch -M main
git remote add origin https://github.com/USERNAME/mtt-transaction-dashboard.git
git push -u origin main
```

Ganti `USERNAME` dengan username GitHub milikmu. Jangan pernah commit `.env.local` atau service-account JSON.

## 5. Deploy ke Vercel

1. Import repository GitHub ke Vercel.
2. Tambahkan Environment Variables berikut di Project Settings:
   - `GOOGLE_SHEETS_ID`
   - `GOOGLE_SERVICE_ACCOUNT_JSON` (tempel isi JSON service account lengkap)
   - `DASHBOARD_PASSWORD`
   - `SESSION_SECRET`
3. Deploy.
4. Setelah deployment, uji login, filter, total nilai, dan beberapa tab entitas.

## Catatan format data

Parser awal mencari baris header yang memuat `Nama Pekerja` dan `Nilai Pembelian`, lalu membaca transaksi di bawahnya. Ini dimaksudkan agar header yang muncul berulang dalam satu sheet dapat dilewati. Baris total seperti `TOTAL NOMINAL` juga dilewati.

Urutan kolom yang diasumsikan mengikuti screenshot: A nomor; B tanggal; C nama; D Nopek; F Trip Number; G Maskapai/Hotel; H Kode Booking; I Pembelian; J Refund; K Jumlah Transfer; L rekening; M perusahaan; N transfer; O keterangan; P/Q/R referensi.

**Penting:** format sheet perlu diuji dengan data asli karena beberapa tab mungkin punya posisi kolom berbeda, merge cells, atau subtotal. Dashboard ini hanya membaca data dan tidak mengedit spreadsheet. Data rekening dan data pekerja hanya ditampilkan kepada pengguna yang berhasil login; pastikan akses akun Google dan password dashboard dijaga.
