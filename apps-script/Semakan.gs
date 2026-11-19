// ============================================================
// KOKOSMART PRO — Semakan.gs (PROJEK APPS SCRIPT BERASINGAN, untuk ibu bapa)
// Halaman semak.html → ibu bapa masukkan No. MyKid + kelas → maklumat SEORANG murid sahaja.
//
// PEMASANGAN (sekali sahaja):
//  1. script.google.com → New project → namakan "KokoSmart Semakan Ibu Bapa"
//  2. Padam semua isi Code.gs dalam projek baharu itu, tampal fail ini.
//  3. Project Settings (⚙) → Script Properties → tambah:
//       DATA_ID = ID Google Sheet DATA MASTER KokoSmart (kod panjang dalam pautan .../d/<ID>/edit)
//  4. Deploy → New deployment → Web app → Execute as: Me · Who has access: Anyone → Deploy → salin URL /exec
//  5. Beri URL itu kepada Claude (atau tampal dalam config.js: SEMAK_API).
//
// Fail ini membaca data, dan hanya MENAMBAH rekod sijil ibu bapa (status MENUNGGU SEMAKAN).
// Ia tidak boleh mengubah atau memadam data murid. Tiada kata laluan sistem di sini.
// ============================================================

function _sDB() {
  var id = PropertiesService.getScriptProperties().getProperty('DATA_ID');
  if (!id) throw new Error('DATA_ID belum ditetapkan');
  return SpreadsheetApp.openById(id);
}
function _sS(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
function _sJ(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function _sSheet(ss, nama, alt) { return ss.getSheetByName(nama) || (alt ? ss.getSheetByName(alt) : null); }
function _sRows(sh) { if (!sh || sh.getLastRow() < 2) return { h: [], r: [] }; var d = sh.getDataRange().getValues(); return { h: d[0].map(function (x) { return _sS(x).toUpperCase(); }), r: d.slice(1) }; }
function _sTgl(v, tz) { return v instanceof Date ? Utilities.formatDate(v, tz, 'dd/MM/yyyy') : _sS(v); }

// Tetapan daripada KokoSmart (sheet "KOKO - TETAPAN PK": KUNCI / NILAI)
function _sTetapan(ss) {
  var t = { SEMAK_BUKA: 'TIDAK', SEMAK_UNIT: 'YA', SEMAK_PAJSK: 'TIDAK', SEMAK_HADIR: 'YA', SEMAK_CAPAI: 'YA', SEMAK_SIJIL: 'TIDAK', SEMAK_HUBUNGI: '' };
  var R = _sRows(ss.getSheetByName('KOKO - TETAPAN PK')), k = R.h.indexOf('KUNCI'), n = R.h.indexOf('NILAI');
  if (k >= 0 && n >= 0) R.r.forEach(function (r) { var kk = _sS(r[k]); if (/^SEMAK_/.test(kk)) t[kk] = _sS(r[n]); });
  return t;
}

function doGet(e) {
  try {
    var ss = _sDB(), t = _sTetapan(ss);
    var M = _sRows(_sSheet(ss, 'DATA MASTER - MASTER', 'MASTER')), ck = M.h.indexOf('KELAS'), ct = M.h.indexOf('TAHUN');
    var kelas = {};
    M.r.forEach(function (r) { var k = _sS(r[ck >= 0 ? ck : 2]), th = _sS(r[ct >= 0 ? ct : 1]); if (k) kelas[(th ? th + ' ' : '') + k] = 1; });
    return _sJ({ success: true, buka: /^YA$/i.test(t.SEMAK_BUKA), hubungi: t.SEMAK_HUBUNGI, sekolah: ss.getName(), kelas: Object.keys(kelas).sort() });
  } catch (x) { return _sJ({ success: false, error: 'Sistem belum sedia.' }); }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var req = JSON.parse(e.postData.contents || '{}');
    var mykid = _sS(req.mykid).replace(/\D/g, ''), kelasIn = _sS(req.kelas).toUpperCase();
    var ss = _sDB(), t = _sTetapan(ss), tz = ss.getSpreadsheetTimeZone() || 'Asia/Kuala_Lumpur';
    if (!/^YA$/i.test(t.SEMAK_BUKA)) return _sJ({ success: false, error: 'Semakan ditutup buat masa ini.' });
    if (mykid.length !== 12 || !kelasIn) return _sJ({ success: false, error: 'Sila isi No. MyKid (12 digit) dan kelas.' });

    // Had cubaan: 5 kali salah bagi satu MyKid → kunci 15 minit; had keseluruhan 200 cubaan salah / jam
    var cache = CacheService.getScriptCache(), kC = 'sk_' + mykid, n = +(cache.get(kC) || 0), g = +(cache.get('sk_all') || 0);
    if (n >= 5 || g >= 200) return _sJ({ success: false, error: 'Terlalu banyak cubaan. Cuba lagi selepas 15 minit.' });
    function gagal() { cache.put(kC, String(n + 1), 900); cache.put('sk_all', String(g + 1), 3600); return _sJ({ success: false, error: 'Maklumat tidak sepadan. Semak No. MyKid dan kelas.' }); }

    var M = _sRows(_sSheet(ss, 'DATA MASTER - MASTER', 'MASTER'));
    var cM = M.h.indexOf('MYKID'); if (cM < 0) cM = M.h.indexOf('NO. MYKID'); if (cM < 0) cM = M.h.indexOf('MY KID');
    if (cM < 0) return _sJ({ success: false, error: 'Sistem belum sedia (lajur MYKID tiada).' });
    var c = function (n, d) { var i = M.h.indexOf(n); return i >= 0 ? i : d; };
    var iT = c('TAHUN', 1), iK = c('KELAS', 2), iN = 3, iR = c('RUMAH', 4), iU = c('UNIFORM', 5), iKb = c('KELAB', 6), iS = c('SUKAN', 7);
    for (var h = 0; h < M.h.length; h++) if (/NAMA/.test(M.h[h])) { iN = h; break; }
    var row = null;
    M.r.forEach(function (r) { if (!row && _sS(r[cM]).replace(/\D/g, '') === mykid) row = r; });
    if (!row) return gagal();
    var kls = _sS(row[iK]).toUpperCase(), thn = _sS(row[iT]);
    if (kelasIn !== kls && kelasIn !== (thn + ' ' + kls)) return gagal();
    cache.remove(kC);

    var nama = _sS(row[iN]), NU = nama.toUpperCase(), tahunIni = Utilities.formatDate(new Date(), tz, 'yyyy');
    if (req.tindakan === 'sijil') return _sJ(_sSimpanSijil(ss, t, req, nama, thn + ' ' + kls, mykid, tz));
    var out = { success: true, nama: nama, tahun: thn, kelas: kls, sekolah: ss.getName(), hubungi: t.SEMAK_HUBUNGI };
    if (/^YA$/i.test(t.SEMAK_UNIT)) out.unit = { rumah: _sS(row[iR]) || '-', uniform: _sS(row[iU]) || '-', kelab: _sS(row[iKb]) || '-', sukan: _sS(row[iS]) || '-' };

    if (/^YA$/i.test(t.SEMAK_HADIR)) {
      var H = _sRows(_sSheet(ss, 'DATA MASTER - KEHADIRAN')), u = {};
      H.r.forEach(function (r) {
        if (_sS(r[4]).toUpperCase() !== NU) return;
        var tg = _sTgl(r[0], tz); if (tg.slice(-4) !== tahunIni) return;
        var k = _sS(r[2]) || '-'; u[k] = u[k] || { unit: k, hadir: 0, jumlah: 0, kali: {} };
        var siri = _sS(r[3]); if (u[k].kali[siri + '|' + tg]) return; u[k].kali[siri + '|' + tg] = 1;
        u[k].jumlah++; if (/^hadir$/i.test(_sS(r[5]))) u[k].hadir++;
      });
      out.hadir = Object.keys(u).map(function (k) { return { unit: u[k].unit, hadir: u[k].hadir, jumlah: u[k].jumlah }; });
    }
    if (/^YA$/i.test(t.SEMAK_CAPAI)) {
      var P = _sRows(_sSheet(ss, 'DATA MASTER - PENCAPAIAN'));
      out.capai = P.r.filter(function (r) { return _sS(r[1]).toUpperCase() === NU && _sTgl(r[0], tz).slice(-4) === tahunIni; })
        .map(function (r) { return { tarikh: _sTgl(r[0], tz), pertandingan: _sS(r[4]), peringkat: _sS(r[3]), pencapaian: _sS(r[5]) }; });
    }
    if (/^YA$/i.test(t.SEMAK_SIJIL)) {
      out.bolehSijil = true;
      var SJ = _sRows(ss.getSheetByName(SIJIL_SHEET)), sN = SJ.h.indexOf('NAMA MURID');
      out.sijil = sN < 0 ? [] : SJ.r.filter(function (r) { return _sS(r[sN]).toUpperCase() === NU; }).map(function (r) {
        var g = function (k) { var i = SJ.h.indexOf(k); return i >= 0 ? _sTgl(r[i], tz) : ''; };
        return { aktiviti: g('AKTIVITI'), peringkat: g('PERINGKAT'), pencapaian: g('PENCAPAIAN'), tarikh: g('TARIKH AKTIVITI'), status: g('STATUS') || 'MENUNGGU SEMAKAN', catatan: g('CATATAN PK') };
      });
    }
    if (/^YA$/i.test(t.SEMAK_PAJSK)) {
      var J = _sRows(_sSheet(ss, 'PAJSK', 'DATA MASTER - PAJSK'));
      if (!J.h.length) { // tajuk mungkin bukan di baris 1: cari baris yang ada NAMA
        var sh = _sSheet(ss, 'PAJSK', 'DATA MASTER - PAJSK');
        if (sh) { var d = sh.getDataRange().getValues(); for (var i = 0; i < Math.min(10, d.length); i++) if (d[i].some(function (x) { return /NAMA/i.test(_sS(x)); })) { J = { h: d[i].map(function (x) { return _sS(x).toUpperCase(); }), r: d.slice(i + 1) }; break; } }
      }
      var jN = -1; J.h.forEach(function (x, i) { if (jN < 0 && /NAMA/.test(x)) jN = i; });
      var pr = jN >= 0 ? J.r.filter(function (r) { return _sS(r[jN]).toUpperCase() === NU; })[0] : null;
      if (pr) { out.pajsk = []; J.h.forEach(function (x, i) { if (!x || i === jN || /MYKID|IC|KAD|BIL|^NO$/.test(x)) return; var v = _sS(pr[i]); if (v !== '') out.pajsk.push({ k: x, v: v }); }); }
    }
    return _sJ(out);
  } catch (x) { return _sJ({ success: false, error: 'Ralat sistem. Cuba sebentar lagi.' }); }
}


// ---------- SIJIL DARIPADA IBU BAPA (aktiviti luar sekolah) ----------
var SIJIL_SHEET = 'KOKO - SIJIL IBU BAPA', SIJIL_FOLDER = 'KOKOSMART SIJIL IBU BAPA';
var SIJIL_TAJUK = ['ID', 'DIKEMASKINI', 'TARIKH HANTAR', 'NAMA MURID', 'KELAS', 'AKTIVITI', 'PENGANJUR', 'PERINGKAT', 'PENCAPAIAN', 'TARIKH AKTIVITI', 'GAMBAR', 'STATUS', 'CATATAN PK'];
function _sSimpanSijil(ss, t, req, nama, kelas, mykid, tz) {
  if (!/^YA$/i.test(t.SEMAK_SIJIL)) return { success: false, error: 'Penghantaran sijil ditutup buat masa ini.' };
  var akt = _sS(req.aktiviti).slice(0, 200), pkt = _sS(req.peringkat), cap = _sS(req.pencapaian), pjr = _sS(req.penganjur).slice(0, 100), tg = _sS(req.tarikh);
  var G = (req.gambar || []).filter(function (x) { return /^data:image\/(jpeg|png|webp);base64,/.test(String(x)) && String(x).length < 2500000; }).slice(0, 3);
  if (!akt || !pkt || !cap || !G.length) return { success: false, error: 'Isi nama aktiviti, peringkat, pencapaian dan sekurang-kurangnya 1 gambar.' };
  var cache = CacheService.getScriptCache(), kH = 'sj_' + mykid, n = +(cache.get(kH) || 0);
  if (n >= 5) return { success: false, error: 'Had 5 penghantaran sehari telah dicapai.' };
  var it = DriveApp.getFoldersByName(SIJIL_FOLDER), folder = it.hasNext() ? it.next() : DriveApp.createFolder(SIJIL_FOLDER);
  var masa = Utilities.formatDate(new Date(), tz, 'yyyyMMdd-HHmmss'), url = [];
  G.forEach(function (d, i) {
    var m = String(d).match(/^data:(image\/\w+);base64,(.*)$/);
    var blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], nama + ' - ' + akt.slice(0, 40) + ' - ' + masa + '-' + (i + 1) + '.jpg');
    url.push(folder.createFile(blob).getUrl());
  });
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = ss.getSheetByName(SIJIL_SHEET);
    if (!sh) { sh = ss.insertSheet(SIJIL_SHEET); sh.getRange(1, 1, 1, SIJIL_TAJUK.length).setValues([SIJIL_TAJUK]).setFontWeight('bold'); sh.setFrozenRows(1); }
    var h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (x) { return _sS(x).toUpperCase(); });
    var v = { 'ID': 'SJ' + masa + Math.floor(Math.random() * 1000), 'DIKEMASKINI': Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy HH:mm'), 'TARIKH HANTAR': Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy'),
      'NAMA MURID': nama, 'KELAS': kelas, 'AKTIVITI': akt.toUpperCase(), 'PENGANJUR': pjr.toUpperCase(), 'PERINGKAT': pkt, 'PENCAPAIAN': cap, 'TARIKH AKTIVITI': tg, 'GAMBAR': url.join(' | '), 'STATUS': 'MENUNGGU SEMAKAN', 'CATATAN PK': '' };
    var row = h.map(function (k) { return v[k] == null ? '' : v[k]; });
    var rg = sh.getRange(sh.getLastRow() + 1, 1, 1, row.length); rg.setNumberFormat('@'); rg.setValues([row]);
  } finally { lock.releaseLock(); }
  cache.put(kH, String(n + 1), 86400);
  return { success: true };
}

// ===== TAMAT Semakan.gs =====
