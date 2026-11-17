// ============================================================
// KOKOSMART PRO — Simpanan.gs
// Simpanan (backup) data dalam Google Drive + lihat & pulihkan data tahun lepas.
// Setiap simpanan = SALINAN PENUH fail Google Sheet DATA MASTER, disimpan dalam folder
// Drive "KOKOSMART SIMPANAN" milik akaun yang menjalankan Apps Script. Fail ini berdiri sendiri.
// ============================================================

var FOLDER_SIMPANAN = 'KOKOSMART SIMPANAN';

function _smFolder() {
  var it = DriveApp.getFoldersByName(FOLDER_SIMPANAN);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_SIMPANAN);
}

function _smKataLaluan() {
  return (typeof kataLaluanSemasa === 'function')
    ? kataLaluanSemasa()
    : (PropertiesService.getScriptProperties().getProperty('SISTEM_KATA_LAUAN') || '');
}

function _smMasa(fmt) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone() || 'Asia/Kuala_Lumpur', fmt);
}

// Pastikan fail itu memang simpanan dalam folder KOKOSMART SIMPANAN (elak baca fail lain)
function _smFailSah(fileId) {
  var f = DriveApp.getFileById(String(fileId));
  var p = f.getParents();
  while (p.hasNext()) { if (p.next().getName() === FOLDER_SIMPANAN) return f; }
  throw new Error('Fail ini bukan simpanan KokoSmart.');
}

// Buat simpanan sekarang. catatan: contoh "SEBELUM TRANSISI 2027".
// Boleh dipanggil oleh fungsi lain (cth. Transisi.gs) dengan tahun.
function buatSimpanan(catatan, tahun) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var thn = String(tahun || new Date().getFullYear());
    var nama = 'KokoSmart Simpanan ' + thn + ' - ' + _smMasa('yyyy-MM-dd HHmm') + (catatan ? ' - ' + String(catatan).toUpperCase() : '');
    var salinan = DriveApp.getFileById(ss.getId()).makeCopy(nama, _smFolder());
    salinan.setDescription('Simpanan KokoSmart. Tahun data: ' + thn + '. ' + (catatan || ''));
    return { success: true, id: salinan.getId(), nama: nama, url: salinan.getUrl() };
  } catch (e) { return { success: false, error: e.toString() }; }
}

// Senarai semua simpanan (terbaru dahulu)
function senaraiSimpanan() {
  try {
    var out = [], it = _smFolder().getFiles();
    while (it.hasNext()) {
      var f = it.next();
      if (f.getMimeType() !== MimeType.GOOGLE_SHEETS) continue;
      var m = f.getName().match(/Simpanan\s+(\d{4})/i);
      out.push({ id: f.getId(), nama: f.getName(), tahun: m ? m[1] : '', tarikh: f.getDateCreated().getTime(), url: f.getUrl() });
    }
    out.sort(function (a, b) { return b.tarikh - a.tarikh; });
    return { success: true, data: out };
  } catch (e) { return { success: false, error: e.toString() }; }
}

// Baca data daripada satu simpanan (untuk paparan "tahun lepas" — baca sahaja)
function bacaSimpanan(fileId) {
  try {
    var f = _smFailSah(fileId);
    var ss = SpreadsheetApp.openById(f.getId());
    var tz = ss.getSpreadsheetTimeZone() || 'Asia/Kuala_Lumpur';
    function s(v) { if (v instanceof Date) return Utilities.formatDate(v, tz, 'dd/MM/yyyy'); return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
    function rows(nama, alt) {
      var sh = ss.getSheetByName(nama) || (alt ? ss.getSheetByName(alt) : null);
      if (!sh || sh.getLastRow() < 2) return [];
      return sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
    }
    function murid(r) { return { tahun: s(r[1]), kelas: s(r[2]), nama: s(r[3]), rumah: s(r[4]) || '-', uniform: s(r[5]) || '-', kelab: s(r[6]) || '-', sukan: s(r[7]) || '-' }; }
    var ruj = { rumah: [], uniform: [], kelab: [], sukan: [] };
    rows('DATA MASTER - RUJUKAN', 'RUJUKAN').forEach(function (r) {
      if (s(r[0])) ruj.rumah.push(s(r[0])); if (s(r[1])) ruj.uniform.push(s(r[1]));
      if (s(r[2])) ruj.kelab.push(s(r[2])); if (s(r[3])) ruj.sukan.push(s(r[3]));
    });
    return {
      success: true, nama: f.getName(), url: f.getUrl(),
      murid: rows('DATA MASTER - MASTER', 'MASTER').filter(function (r) { return s(r[3]); }).map(murid),
      arkib: rows('DATA MASTER - ARKIB', 'ARKIB').filter(function (r) { return s(r[3]); }).map(murid),
      rujukan: ruj,
      kehadiran: rows('DATA MASTER - KEHADIRAN').filter(function (r) { return s(r[4]); }).map(function (r) {
        return { tarikh: s(r[0]), kategori: s(r[1]), namaUnit: s(r[2]), perjumpaanKe: s(r[3]), namaMurid: s(r[4]), status: s(r[5]), tahunAliran: s(r[6]) };
      }),
      pencapaian: rows('DATA MASTER - PENCAPAIAN').filter(function (r) { return s(r[1]); }).map(function (r) {
        return { tarikh: s(r[0]), nama: s(r[1]), kategori: s(r[2]), peringkat: s(r[3]), pertandingan: s(r[4]), pencapaian: s(r[5]), mata: parseFloat(r[6]) || 0 };
      })
    };
  } catch (e) { return { success: false, error: e.toString() }; }
}

// Pulihkan MASTER (senarai murid) dan ARKIB daripada satu simpanan.
// Simpanan data semasa dibuat dahulu ("SEBELUM PULIH"), jadi tindakan ini boleh diundur.
// Kehadiran, pencapaian dan rekod lain TIDAK disentuh.
function pulihkanSimpanan(pwd, fileId) {
  try {
    var kunci = _smKataLaluan();
    if (!kunci || String(pwd || '').trim() !== String(kunci)) return { success: false, error: 'Kata laluan salah!' };
    var f = _smFailSah(fileId);
    var sumber = SpreadsheetApp.openById(f.getId());
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    var sebelum = buatSimpanan('SEBELUM PULIH');
    if (!sebelum.success) return { success: false, error: 'Simpanan keselamatan gagal: ' + sebelum.error };

    var hasil = {};
    [['DATA MASTER - MASTER', 'MASTER'], ['DATA MASTER - ARKIB', 'ARKIB']].forEach(function (n) {
      var src = sumber.getSheetByName(n[0]) || sumber.getSheetByName(n[1]);
      if (!src) return;
      var dst = ss.getSheetByName(n[0]) || ss.getSheetByName(n[1]) || ss.insertSheet(n[0]);
      var data = src.getDataRange().getValues();
      dst.clearContents();
      if (data.length) dst.getRange(1, 1, data.length, data[0].length).setValues(data);
      hasil[n[0]] = Math.max(0, data.length - 1);
    });
    return { success: true, murid: hasil['DATA MASTER - MASTER'] || 0, arkib: hasil['DATA MASTER - ARKIB'] || 0, simpananSebelum: sebelum.nama };
  } catch (e) { return { success: false, error: e.toString() }; }
}

// ===== TAMAT Simpanan.gs =====
