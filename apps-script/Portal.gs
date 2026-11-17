// ============================================================
// KOKOSMART PRO — Portal.gs
// Sambungan terus ke Google Sheet "Portal Pengurusan Sekolah" (Portal Tugas Guru).
//  - GURU                       : dibaca DAN ditulis (simpanGuruPortal: tambah, tukar nama, status)
//  - JAWATANKUASA, AHLI_JK (unit Kokurikulum): dibaca DAN ditulis (simpanJkPortal)
//  - TAKWIM (kategori Kokurikulum): dibaca DAN ditulis — edit di KokoSmart terus masuk ke Portal,
//    edit di Portal terus nampak di KokoSmart.
// Tab TETAPAN (kata laluan admin Portal) TIDAK dibaca.
// Akaun yang menjalankan Web App KokoSmart perlu ada akses Editor pada Sheet Portal
// (Viewer cukup untuk membaca, tetapi Editor diperlukan untuk menulis takwim).
// ============================================================

// ID Sheet Portal TIDAK disimpan di GitHub (repo awam). Tampal ID Sheet Portal di antara tanda petik di bawah
// selepas menampal fail ini ke Apps Script. ID = kod panjang dalam pautan .../spreadsheets/d/<ID>/edit
var PORTAL_ID = 'TAMPAL_ID_SHEET_PORTAL_DI_SINI';
var PORTAL_KAT_TAKWIM = 'Kokurikulum';

