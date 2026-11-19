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
  kerana `Code.gs` mengandungi kata laluan asal) dan `apps-script/Rekod.gs`, `Transisi.gs`, `Simpanan.gs`, `Portal.gs` (disimpan dalam repo, tiada rahsia).
  Pengguna menampalnya sendiri ke Apps Script, kemudian Deploy → Manage deployments → New version.
  Fungsi baharu mesti ditambah ke `senaraiApi()` dalam `Code.gs`, jika tidak ia ditolak oleh `doPost`.
  Code.gs pengguna mungkin telah dikemas kini oleh sesi lain — jangan minta pengguna ganti seluruh Code.gs;
  beri arahan tambah baris sahaja.

## Reka bentuk & susunan (pilihan pemilik)
- Gaya **Bento** (kad rata, garis nipis, tanpa bayang), font **Urbanist**, semua huruf besar, mod siang/malam (token warna pada `body[data-theme]`). Pemilik mahu paparan ringkas, tidak serabut.
- Laman utama = infografik Bento: jumlah murid (ikut tahun), jumlah unit (rumah/uniform/kelab/sukan), analisis PAJSK (pilih tahun), kemudian menu ringkas 6 ruang (`RUANG`, `JUBIN`).
- Pemilik mahu taklimat/slaid dan kelulusan SEBELUM sebarang perubahan Apps Script.
- Modul baharu dijana daripada definisi `MODUL` (Takwim, Mesyuarat, Surat, Unit, Program, Kewangan, Kursus, Aset, Rujukan);
  setiap modul = satu sheet "KOKO - <SHEET>" melalui `Rekod.gs`. Tajuk lajur = label medan, jadi jangan tukar label sesuka hati.
- Transisi tahun baharu: logik dalam `simulasiTransisi()` (index.html); `jalankanTransisi()` menghantar pelan yang SAMA ke `laksanaTransisiTahun` (Transisi.gs). Sukan dipusing ikut `SUKAN_PUSINGAN`; Tahun 3→4 diagih seimbang; murid bukan Islam (tiada BIN/BINTI) tidak ke unit berunsur Islam.
- Simpanan: salinan penuh fail data ke folder Drive "KOKOSMART SIMPANAN" (`Simpanan.gs`); menu Simpanan & Tahun Lepas untuk lihat (baca sahaja) dan pulihkan MASTER+ARKIB (simpan "SEBELUM PULIH" dahulu).
- Sukan Tahunan (menu `sukantahunan`, fungsi `sk*`): 6 sheet melalui Rekod.gs (SUKAN KEJOHANAN/ACARA/PESERTA/KEPUTUSAN/MATA AWAL/REKOD). Mata individu 5-3-2-1, kumpulan 10-7-5-3; pingat tidak kira acara LAIN; rekod baru dikesan automatik (lompat/lontar = lebih jauh lebih baik). Data murid tahun lepas diimport melalui fail JSON (`KOKOSMART-SUKAN`) — nama murid TIDAK disimpan dalam repo.
- Portal Pengurusan Sekolah (`apps-script/Portal.gs`, `PORTAL_ID` dalam Script Properties): GURU dua hala dengan Senarai Guru KokoSmart (`simpanGuruPortal`: tambah, tukar nama + betulkan AHLI_JK, buang = Tidak Aktif; `senaraiGuruGabung`, `selarasGuru`); JAWATANKUASA+AHLI_JK (unit Kokurikulum) DUA HALA (`simpanJkPortal`, borang `jkEdit` dikunci PIN PK) → menu `jkguru`, cadangan guru (`semuaGuru()`), guru penasihat dalam Isi Laporan (`ptUnitJk()`). TAKWIM kategori Kokurikulum DUA HALA: modul `takwim` = baris Portal (ID `T###`) + maklumat tambahan dalam KOKO - TAKWIM ikut ID sama (`gabungTakwim`, `simpanTakwimDua`, `padamTakwimDua`). Tab TETAPAN Portal tidak dibaca.
- Koleksi OPR: 12 perjumpaan wajib (`OPR_WAJIB`, `jadualPerjumpaan` dari takwim). Perjumpaan dianggap hadir (`hsLaksana`) — acara sekolah ganti perjumpaan (Hari Sukan→sukan, Perkhemahan→uniform, Hari Keusahawanan→kelab); dikunci PIN PK (cincangan SHA-256 dalam KOKO - TETAPAN PK), rekod ditulis melalui `simpanKehadiranDanLaporanPukal` TANPA catatan 'dianggap hadir' (pemilik minta tiada remark); log dalam KOKO - HADIR SEMUA.
- OPR gaya B (Bento) dipilih pemilik: `obHtml`, `obKad`, `obBuka` (edit + tampal gambar), `obCadang` (refleksi auto: modul `modulunit` 12 perjumpaan jika ada, jika tidak ikut % hadir / pencapaian). Suntingan & gambar (dikecilkan <45k aksara, `obKecil`) dalam KOKO - OPR EDIT ikut `kunci`.
- Semakan ibu bapa: `semak.html` + `apps-script/Semakan.gs` (PROJEK APPS SCRIPT BERASINGAN, baca + tambah sijil sahaja, Script Property `DATA_ID`, URL dalam `SEMAK_API` config.js). MyKid + kelas mesti sepadan; had cubaan CacheService; tetapan SEMAK_* dalam KOKO - TETAPAN PK (menu Tetapan, PIN PK). Lajur MYKID dalam MASTER. Sijil ibu bapa: gambar ke folder Drive KOKOSMART SIJIL IBU BAPA + sheet KOKO - SIJIL IBU BAPA (modul `sijilibubapa`), PK sahkan (`sjSahkan` → simpanPencapaianDanLaporanPukal) / tolak.
- `SOP` = 13 proses kerja daripada Fail Meja PK Kokurikulum (tcer.my); "Mulakan program" menjadikannya senarai semak program.

## Kebenaran pemilik
- **Claude dibenarkan merge pull request ke `main` sendiri** selepas perubahan diuji (pemilik memberi kebenaran ini).
- **Automatik:** selepas setiap perubahan siap & diuji, terus push, buka PR dan merge ke `main` — jangan tanya pemilik dahulu.
- Jangan sekali-kali commit kata laluan sistem atau `Code.gs` (mengandungi kata laluan asal) ke repo.

## Sebelum merge
- Semak sintaks JS (`node --check` pada blok `<script>`).
- Uji dalam Chromium (Playwright) dengan data palsu: intercept `https://script.google.com/**`,
  log masuk, buka setiap menu melalui `tukarMenu(...)`, pastikan tiada `pageerror`.
