---
name: kokosmart
description: Cara kerja standard untuk sebarang perubahan KokoSmart Pro (index.html, semak.html, config.js, sw.js, apps-script/*.gs) — penerangan kepada pemilik, reka bentuk, ujian, PR & merge automatik, dan arahan Apps Script. Guna setiap kali pemilik minta tambah/baiki ciri, modul, laporan atau paparan.
---

# Cara kerja KokoSmart Pro

Baca `CLAUDE.md` dahulu (struktur, modul, keputusan pemilik). Skill ini ialah **aliran kerja**.

## 1. Bercakap dengan pemilik
- Pemilik = PK Kokurikulum, **tidak tahu kod**. Jawab dalam **Bahasa Melayu mudah**, ringkas, bernombor.
- Arahan Apps Script/Sheet: gaya **"padam semua & tampal semula"** atau "tambah baris ini", langkah demi langkah
  (menu mana, butang mana). Jangan suruh ganti seluruh `Code.gs` — beri baris untuk `senaraiApi()` sahaja.
- Sebelum ubah **Apps Script**: beri taklimat ringkas & tunggu kelulusan. Perubahan `index.html` sahaja: terus buat.
- Hanya cadang alat **percuma** (Google Sheet, Apps Script, GitHub Pages/Vercel).
- Jika pemilik tampal fail ke projek yang salah (cth. Semakan.gs ke projek utama — `doGet/doPost` bertindih), beri amaran segera.
- Akhiri dengan: apa berubah, "tekan Ctrl+Shift+R", dan apa yang pemilik perlu semak sendiri (jika tidak dapat diuji dengan data sebenar).

## 2. Reka bentuk
- Gaya Bento, Urbanist, huruf besar, token warna `body[data-theme]`, mesra telefon, tidak serabut.
- Guna semula: `pastiModal(id)` (set `el._kunci=true` untuk borang supaya tidak tertutup bila klik luar),
  `paparKertas`/`kepalaKertas` untuk cetak (WAJIB logo), `toast`, `showLoad/hideLoad`, `barMula/barTamat`, `esc`, `sama`, `jantina(nama)`.
- Kad/bar statistik: jadikan **boleh ditekan** (drill-down ke senarai).
- Simpan terasa pantas: kemas kini `dc`/`dr` tempatan dahulu, hantar ke pelayan di latar (panggilan serentak), amaran jika gagal.
- Modul baharu: tambah ke `MODUL` (sheet "KOKO - <SHEET>" via Rekod.gs). Label medan = tajuk lajur, jangan tukar.
- Elak ID HTML berganda dan nama fungsi berganda (`grep -n "function nama("` dahulu).

## 3. Langkah setiap perubahan
1. `git pull origin main` pada cawangan kerja.
2. Edit (Python replace dengan `assert a in s` untuk tampalan tepat).
3. Naikkan `CACHE` dalam `sw.js` (`kokosmart-vNN` +1).
4. Semak sintaks setiap blok `<script>`:
   ```bash
   python3 -c "import re;s=open('index.html').read()
   for i,b in enumerate(re.findall(r'<script>(.*?)</script>',s,re.S)):open(f'/tmp/s{i}.js','w').write(b)"
   for f in /tmp/s[0-9]*.js; do node --check $f || echo BAD $f; done
   ```
5. Uji dalam Chromium dengan data palsu:
   ```bash
   (setsid nohup python3 -m http.server 8765 >/dev/null 2>&1 &)
   node .claude/skills/kokosmart/uji.js            # semua menu
   node .claude/skills/kokosmart/uji.js home jawatankuasa   # menu tertentu
   ```
   `uji.js` memintas `script.google.com/**`, log masuk, buka menu, lapor `pageerror`. Salin & tambah langkah khusus
   (klik, isi borang, rakam panggilan API) untuk ciri baharu. Simpan tangkap skrin di luar repo.
6. Commit (dengan baris atribusi sesi) → push → buka PR ke `main` → **merge sendiri** (pemilik benarkan) — jangan tanya.

## 4. Keselamatan & data
- JANGAN commit `Code.gs`, kata laluan, `PORTAL_ID`, `DATA_ID`, nama murid sebenar, MyKid.
- Rahsia di Apps Script → **Script Properties**.
- Data peribadi (APDM, MyKid) diproses dalam Google Sheet pemilik; nasihat padam tab sementara selepas guna.
- Transisi tahun: jangan jalankan sebenar sebelum Januari; `simulasiTransisi()` untuk pratonton/cetak.

## 5. Modul 12 perjumpaan
`MODUL_LALAI_KELAB/UNIFORM/SUKAN`: setiap unit = 12 baris `[aktiviti, objektif, kekuatan, kelemahan, penambahbaikan]`.
Jika pemilik beri kandungan modul rasmi (cth. 12 skop), susun ikut urutan itu. `isiModulLalai(kat)` menambah yang
tiada dan menawarkan ganti perjumpaan yang berbeza.