function _ptSS() {
  var id = PropertiesService.getScriptProperties().getProperty('PORTAL_ID') || PORTAL_ID;
  if (!id || /TAMPAL/.test(id)) throw new Error('ID Sheet Portal belum diisi dalam Portal.gs');
  return SpreadsheetApp.openById(id);
}
function _ptS(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
function _ptTgl(v, tz) {
  if (v instanceof Date) return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  return _ptS(v);
}
// Baca satu tab sebagai senarai objek ikut tajuk lajur baris 1
function _ptJadual(ss, nama) {
  var sh = ss.getSheetByName(nama);
  if (!sh || sh.getLastRow() < 2) return { sh: sh, h: [], rows: [] };
  var data = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
  var h = data[0].map(function (x) { return _ptS(x).toUpperCase(); });
  return { sh: sh, h: h, rows: data.slice(1) };
}
function _ptCol(h, nama) { return h.indexOf(nama); }

// Semua data Portal yang diperlukan KokoSmart (sekali panggil)
function dapatkanPortal() {
  try {
    var ss = _ptSS(), tz = ss.getSpreadsheetTimeZone() || 'Asia/Kuala_Lumpur';
    var G = _ptJadual(ss, 'GURU'), J = _ptJadual(ss, 'JAWATANKUASA'), A = _ptJadual(ss, 'AHLI_JK'), T = _ptJadual(ss, 'TAKWIM');
    function o(t, r) { var x = {}; t.h.forEach(function (k, i) { x[k] = _ptS(r[i]); }); return x; }

    var guru = G.rows.map(function (r) { return o(G, r); }).filter(function (g) { return g.NAMA; })
      .map(function (g) { return { id: g.ID, nama: g.NAMA.toUpperCase(), jawatan: g.JAWATAN, kategori: g.KATEGORI, kelas: g.KELAS, status: g.STATUS }; });

    var ahli = {};
    A.rows.forEach(function (r) {
      var a = o(A, r); if (!a.ID_JK || !a.NAMA_GURU) return;
      (ahli[a.ID_JK] = ahli[a.ID_JK] || []).push({ jawatan: a.JAWATAN, nama: a.NAMA_GURU.toUpperCase(), idGuru: a.ID_GURU });
    });
    var jk = J.rows.map(function (r) { return o(J, r); })
      .filter(function (j) { return j.ID && j.UNIT.toLowerCase() === PORTAL_KAT_TAKWIM.toLowerCase(); })
      .map(function (j) { return { id: j.ID, kategori: j.KATEGORI, nama: j.NAMA, tugas: j.SENARAI_TUGAS, catatan: j.CATATAN, rujukan: j.RUJUKAN, status: j.STATUS, tahun: j.TAHUN, ahli: ahli[j.ID] || [] }; });

    var iT = T.h;
    var takwim = T.rows.filter(function (r) { return _ptS(r[_ptCol(iT, 'ID')]) && _ptS(r[_ptCol(iT, 'KATEGORI')]).toLowerCase() === PORTAL_KAT_TAKWIM.toLowerCase(); })
      .map(function (r) {
        return { id: _ptS(r[_ptCol(iT, 'ID')]), mula: _ptTgl(r[_ptCol(iT, 'TARIKH_MULA')], tz), tamat: _ptTgl(r[_ptCol(iT, 'TARIKH_TAMAT')], tz),
          aktiviti: _ptS(r[_ptCol(iT, 'AKTIVITI')]), pautan: _ptS(r[_ptCol(iT, 'PAUTAN')]), catatan: _ptS(r[_ptCol(iT, 'CATATAN')]) };
      });

    // Cuti umum & cuti sekolah (baca sahaja) untuk warna kalendar
    var cuti = T.rows.filter(function (r) { return _ptS(r[_ptCol(iT, 'ID')]) && /cuti/i.test(_ptS(r[_ptCol(iT, 'KATEGORI')])); })
      .map(function (r) {
        return { mula: _ptTgl(r[_ptCol(iT, 'TARIKH_MULA')], tz), tamat: _ptTgl(r[_ptCol(iT, 'TARIKH_TAMAT')], tz) || _ptTgl(r[_ptCol(iT, 'TARIKH_MULA')], tz),
          nama: _ptS(r[_ptCol(iT, 'AKTIVITI')]), jenis: /sekolah/i.test(_ptS(r[_ptCol(iT, 'KATEGORI')])) ? 'SEKOLAH' : 'UMUM' };
      });

    return { success: true, nama: ss.getName(), guru: guru, jk: jk, takwim: takwim, cuti: cuti, masa: new Date().getTime() };
  } catch (e) { return { success: false, error: e.toString() }; }
}

// Tambah / kemas kini satu aktiviti takwim Kokurikulum dalam Portal.
// rekod: { id (kosong = baharu), mula, tamat, aktiviti, pautan, catatan }
function simpanTakwimPortal(rekod) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    rekod = rekod || {};
    if (!_ptS(rekod.aktiviti) || !_ptS(rekod.mula)) return { success: false, error: 'Aktiviti dan tarikh mula wajib diisi.' };
    var T = _ptJadual(_ptSS(), 'TAKWIM'), sh = T.sh, h = T.h;
    if (!sh) return { success: false, error: 'Tab TAKWIM tiada dalam Portal.' };
    if (!h.length) h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (x) { return _ptS(x).toUpperCase(); });
    var c = {}; ['ID', 'TARIKH_MULA', 'TARIKH_TAMAT', 'AKTIVITI', 'KATEGORI', 'PAUTAN', 'CATATAN'].forEach(function (k) { c[k] = h.indexOf(k); });
    if (c.ID < 0 || c.AKTIVITI < 0) return { success: false, error: 'Tajuk lajur TAKWIM dalam Portal tidak dikenali.' };

    var id = _ptS(rekod.id), baris = -1, maks = 0;
    T.rows.forEach(function (r, i) {
      var x = _ptS(r[c.ID]), m = x.match(/^T(\d+)$/i);
      if (m) maks = Math.max(maks, parseInt(m[1], 10));
      if (id && x === id) baris = i + 2;
    });
    if (baris > 0 && c.KATEGORI >= 0 && _ptS(T.rows[baris - 2][c.KATEGORI]).toLowerCase() !== PORTAL_KAT_TAKWIM.toLowerCase())
      return { success: false, error: 'Aktiviti ini bukan kategori Kokurikulum dalam Portal — tidak boleh diubah dari KokoSmart.' };
    var baru = baris < 0;
    if (baru) { id = 'T' + ('00' + (maks + 1)).slice(-3); baris = sh.getLastRow() + 1; }

    var nilai = {};
    nilai[c.ID] = id;
    nilai[c.TARIKH_MULA] = _ptS(rekod.mula);
    nilai[c.TARIKH_TAMAT] = _ptS(rekod.tamat) || _ptS(rekod.mula);
    nilai[c.AKTIVITI] = _ptS(rekod.aktiviti);
    if (c.KATEGORI >= 0) nilai[c.KATEGORI] = PORTAL_KAT_TAKWIM;
    if (c.PAUTAN >= 0 && rekod.pautan != null) nilai[c.PAUTAN] = _ptS(rekod.pautan);
    if (c.CATATAN >= 0 && rekod.catatan != null) nilai[c.CATATAN] = _ptS(rekod.catatan);
    Object.keys(nilai).forEach(function (k) {
      k = parseInt(k, 10); if (k < 0) return;
      var sel = sh.getRange(baris, k + 1);
      sel.setNumberFormat('@'); // kekal sebagai teks seperti data asal Portal (tarikh yyyy-MM-dd)
      sel.setValue(nilai[k]);
    });
    return { success: true, id: id, baru: baru };
  } catch (e) { return { success: false, error: e.toString() };
  } finally { try { lock.releaseLock(); } catch (x) {} }
}

