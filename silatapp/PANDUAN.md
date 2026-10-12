# SilatApp Pusat — Panduan Pemasangan (langkah demi langkah)

Fail dalam folder ini:
| Fail | Untuk apa |
|---|---|
| `apps-script/Code.gs` | Kod pelayan (API). Disalin ke **Apps Script**. |
| `index.html` | Laman sistem. Sudah ada di GitHub. |
| `config.js` | Tempat tampal URL Web App. |

---

## LANGKAH 1 — Cipta Google Sheet
1. Buka **sheets.google.com** → klik **Kosong (Blank)**.
2. Namakan fail: `SilatApp Pusat - Pangkalan Data`.

## LANGKAH 2 — Tampal kod Apps Script
1. Dalam Sheet tadi, klik menu **Extensions (Sambungan) → Apps Script**.
2. Padam SEMUA kod dalam `Code.gs`.
3. Buka fail `silatapp/apps-script/Code.gs` di GitHub → klik butang **Copy raw file** → tampal ke Apps Script.
4. Di bahagian paling atas, isi:
   ```
   var SUPER_ID = 'superadmin';        ← ID log masuk anda
   var SUPER_KATA = 'KataLaluanAnda1'; ← min 8 aksara
   var SUPER_NAMA = 'NAMA ANDA';
   var SUPER_TEL = '01xxxxxxxx';
   ```
5. Klik ikon **Simpan** (💾).

## LANGKAH 3 — Jalankan setup (sekali sahaja)
1. Di bar atas, pada kotak pilihan fungsi, pilih **setupPertama** → klik **Run (Jalankan)**.
2. Google akan minta kebenaran: **Review permissions** → pilih akaun anda → **Advanced** → **Go to ... (unsafe)** → **Allow**.
3. Tunggu sehingga log bawah tunjuk `BERJAYA! Super Admin ... dicipta`.
4. Kembali ke Sheet — anda akan nampak tab: NEGERI, GELANGGANG, PENGGUNA, SESI, AHLI, KEAHLIAN_GELANGGANG, YURAN_TAHUNAN, LOG_AUDIT, TETAPAN.
5. **PENTING:** kembali ke Apps Script, padam kata laluan: `var SUPER_KATA = '';` → **Simpan**.

## LANGKAH 4 — Deploy (terbitkan) API
1. Klik **Deploy → New deployment**.
2. Klik ikon ⚙ di sebelah "Select type" → pilih **Web app**.
3. Execute as: **Me** · Who has access: **Anyone**.
4. Klik **Deploy** → salin **Web app URL** (berakhir dengan `/exec`).

> Bila kod dikemas kini kemudian: **Deploy → Manage deployments → ✏ Edit → Version: New version → Deploy**.
> JANGAN guna "New deployment" lagi (URL akan berubah).

## LANGKAH 5 — Sambungkan laman
1. Di GitHub, buka `silatapp/config.js` → klik ✏ (Edit).
2. Padam semua, tampal:
   ```
   var SILAT_API = 'TAMPAL_URL_/exec_ANDA_DI_SINI';
   ```
3. Klik **Commit changes**.
4. Laman anda: `https://cikguhisyam91.github.io/kokuke1/silatapp/` (selepas digabung ke `main`).

---

## CARA UJI (Peringkat 1 & 2)
1. Buka laman → log masuk dengan ID Super Admin. ✅ Nampak Papan Pemuka.
2. Menu **Admin Negeri** → lantik Admin Kedah (cth. ID `adminkedah`).
3. Keluar → klik **Daftar Akaun Jurulatih** → isi, pilih **Kedah** → **+ Mohon gelanggang baharu** → `SERI MUTIARA` → tanda PDPA → Hantar.
4. Cuba log masuk sebagai jurulatih tadi → ✅ mesej "masih MENUNGGU".
5. Log masuk sebagai `adminkedah` → **Kelulusan** → isi kod `SMT` → **Lulus**.
6. Log masuk sebagai jurulatih → **+ Daftar Ahli** → masukkan No. KP → **Semak** → isi → Simpan. ✅ Dapat nombor `KDH-SMT-0001`.
7. Buka ahli → **Rekod Yuran**. Cuba rekod sekali lagi tahun sama → ✅ keluar AMARAN.
8. Cuba salah kata laluan 5 kali → ✅ akaun dikunci 15 minit.

## PERINGKAT 4 — Import dari sistem lama
> Pastikan gelanggang anda (cth. `KDH-SMT`) sudah diluluskan di Pusat dahulu.
1. Buka Sheet sistem lama → salin ID dari pautan: `https://docs.google.com/spreadsheets/d/`**`INI_ID_NYA`**`/edit`.
2. Di Apps Script Pusat, isi bahagian atas:
   ```
   var IMPORT_ID_SHEET_LAMA = 'INI_ID_NYA';
   var IMPORT_KOD_GELANGGANG = 'KDH-SMT';
   ```
3. Simpan → pilih fungsi **importSaya** → **Run**. (Kali pertama akan minta kebenaran lagi — Allow.)
4. Log tunjuk cth. `IMPORT SELESAI: {"ahliBaru":120,"ahliSedia":0,"yuranBaru":80,...}`.
5. Boleh jalan berulang kali — ahli yang sudah ada **tidak** akan berganda (padan ikut No. KP). ID lama disimpan dalam lajur `ID_LAMA`.
6. Sheet lama anda **hanya dibaca**, tidak diubah langsung.

## Peraturan penting
- No. ahli: `NEGERI-GELANGGANG-SIRI` (cth. `KDH-SMT-0001`), kekal seumur hidup walaupun berpindah.
- Gelanggang "aktif" = status AKTIF **dan** ada log masuk/rekod dalam 60 hari.
- Admin Negeri hanya nampak No. KP separa (`150512-08-****`).
- Hanya Super Admin boleh **Sekat** gelanggang dan lantik/buang Admin Negeri.
