# KokoSmart Pro — panduan untuk Claude

Sistem pengurusan kokurikulum SK King Edward VII (1) Taiping.
Pemilik ialah seorang guru yang **tidak tahu kod** — terangkan dalam Bahasa Melayu yang mudah,
dan beri arahan langkah demi langkah (gaya "padam semua & tampal semula").

## Struktur
- `index.html` — keseluruhan paparan (HTML + CSS + JS dalam satu fail), dihoskan di GitHub Pages dari `main`.
- `config.js` — URL Web App Apps Script (`KOKO_API`).
- `sw.js` — service worker. **Naikkan nombor `CACHE`** setiap kali fail paparan berubah.
- `logo.png` — logo rasmi sekolah (WAJIB digunakan dalam semua laporan). `icon-*.png` — ikon aplikasi.
- Data dalam Google Sheet; API ialah Apps Script: `Code.gs`, `Data.gs`, `Simpan.gs` (**tidak** disimpan dalam repo
  kerana `Code.gs` mengandungi kata laluan asal) dan `apps-script/Rekod.gs` (disimpan dalam repo, tiada rahsia).
  Pengguna menampalnya sendiri ke Apps Script, kemudian Deploy → Manage deployments → New version.
  Fungsi baharu mesti ditambah ke `senaraiApi()` dalam `Code.gs`, jika tidak ia ditolak oleh `doPost`.
  Code.gs pengguna mungkin telah dikemas kini oleh sesi lain — jangan minta pengguna ganti seluruh Code.gs;
  beri arahan tambah baris sahaja.

## Reka bentuk & susunan (pilihan pemilik)
- Gaya **Claymorphism**, font **Urbanist**, semua huruf besar, mod siang/malam (token warna pada `body[data-theme]`).
- Laman utama = "Pusat Sehenti Kokurikulum": 6 ruang ikut aliran kerja PK Kokurikulum (`RUANG`, `JUBIN` dalam index.html).
- Modul baharu dijana daripada definisi `MODUL` (Takwim, Mesyuarat, Surat, Unit, Program, Kewangan, Kursus, Aset, Rujukan);
  setiap modul = satu sheet "KOKO - <SHEET>" melalui `Rekod.gs`. Tajuk lajur = label medan, jadi jangan tukar label sesuka hati.
- `SOP` = 13 proses kerja daripada Fail Meja PK Kokurikulum (tcer.my); "Mulakan program" menjadikannya senarai semak program.

## Kebenaran pemilik
- **Claude dibenarkan merge pull request ke `main` sendiri** selepas perubahan diuji (pemilik memberi kebenaran ini).
- **Automatik:** selepas setiap perubahan siap & diuji, terus push, buka PR dan merge ke `main` — jangan tanya pemilik dahulu.
- Jangan sekali-kali commit kata laluan sistem atau `Code.gs` (mengandungi kata laluan asal) ke repo.

## Sebelum merge
- Semak sintaks JS (`node --check` pada blok `<script>`).
- Uji dalam Chromium (Playwright) dengan data palsu: intercept `https://script.google.com/**`,
  log masuk, buka setiap menu melalui `tukarMenu(...)`, pastikan tiada `pageerror`.
