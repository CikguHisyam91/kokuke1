// ============================================================
// KOKOSMART PRO — Rekod.gs (BAHAGIAN 4)
// Penyimpanan modul Pusat Sehenti: Takwim, Mesyuarat, Surat, Unit,
// Program, Kewangan, Kursus, Aset dan Dokumen Rujukan.
// Setiap modul disimpan dalam sheet sendiri bernama "KOKO - <MODUL>".
// Baris 1 = tajuk lajur (boleh dibaca terus oleh guru dalam Google Sheet).
// ============================================================

var AWALAN_SHEET_REKOD = 'KOKO - ';

function _sheetRekod(modul) {
  var nama = AWALAN_SHEET_REKOD + String(modul || '').toUpperCase().trim();
  if (nama === AWALAN_SHEET_REKOD) throw new Error('Nama modul kosong');
  var ss = getSS();
  var sh = ss.getSheetByName(nama);
  if (!sh) {
    sh = ss.insertSheet(nama);
    sh.getRange(1, 1, 1, 2).setValues([['ID', 'DIKEMASKINI']]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#d9e2f3');
  }
  return sh;
}

// Pastikan semua tajuk lajur wujud; tambah lajur baharu di hujung jika perlu.
function _tajukRekod(sh, labelPerlu) {
  var lastCol = Math.max(sh.getLastColumn(), 2);
  var tajuk = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h).trim().toUpperCase(); });
  var tambah = [];
  labelPerlu.forEach(function (l) {
    l = String(l).trim().toUpperCase();
    if (l && tajuk.indexOf(l) < 0 && tambah.indexOf(l) < 0) tambah.push(l);
  });
  if (tambah.length) {
    sh.getRange(1, tajuk.length + 1, 1, tambah.length).setValues([tambah]).setFontWeight('bold').setBackground('#d9e2f3');
    tajuk = tajuk.concat(tambah);
  }
  return tajuk;
}

function _barisRekod(tajuk, rekod, idLama) {
  var masa = Utilities.formatDate(new Date(), getSS().getSpreadsheetTimeZone() || 'Asia/Kuala_Lumpur', 'dd/MM/yyyy HH:mm');
  var peta = {};
  Object.keys(rekod || {}).forEach(function (k) { peta[String(k).trim().toUpperCase()] = rekod[k]; });
  return tajuk.map(function (h) {
    if (h === 'ID') return String(peta.ID || idLama || '');
    if (h === 'DIKEMASKINI') return masa;
    var v = peta[h];
    if (v === null || v === undefined) return '';
    return typeof v === 'object' ? JSON.stringify(v) : String(v);
  });
}

// Baca SEMUA modul sekali gus: { success, modul: { TAKWIM: { h:[tajuk], r:[[...],...] }, ... } }
function dapatkanRekodModul() {
  try {
    var hasil = {};
    getSS().getSheets().forEach(function (sh) {
      var nama = sh.getName();
      if (nama.indexOf(AWALAN_SHEET_REKOD) !== 0) return;
      var modul = nama.slice(AWALAN_SHEET_REKOD.length).trim().toUpperCase();
      var lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
      if (lastCol < 1) return;
      var data = sh.getRange(1, 1, Math.max(lastRow, 1), lastCol).getDisplayValues();
      hasil[modul] = {
        h: data[0].map(function (h) { return String(h).trim().toUpperCase(); }),
        r: data.slice(1).filter(function (r) { return String(r[0]).trim() !== ''; })
      };
    });
    return { success: true, modul: hasil };
  } catch (e) { return { success: false, error: e.toString() }; }
}

// Tambah atau kemas kini satu rekod (dicari ikut ID)
function simpanRekodModul(modul, rekod) {
  try {
    if (!rekod || !rekod.ID) return { success: false, error: 'Rekod tiada ID' };
    var sh = _sheetRekod(modul);
    var tajuk = _tajukRekod(sh, Object.keys(rekod));
    var baris = _barisRekod(tajuk, rekod);
    var lastRow = sh.getLastRow(), cari = -1;
    if (lastRow > 1) {
      var ids = sh.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
      for (var i = 0; i < ids.length; i++) { if (String(ids[i][0]).trim() === String(rekod.ID)) { cari = i + 2; break; } }
    }
    var rowNo = cari > 0 ? cari : lastRow + 1;
    var rng = sh.getRange(rowNo, 1, 1, tajuk.length);
    rng.setNumberFormat('@'); // simpan sebagai teks: tarikh & nombor tidak ditukar oleh Google Sheet
    rng.setValues([baris]);
    return { success: true, id: rekod.ID };
  } catch (e) { return { success: false, error: e.toString() }; }
}

// Tambah banyak rekod sekali gus (contoh: isi semua unit daripada RUJUKAN)
function simpanRekodModulPukal(modul, senarai) {
  try {
    senarai = senarai || [];
    if (!senarai.length) return { success: true, bil: 0 };
    var sh = _sheetRekod(modul);
    var semuaKunci = [];
    senarai.forEach(function (r) { Object.keys(r).forEach(function (k) { if (semuaKunci.indexOf(k) < 0) semuaKunci.push(k); }); });
    var tajuk = _tajukRekod(sh, semuaKunci);
    var baris = senarai.map(function (r) { return _barisRekod(tajuk, r); });
    var rng = sh.getRange(sh.getLastRow() + 1, 1, baris.length, tajuk.length);
    rng.setNumberFormat('@');
    rng.setValues(baris);
    return { success: true, bil: baris.length };
  } catch (e) { return { success: false, error: e.toString() }; }
}

function padamRekodModul(modul, id) {
  try {
    var sh = _sheetRekod(modul);
    var lastRow = sh.getLastRow();
    if (lastRow > 1) {
      var ids = sh.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
      for (var i = ids.length - 1; i >= 0; i--) {
        if (String(ids[i][0]).trim() === String(id)) { sh.deleteRow(i + 2); return { success: true }; }
      }
    }
    return { success: false, error: 'Rekod tidak dijumpai' };
  } catch (e) { return { success: false, error: e.toString() }; }
}

// ===== TAMAT Rekod.gs =====
