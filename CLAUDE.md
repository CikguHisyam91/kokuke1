# KokoSmart Pro — panduan untuk Claude

Sistem pengurusan kokurikulum SK King Edward VII (1) Taiping.
Pemilik ialah seorang guru yang **tidak tahu kod** — terangkan dalam Bahasa Melayu yang mudah,
dan beri arahan langkah demi langkah (gaya "padam semua & tampal semula").

## Struktur
- `index.html` — keseluruhan paparan (HTML + CSS + JS dalam satu fail), dihoskan di GitHub Pages dari `main`.
- `config.js` — URL Web App Apps Script (`KOKO_API`).
- `sw.js` — service worker. **Naikkan nombor `CACHE`** setiap kali fail paparan berubah.
- `logo.png` — logo rasmi sekolah (WAJIB digunakan dalam semua laporan). `icon-*.png` — ikon aplikasi.
- Data dalam Google Sheet; API ialah Apps Script (`Code.gs`, `Data.gs`, `Simpan.gs`) yang **tidak** disimpan
  dalam repo ini. Pengguna menampalnya sendiri ke Apps Script, kemudian Deploy → Manage deployments → New version.

## Kebenaran pemilik
- **Claude dibenarkan merge pull request ke `main` sendiri** selepas perubahan diuji (pemilik memberi kebenaran ini).
- Jangan sekali-kali commit kata laluan sistem atau `Code.gs` (mengandungi kata laluan asal) ke repo.

## Sebelum merge
- Semak sintaks JS (`node --check` pada blok `<script>`).
- Uji dalam Chromium (Playwright) dengan data palsu: intercept `https://script.google.com/**`,
  log masuk, buka setiap menu melalui `tukarMenu(...)`, pastikan tiada `pageerror`.