// Padam satu aktiviti takwim (hanya kategori Kokurikulum)
function padamTakwimPortal(id) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var T = _ptJadual(_ptSS(), 'TAKWIM'), c = T.h.indexOf('ID'), k = T.h.indexOf('KATEGORI');
    for (var i = T.rows.length - 1; i >= 0; i--) {
      if (_ptS(T.rows[i][c]) !== _ptS(id)) continue;
      if (k >= 0 && _ptS(T.rows[i][k]).toLowerCase() !== PORTAL_KAT_TAKWIM.toLowerCase()) return { success: false, error: 'Bukan aktiviti Kokurikulum.' };
      T.sh.deleteRow(i + 2);
      return { success: true };
    }
    return { success: true, tiada: true };
  } catch (e) { return { success: false, error: e.toString() };
  } finally { try { lock.releaseLock(); } catch (x) {} }
}


// Tambah / kemas kini satu jawatankuasa Kokurikulum dan senarai ahlinya dalam Portal.
// jk: { id (kosong = JK baharu), kategori, nama, tugas, catatan, ahli: [{ jawatan, nama }] }
function simpanJkPortal(jk) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    jk = jk || {};
    if (!_ptS(jk.nama)) return { success: false, error: 'Nama jawatankuasa wajib diisi.' };
    var ss = _ptSS(), tz = ss.getSpreadsheetTimeZone() || 'Asia/Kuala_Lumpur', hariIni = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
    var J = _ptJadual(ss, 'JAWATANKUASA'), A = _ptJadual(ss, 'AHLI_JK'), G = _ptJadual(ss, 'GURU');
    if (!J.sh || !A.sh) return { success: false, error: 'Tab JAWATANKUASA / AHLI_JK tiada dalam Portal.' };
    var hJ = J.h.length ? J.h : J.sh.getRange(1, 1, 1, J.sh.getLastColumn()).getValues()[0].map(function (x) { return _ptS(x).toUpperCase(); });
    var hA = A.h.length ? A.h : A.sh.getRange(1, 1, 1, A.sh.getLastColumn()).getValues()[0].map(function (x) { return _ptS(x).toUpperCase(); });
    var cJ = function (k) { return hJ.indexOf(k); }, cA = function (k) { return hA.indexOf(k); };

    // 1) Baris JAWATANKUASA
    var id = _ptS(jk.id), baris = -1, maks = 0;
    J.rows.forEach(function (r, i) {
      var x = _ptS(r[cJ('ID')]), m = x.match(/^JK(\d+)$/i);
      if (m) maks = Math.max(maks, parseInt(m[1], 10));
      if (id && x === id) baris = i + 2;
    });
    if (id && baris < 0) return { success: false, error: 'Jawatankuasa ' + id + ' tidak dijumpai dalam Portal.' };
    if (baris > 0 && _ptS(J.rows[baris - 2][cJ('UNIT')]).toLowerCase() !== PORTAL_KAT_TAKWIM.toLowerCase())
      return { success: false, error: 'Jawatankuasa ini bukan unit Kokurikulum — tidak boleh diubah dari KokoSmart.' };
    var baru = baris < 0;
    if (baru) { id = 'JK' + ('00' + (maks + 1)).slice(-3); baris = J.sh.getLastRow() + 1; }
    var nilai = {};
    nilai.ID = id; nilai.NAMA = _ptS(jk.nama);
    if (jk.tugas != null) nilai.SENARAI_TUGAS = _ptS(jk.tugas);
    if (jk.catatan != null) nilai.CATATAN = _ptS(jk.catatan);
    nilai.KEMASKINI = hariIni;
    if (baru) { nilai.UNIT = PORTAL_KAT_TAKWIM; nilai.KATEGORI = _ptS(jk.kategori) || 'Jawatankuasa'; nilai.STATUS = 'Aktif'; nilai.TAHUN = hariIni.slice(0, 4); }
    Object.keys(nilai).forEach(function (k) {
      var c = cJ(k); if (c < 0) return;
      var sel = J.sh.getRange(baris, c + 1); sel.setNumberFormat('@'); sel.setValue(nilai[k]);
    });

    // 2) Ahli: ganti semua baris AHLI_JK bagi JK ini (kedudukan asal dikekalkan)
    var idGuru = {};
    G.rows.forEach(function (r) { var n = _ptS(r[G.h.indexOf('NAMA')]).toUpperCase(); if (n) idGuru[n] = _ptS(r[G.h.indexOf('ID')]); });
    var lebar = hA.length, tiadaId = [];
    var ahliBaru = (jk.ahli || []).filter(function (a) { return _ptS(a.nama); }).map(function (a) {
      var nm = _ptS(a.nama).toUpperCase(), row = [];
      for (var i = 0; i < lebar; i++) row.push('');
      if (!idGuru[nm]) tiadaId.push(nm);
      if (cA('ID_JK') >= 0) row[cA('ID_JK')] = id;
      if (cA('NAMA_JK') >= 0) row[cA('NAMA_JK')] = _ptS(jk.nama);
      if (cA('JAWATAN') >= 0) row[cA('JAWATAN')] = _ptS(a.jawatan) || 'AJK';
      if (cA('ID_GURU') >= 0) row[cA('ID_GURU')] = idGuru[nm] || '';
      if (cA('NAMA_GURU') >= 0) row[cA('NAMA_GURU')] = nm;
      return row;
    });
    var lama = A.rows.map(function (r) { r = r.slice(0, lebar); while (r.length < lebar) r.push(''); return r.map(function (v) { return v instanceof Date ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : v; }); });
    var hasil = [], dimasuk = false;
    lama.forEach(function (r) {
      if (_ptS(r[cA('ID_JK')]) === id) { if (!dimasuk) { hasil = hasil.concat(ahliBaru); dimasuk = true; } return; }
      hasil.push(r);
    });
    if (!dimasuk) hasil = hasil.concat(ahliBaru);
    var nLama = lama.length, nBaru = hasil.length;
    if (nBaru) { var rg = A.sh.getRange(2, 1, nBaru, lebar); rg.setNumberFormat('@'); rg.setValues(hasil); }
    if (nBaru < nLama) A.sh.deleteRows(2 + nBaru, nLama - nBaru);

    return { success: true, id: id, baru: baru, ahli: ahliBaru.length, tiadaDalamGuru: tiadaId };
  } catch (e) { return { success: false, error: e.toString() };
  } finally { try { lock.releaseLock(); } catch (x) {} }
}


// Tambah / tukar nama / tukar status guru dalam tab GURU Portal.
// g: { nama, namaLama (jika tukar nama), status (cth. 'Aktif' / 'Tidak Aktif'), jawatan, padam (true = padam terus) }
// Tukar nama turut membetulkan NAMA_GURU dalam AHLI_JK.
function simpanGuruPortal(g) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    g = g || {};
    var nama = _ptS(g.nama).toUpperCase(), lama = _ptS(g.namaLama).toUpperCase() || nama;
    if (!nama) return { success: false, error: 'Nama guru kosong.' };
    var ss = _ptSS(), G = _ptJadual(ss, 'GURU');
    if (!G.sh) return { success: false, error: 'Tab GURU tiada dalam Portal.' };
    var h = G.h.length ? G.h : G.sh.getRange(1, 1, 1, G.sh.getLastColumn()).getValues()[0].map(function (x) { return _ptS(x).toUpperCase(); });
    var c = function (k) { return h.indexOf(k); };
    var baris = -1, maks = 0, id = '';
    G.rows.forEach(function (r, i) {
      var x = _ptS(r[c('ID')]), m = x.match(/^G(\d+)$/i);
      if (m) maks = Math.max(maks, parseInt(m[1], 10));
      if (baris < 0 && _ptS(r[c('NAMA')]).toUpperCase() === lama) { baris = i + 2; id = x; }
    });
    if (baris < 0 && g.namaLama && nama !== lama) {
      G.rows.forEach(function (r, i) { if (baris < 0 && _ptS(r[c('NAMA')]).toUpperCase() === nama) { baris = i + 2; id = _ptS(r[c('ID')]); } });
    }
    // Padam terus (hanya jika guru tiada dalam mana-mana jawatankuasa)
    if (g.padam) {
      if (baris < 0) return { success: true, tiada: true };
      var Ap = _ptJadual(ss, 'AHLI_JK'), cN = Ap.h.indexOf('NAMA_GURU'), cI = Ap.h.indexOf('ID_GURU'), guna = 0;
      Ap.rows.forEach(function (r) { if ((cN >= 0 && _ptS(r[cN]).toUpperCase() === lama) || (cI >= 0 && id && _ptS(r[cI]) === id)) guna++; });
      if (guna) return { success: false, error: 'Guru ini masih ada ' + guna + ' jawatan dalam JK. Keluarkan daripada JK dahulu.' };
      G.sh.deleteRow(baris);
      return { success: true, dipadam: true, id: id };
    }
    var baru = baris < 0;
    function tulis(k, v) { var i = c(k); if (i < 0) return; var sel = G.sh.getRange(baris, i + 1); sel.setNumberFormat('@'); sel.setValue(v); }
    if (baru) {
      if (g.status && /tidak/i.test(g.status)) return { success: true, tiada: true };
      id = 'G' + ('0' + (maks + 1)).slice(-2); baris = G.sh.getLastRow() + 1;
      tulis('ID', id); tulis('JAWATAN', _ptS(g.jawatan) || 'Guru'); tulis('KATEGORI', 'Guru'); tulis('STATUS', 'Aktif');
    }
    tulis('NAMA', nama);
    if (g.status) tulis('STATUS', _ptS(g.status));
    var dibetul = 0;
    if (!baru && lama !== nama) {
      var A = _ptJadual(ss, 'AHLI_JK'), cn = A.h.indexOf('NAMA_GURU');
      if (cn >= 0) A.rows.forEach(function (r, i) {
        if (_ptS(r[cn]).toUpperCase() === lama) { var sel = A.sh.getRange(i + 2, cn + 1); sel.setNumberFormat('@'); sel.setValue(nama); dibetul++; }
      });
    }
    return { success: true, id: id, baru: baru, ahliDibetulkan: dibetul };
  } catch (e) { return { success: false, error: e.toString() };
  } finally { try { lock.releaseLock(); } catch (x) {} }
}

// ===== TAMAT Portal.gs =====
