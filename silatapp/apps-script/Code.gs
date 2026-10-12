/**
 * SilatApp Pusat — API Google Apps Script
 * Seni Silat Gayong (sistem pusat banyak gelanggang)
 *
 * CARA GUNA: Padam semua kod dalam Code.gs, tampal SEMUA kod ini, Simpan.
 * Kali pertama: isi SUPER_ID & SUPER_KATA di bawah → jalankan fungsi setupPertama
 * → selepas berjaya, PADAM kata laluan (jadikan '') dan Simpan semula.
 */

// ====== ISI SEKALI SAHAJA (untuk setupPertama) ======
var SUPER_ID = '';        // cth: 'superadmin'
var SUPER_KATA = '';      // kata laluan anda (min 8 aksara). PADAM selepas setup!
var SUPER_NAMA = '';      // nama penuh anda
var SUPER_TEL = '';       // no. telefon anda

// ====== ISI UNTUK IMPORT (fungsi importSaya) ======
var IMPORT_ID_SHEET_LAMA = '';   // ID Google Sheet sistem lama (bahagian antara /d/ dan /edit dalam pautan)
var IMPORT_KOD_GELANGGANG = '';  // kod penuh gelanggang di Pusat, cth: 'KDH-SMT'

// ====================================================
var TZ = 'Asia/Kuala_Lumpur';
var HARI_AKTIF = 60;
var NEGERI = [['JHR', 'Johor'], ['KDH', 'Kedah'], ['KTN', 'Kelantan'], ['MLK', 'Melaka'], ['NSN', 'Negeri Sembilan'],
  ['PHG', 'Pahang'], ['PRK', 'Perak'], ['PLS', 'Perlis'], ['PNG', 'Pulau Pinang'], ['SBH', 'Sabah'], ['SWK', 'Sarawak'],
  ['SGR', 'Selangor'], ['TRG', 'Terengganu'], ['KUL', 'W.P. Kuala Lumpur'], ['LBN', 'W.P. Labuan'], ['PJY', 'W.P. Putrajaya']];
var SKEMA = {
  NEGERI: ['KOD', 'NAMA'],
  GELANGGANG: ['ID_GEL', 'KOD', 'KOD_PENUH', 'NAMA', 'NEGERI', 'ALAMAT', 'KETUA_ID', 'TARIKH_DAFTAR', 'STATUS', 'AKTIVITI_TERAKHIR', 'SIRI_TERAKHIR'],
  PENGGUNA: ['ID', 'HASH', 'SALT', 'NAMA', 'TELEFON', 'PERANAN', 'NEGERI', 'ID_GEL', 'KETUA', 'STATUS', 'TARIKH_DAFTAR', 'GAGAL', 'KUNCI_HINGGA'],
  SESI: ['TOKEN', 'ID', 'LUPUT'],
  AHLI: ['NO_AHLI', 'NO_KP', 'NAMA', 'JANTINA', 'TARIKH_LAHIR', 'BENGKUNG', 'GEL_UTAMA', 'NEGERI', 'STATUS', 'TARIKH_DAFTAR', 'TEL_WARIS', 'ID_LAMA'],
  KEAHLIAN_GELANGGANG: ['NO_KP', 'ID_GEL', 'JENIS', 'STATUS', 'TARIKH_MULA', 'TARIKH_TAMAT'],
  YURAN_TAHUNAN: ['NO_KP', 'ID_GEL', 'TAHUN', 'JUMLAH', 'TARIKH_BAYAR', 'DIREKOD_OLEH', 'SUMBER'],
  LOG_AUDIT: ['MASA', 'ID', 'TINDAKAN', 'BUTIRAN'],
  TETAPAN: ['KUNCI', 'NILAI']
};
var ST_AHLI = ['AKTIF', 'TIDAK AKTIF', 'DIGANTUNG', 'DIBATALKAN'];
var TULIS = { daftar: 1, login: 1, logout: 1, lulus_gelanggang: 1, status_gelanggang: 1, status_jurulatih: 1, tetap_ketua: 1,
  lantik_admin: 1, buang_admin: 1, reset_kata: 1, tukar_kata: 1, daftar_ahli: 1, edit_ahli: 1, status_ahli: 1,
  rekod_yuran: 1, padam_yuran: 1, tetapan_set: 1, jana_kunci_import: 1, import_gelanggang: 1 };

// ---------------- Asas sheet ----------------
var MEMO = {};
function ss() { return SpreadsheetApp.getActiveSpreadsheet(); }
function sh(n) { return ss().getSheetByName(n); }
function baca(n) {
  if (MEMO[n]) return MEMO[n];
  var v = sh(n).getDataRange().getDisplayValues(), h = v[0], out = [];
  for (var i = 1; i < v.length; i++) {
    if (v[i].join('') === '') continue;
    var o = { _r: i + 1 };
    for (var j = 0; j < h.length; j++) o[h[j]] = v[i][j];
    out.push(o);
  }
  MEMO[n] = out;
  return out;
}
function keBaris(n, o) { return SKEMA[n].map(function (k) { return o[k] == null ? '' : String(o[k]); }); }
function tambahBanyak(n, arr) {
  if (!arr.length) return;
  var s = sh(n), rows = arr.map(function (o) { return keBaris(n, o); });
  var rg = s.getRange(s.getLastRow() + 1, 1, rows.length, SKEMA[n].length);
  rg.setNumberFormat('@'); rg.setValues(rows);
  delete MEMO[n];
}
function tambah(n, o) { tambahBanyak(n, [o]); }
function kemas(n, r, o) {
  var s = sh(n), h = SKEMA[n];
  for (var k in o) {
    var c = h.indexOf(k); if (c < 0) continue;
    var cell = s.getRange(r, c + 1); cell.setNumberFormat('@'); cell.setValue(o[k] == null ? '' : String(o[k]));
  }
  delete MEMO[n];
}
function cari(n, f) { var a = baca(n); for (var i = 0; i < a.length; i++) if (f(a[i])) return a[i]; return null; }
function hari() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function kini() { return new Date().toISOString(); }
function ralat(m) { throw new Error(m); }
function audit(id, t, b) { tambah('LOG_AUDIT', { MASA: Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss'), ID: id, TINDAKAN: t, BUTIRAN: typeof b === 'string' ? b : JSON.stringify(b || '') }); }
function hex(bytes) { return bytes.map(function (b) { var x = (b < 0 ? b + 256 : b).toString(16); return x.length < 2 ? '0' + x : x; }).join(''); }
function hash(kata, salt) { return hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + '|' + kata, Utilities.Charset.UTF_8)); }
function rawak() { return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''); }
function namaNegeri(k) { for (var i = 0; i < NEGERI.length; i++) if (NEGERI[i][0] === k) return NEGERI[i][1]; return k; }
function kp(s) { return String(s || '').replace(/\D/g, ''); }
function topeng(k) { k = kp(k); return k.length === 12 ? k.slice(0, 6) + '-' + k.slice(6, 8) + '-****' : (k ? k.slice(0, 4) + '****' : ''); }
function formatKp(k) { k = kp(k); return k.length === 12 ? k.slice(0, 6) + '-' + k.slice(6, 8) + '-' + k.slice(8) : k; }
function tetapan(k) { var r = cari('TETAPAN', function (x) { return x.KUNCI === k; }); return r ? r.NILAI : ''; }
function setTetapan(k, v) { var r = cari('TETAPAN', function (x) { return x.KUNCI === k; }); if (r) kemas('TETAPAN', r._r, { NILAI: v }); else tambah('TETAPAN', { KUNCI: k, NILAI: v }); }

// ---------------- Setup sekali jalan ----------------
function setupPertama() {
  var s = ss();
  Object.keys(SKEMA).forEach(function (n) {
    var t = s.getSheetByName(n) || s.insertSheet(n);
    t.getRange(1, 1, t.getMaxRows(), Math.max(t.getMaxColumns(), SKEMA[n].length)).setNumberFormat('@');
    t.getRange(1, 1, 1, SKEMA[n].length).setValues([SKEMA[n]]).setFontWeight('bold');
    t.setFrozenRows(1);
  });
  var lalai = s.getSheetByName('Sheet1') || s.getSheetByName('Helaian1');
  if (lalai && s.getSheets().length > 1) s.deleteSheet(lalai);
  MEMO = {};
  if (!baca('NEGERI').length) tambahBanyak('NEGERI', NEGERI.map(function (x) { return { KOD: x[0], NAMA: x[1] }; }));
  if (!tetapan('IMPORT_KEY')) setTetapan('IMPORT_KEY', rawak().slice(0, 24));
  if (!tetapan('NAMA_SISTEM')) setTetapan('NAMA_SISTEM', 'SilatApp Pusat');
  var ada = cari('PENGGUNA', function (u) { return u.PERANAN === 'SUPER_ADMIN'; });
  if (ada) { Logger.log('Super Admin sudah wujud: ' + ada.ID + '. Setup selesai.'); return; }
  var id = String(SUPER_ID).trim().toLowerCase();
  if (!id || String(SUPER_KATA).length < 8) ralat('Isi SUPER_ID dan SUPER_KATA (min 8 aksara) di atas dahulu, Simpan, kemudian jalankan semula.');
  var salt = rawak().slice(0, 16);
  tambah('PENGGUNA', { ID: id, HASH: hash(SUPER_KATA, salt), SALT: salt, NAMA: SUPER_NAMA || 'Super Admin', TELEFON: SUPER_TEL,
    PERANAN: 'SUPER_ADMIN', STATUS: 'AKTIF', TARIKH_DAFTAR: hari(), GAGAL: '0' });
  audit(id, 'SETUP', 'Super Admin dicipta');
  Logger.log('BERJAYA! Super Admin "' + id + '" dicipta. Sekarang PADAM kata laluan dalam SUPER_KATA dan Simpan.');
}

// ---------------- Pintu masuk API ----------------
function doGet(e) {
  var p = e && e.parameter && e.parameter.p;
  if (!p) return jout({ ok: true, nama: 'SilatApp Pusat API', masa: kini() });
  var b; try { b = JSON.parse(p); } catch (x) { return jout({ ok: false, ralat: 'Data tidak sah' }); }
  return jout(proses(b));
}
function doPost(e) {
  var b; try { b = JSON.parse(e.postData.contents); } catch (x) { return jout({ ok: false, ralat: 'Data tidak sah' }); }
  return jout(proses(b));
}
function jout(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function proses(b) {
  var lock = null;
  try {
    var a = b.action, f = API[a];
    if (!f) return { ok: false, ralat: 'Tindakan tidak dikenali' };
    if (TULIS[a]) { lock = LockService.getScriptLock(); if (!lock.tryLock(30000)) return { ok: false, ralat: 'Pelayan sibuk, cuba lagi.' }; }
    var awam = { senarai_awam: 1, daftar: 1, login: 1, import_gelanggang: 1 };
    var u = null;
    if (!awam[a]) {
      u = semakSesi(b.token);
      if (!u) return { ok: false, sesi: false, ralat: 'Sesi tamat. Sila log masuk semula.' };
    }
    var r = f(b, u);
    if (u && TULIS[a] && u.ID_GEL) tandaAktiviti(u.ID_GEL);
    if (r && r.ok == null) r.ok = true;
    return r;
  } catch (err) {
    return { ok: false, ralat: String(err && err.message || err) };
  } finally { if (lock) lock.releaseLock(); }
}

function semakSesi(token) {
  if (!token) return null;
  var s = cari('SESI', function (x) { return x.TOKEN === token; });
  if (!s || s.LUPUT < kini()) return null;
  var u = cari('PENGGUNA', function (x) { return x.ID === s.ID; });
  if (!u || u.STATUS !== 'AKTIF') return null;
  if (u.PERANAN === 'JURULATIH') {
    var g = gel(u.ID_GEL);
    if (!g || g.STATUS === 'DISEKAT') return null;
  }
  return u;
}
function tandaAktiviti(idGel) {
  var g = gel(idGel); if (!g) return;
  var t = hari(); if (g.AKTIVITI_TERAKHIR !== t) kemas('GELANGGANG', g._r, { AKTIVITI_TERAKHIR: t });
}
function gel(id) { return cari('GELANGGANG', function (g) { return g.ID_GEL === id; }); }
function pengguna(id) { return cari('PENGGUNA', function (x) { return x.ID === id; }); }
function perlu(u, peranan) { if (peranan.indexOf(u.PERANAN) < 0) ralat('Anda tiada kebenaran untuk tindakan ini.'); }
function skopNegeri(u, negeri) { if (u.PERANAN === 'SUPER_ADMIN') return true; if (u.PERANAN === 'ADMIN_NEGERI') return negeri === u.NEGERI; return false; }
function wajibSkop(u, negeri) { if (!skopNegeri(u, negeri)) ralat('Di luar skop negeri anda.'); }
function aktifSebenar(g) {
  if (g.STATUS !== 'AKTIF' || !g.AKTIVITI_TERAKHIR) return false;
  var had = Utilities.formatDate(new Date(Date.now() - HARI_AKTIF * 864e5), TZ, 'yyyy-MM-dd');
  return g.AKTIVITI_TERAKHIR >= had;
}
function profil(u) {
  var g = u.ID_GEL ? gel(u.ID_GEL) : null;
  return { id: u.ID, nama: u.NAMA, telefon: u.TELEFON, peranan: u.PERANAN, negeri: u.NEGERI, negeriNama: namaNegeri(u.NEGERI),
    idGel: u.ID_GEL, ketua: u.KETUA === 'YA', yuranLalai: tetapan('YURAN_LALAI'),
    gel: g ? { nama: g.NAMA, kodPenuh: g.KOD_PENUH, status: g.STATUS } : null };
}
function gelSaya(u, tulis) {
  perlu(u, ['JURULATIH']);
  var g = gel(u.ID_GEL);
  if (!g) ralat('Gelanggang anda tidak dijumpai.');
  if (tulis && g.STATUS !== 'AKTIF') ralat('Gelanggang anda belum AKTIF (status: ' + g.STATUS + '). Tunggu kelulusan Admin Negeri.');
  return g;
}

// ---------------- Tindakan API ----------------
var API = {};

API.senarai_awam = function () {
  return { negeri: NEGERI.map(function (x) { return { kod: x[0], nama: x[1] }; }),
    gelanggang: baca('GELANGGANG').filter(function (g) { return g.STATUS === 'AKTIF'; })
      .map(function (g) { return { id: g.ID_GEL, nama: g.NAMA, negeri: g.NEGERI, kod: g.KOD_PENUH }; }) };
};

API.daftar = function (b) {
  var id = String(b.id || '').trim().toLowerCase();
  if (!/^[a-z0-9._]{4,30}$/.test(id)) ralat('ID pengguna 4–30 aksara (huruf kecil, nombor, titik atau _ sahaja).');
  if (String(b.kata || '').length < 6) ralat('Kata laluan sekurang-kurangnya 6 aksara.');
  if (!String(b.nama || '').trim() || !String(b.telefon || '').trim()) ralat('Isi nama dan no. telefon.');
  if (!b.pdpa) ralat('Sila tanda persetujuan notis PDPA.');
  var neg = String(b.negeri || '');
  if (!NEGERI.some(function (x) { return x[0] === neg; })) ralat('Pilih negeri.');
  if (pengguna(id)) ralat('ID pengguna sudah digunakan. Pilih ID lain.');
  var idGel, ketua = 'TIDAK';
  if (b.gelBaru) {
    var nm = String(b.gelBaru.nama || '').trim().toUpperCase();
    if (!nm) ralat('Isi nama gelanggang baharu.');
    if (cari('GELANGGANG', function (g) { return g.NEGERI === neg && g.NAMA === nm && g.STATUS !== 'DISEKAT'; })) ralat('Gelanggang dengan nama itu sudah wujud di negeri ini. Pilih dari senarai.');
    idGel = 'G' + Date.now();
    tambah('GELANGGANG', { ID_GEL: idGel, NAMA: nm, NEGERI: neg, ALAMAT: String(b.gelBaru.alamat || ''), KETUA_ID: id,
      TARIKH_DAFTAR: hari(), STATUS: 'MENUNGGU', SIRI_TERAKHIR: '0' });
    ketua = 'YA';
  } else {
    var g = gel(b.idGel);
    if (!g || g.NEGERI !== neg || g.STATUS !== 'AKTIF') ralat('Pilih gelanggang yang sah.');
    idGel = g.ID_GEL;
  }
  var salt = rawak().slice(0, 16);
  tambah('PENGGUNA', { ID: id, HASH: hash(b.kata, salt), SALT: salt, NAMA: String(b.nama).trim().toUpperCase(), TELEFON: String(b.telefon).trim(),
    PERANAN: 'JURULATIH', NEGERI: neg, ID_GEL: idGel, KETUA: ketua, STATUS: 'MENUNGGU', TARIKH_DAFTAR: hari(), GAGAL: '0' });
  audit(id, 'DAFTAR_JURULATIH', { idGel: idGel, gelBaru: !!b.gelBaru });
  return { mesej: 'Pendaftaran diterima. Tunggu kelulusan Admin Negeri ' + namaNegeri(neg) + ' sebelum log masuk.' };
};

API.login = function (b) {
  var id = String(b.id || '').trim().toLowerCase();
  var u = pengguna(id);
  if (!u) ralat('ID atau kata laluan salah.');
  if (u.KUNCI_HINGGA && u.KUNCI_HINGGA > kini()) {
    var min = Math.ceil((new Date(u.KUNCI_HINGGA) - new Date()) / 60000);
    ralat('Akaun dikunci kerana terlalu banyak cubaan gagal. Cuba lagi dalam ' + min + ' minit.');
  }
  if (hash(String(b.kata || ''), u.SALT) !== u.HASH) {
    var gagal = (+u.GAGAL || 0) + 1;
    if (gagal >= 5) { kemas('PENGGUNA', u._r, { GAGAL: 0, KUNCI_HINGGA: new Date(Date.now() + 15 * 60000).toISOString() }); audit(id, 'LOGIN_DIKUNCI', ''); ralat('5 kali gagal. Akaun dikunci 15 minit.'); }
    kemas('PENGGUNA', u._r, { GAGAL: gagal });
    ralat('ID atau kata laluan salah. (Cubaan ' + gagal + '/5)');
  }
  if (+u.GAGAL || u.KUNCI_HINGGA) kemas('PENGGUNA', u._r, { GAGAL: 0, KUNCI_HINGGA: '' });
  if (u.STATUS === 'MENUNGGU') ralat('Akaun anda masih MENUNGGU kelulusan Admin Negeri.');
  if (u.STATUS !== 'AKTIF') ralat('Akaun anda berstatus ' + u.STATUS + '. Hubungi Admin Negeri.');
  if (u.PERANAN === 'JURULATIH') {
    var g = gel(u.ID_GEL);
    if (!g) ralat('Gelanggang anda tidak dijumpai.');
    if (g.STATUS === 'DISEKAT') ralat('Gelanggang anda telah DISEKAT. Hubungi pentadbir.');
    tandaAktiviti(u.ID_GEL);
  }
  // buang sesi luput
  var s = sh('SESI'), sesi = baca('SESI'), k = kini();
  for (var i = sesi.length - 1; i >= 0; i--) if (sesi[i].LUPUT < k) s.deleteRow(sesi[i]._r);
  delete MEMO.SESI;
  var token = rawak();
  tambah('SESI', { TOKEN: token, ID: u.ID, LUPUT: new Date(Date.now() + 7 * 864e5).toISOString() });
  audit(u.ID, 'LOGIN', '');
  return { token: token, profil: profil(u) };
};

API.logout = function (b) {
  var s = cari('SESI', function (x) { return x.TOKEN === b.token; });
  if (s) sh('SESI').deleteRow(s._r);
  return {};
};
API.saya = function (b, u) { return { profil: profil(u) }; };

API.tukar_kata = function (b, u) {
  if (hash(String(b.lama || ''), u.SALT) !== u.HASH) ralat('Kata laluan lama salah.');
  if (String(b.baru || '').length < 6) ralat('Kata laluan baharu sekurang-kurangnya 6 aksara.');
  var salt = rawak().slice(0, 16);
  kemas('PENGGUNA', u._r, { HASH: hash(b.baru, salt), SALT: salt });
  audit(u.ID, 'TUKAR_KATA', '');
  return { mesej: 'Kata laluan ditukar.' };
};

API.reset_kata = function (b, u) {
  perlu(u, ['SUPER_ADMIN', 'ADMIN_NEGERI']);
  var t = pengguna(String(b.id || '').toLowerCase()); if (!t) ralat('Pengguna tidak dijumpai.');
  if (u.PERANAN === 'ADMIN_NEGERI' && (t.PERANAN !== 'JURULATIH' || t.NEGERI !== u.NEGERI)) ralat('Di luar skop anda.');
  if (t.PERANAN === 'SUPER_ADMIN') ralat('Tidak boleh.');
  if (String(b.kata || '').length < 6) ralat('Kata laluan sekurang-kurangnya 6 aksara.');
  var salt = rawak().slice(0, 16);
  kemas('PENGGUNA', t._r, { HASH: hash(b.kata, salt), SALT: salt, GAGAL: 0, KUNCI_HINGGA: '' });
  audit(u.ID, 'RESET_KATA', t.ID);
  return { mesej: 'Kata laluan ' + t.ID + ' telah ditetapkan semula.' };
};

// ----- Kelulusan (Admin Negeri / Super Admin) -----
function infoJurulatih(x) {
  var g = gel(x.ID_GEL);
  return { id: x.ID, nama: x.NAMA, telefon: x.TELEFON, negeri: x.NEGERI, idGel: x.ID_GEL, gelNama: g ? g.NAMA : '-', gelStatus: g ? g.STATUS : '-',
    ketua: x.KETUA === 'YA', status: x.STATUS, tarikh: x.TARIKH_DAFTAR };
}
API.senarai_menunggu = function (b, u) {
  perlu(u, ['SUPER_ADMIN', 'ADMIN_NEGERI']);
  var gels = baca('GELANGGANG').filter(function (g) { return g.STATUS === 'MENUNGGU' && skopNegeri(u, g.NEGERI); }).map(function (g) {
    var k = pengguna(g.KETUA_ID);
    return { id: g.ID_GEL, nama: g.NAMA, negeri: g.NEGERI, alamat: g.ALAMAT, tarikh: g.TARIKH_DAFTAR, ketuaId: g.KETUA_ID, ketuaNama: k ? k.NAMA : '-', ketuaTel: k ? k.TELEFON : '-' };
  });
  var jur = baca('PENGGUNA').filter(function (x) {
    if (x.PERANAN !== 'JURULATIH' || x.STATUS !== 'MENUNGGU' || !skopNegeri(u, x.NEGERI)) return false;
    var g = gel(x.ID_GEL); return g && g.STATUS !== 'MENUNGGU'; // ketua gelanggang baharu diluluskan bersama gelanggang
  }).map(infoJurulatih);
  return { gelanggang: gels, jurulatih: jur };
};

API.lulus_gelanggang = function (b, u) {
  perlu(u, ['SUPER_ADMIN', 'ADMIN_NEGERI']);
  var g = gel(b.idGel); if (!g) ralat('Gelanggang tidak dijumpai.');
  wajibSkop(u, g.NEGERI);
  if (g.STATUS !== 'MENUNGGU') ralat('Gelanggang ini bukan berstatus MENUNGGU.');
  var kod = String(b.kod || '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(kod)) ralat('Kod gelanggang mesti 3 huruf (A–Z).');
  if (cari('GELANGGANG', function (x) { return x.NEGERI === g.NEGERI && x.KOD === kod; })) ralat('Kod ' + kod + ' sudah digunakan di negeri ini.');
  kemas('GELANGGANG', g._r, { KOD: kod, KOD_PENUH: g.NEGERI + '-' + kod, STATUS: 'AKTIF', SIRI_TERAKHIR: g.SIRI_TERAKHIR || '0', AKTIVITI_TERAKHIR: hari() });
  var k = pengguna(g.KETUA_ID);
  if (k && k.STATUS === 'MENUNGGU') kemas('PENGGUNA', k._r, { STATUS: 'AKTIF', KETUA: 'YA' });
  audit(u.ID, 'LULUS_GELANGGANG', g.NEGERI + '-' + kod + ' ' + g.NAMA);
  return { mesej: 'Gelanggang ' + g.NAMA + ' diluluskan dengan kod ' + g.NEGERI + '-' + kod + '. Ketua juga diaktifkan.' };
};

API.status_gelanggang = function (b, u) {
  perlu(u, ['SUPER_ADMIN', 'ADMIN_NEGERI']);
  var g = gel(b.idGel); if (!g) ralat('Gelanggang tidak dijumpai.');
  wajibSkop(u, g.NEGERI);
  var st = String(b.status || '');
  if (['AKTIF', 'TIDAK AKTIF', 'DISEKAT'].indexOf(st) < 0) ralat('Status tidak sah.');
  if (u.PERANAN !== 'SUPER_ADMIN' && (st === 'DISEKAT' || g.STATUS === 'DISEKAT')) ralat('Hanya Super Admin boleh sekat / buka sekatan gelanggang.');
  if (st === 'AKTIF' && !g.KOD) ralat('Gelanggang belum diluluskan (tiada kod). Guna butang Lulus.');
  kemas('GELANGGANG', g._r, { STATUS: st });
  if (g.STATUS === 'MENUNGGU' && st !== 'AKTIF') {
    var k = pengguna(g.KETUA_ID); if (k && k.STATUS === 'MENUNGGU') kemas('PENGGUNA', k._r, { STATUS: 'DITOLAK' });
  }
  audit(u.ID, 'STATUS_GELANGGANG', g.ID_GEL + ' → ' + st);
  return { mesej: 'Status ' + g.NAMA + ' kini ' + st + '.' };
};

API.status_jurulatih = function (b, u) {
  perlu(u, ['SUPER_ADMIN', 'ADMIN_NEGERI']);
  var t = pengguna(String(b.id || '')); if (!t || t.PERANAN !== 'JURULATIH') ralat('Jurulatih tidak dijumpai.');
  wajibSkop(u, t.NEGERI);
  var st = String(b.status || '');
  if (['AKTIF', 'DIGANTUNG', 'DITOLAK'].indexOf(st) < 0) ralat('Status tidak sah.');
  var g = gel(t.ID_GEL);
  if (st === 'AKTIF' && (!g || g.STATUS !== 'AKTIF')) ralat('Gelanggang jurulatih ini belum AKTIF. Luluskan gelanggang dahulu.');
  kemas('PENGGUNA', t._r, { STATUS: st });
  audit(u.ID, 'STATUS_JURULATIH', t.ID + ' → ' + st);
  return { mesej: t.NAMA + ' kini ' + st + '.' };
};

API.tetap_ketua = function (b, u) {
  perlu(u, ['SUPER_ADMIN', 'ADMIN_NEGERI']);
  var t = pengguna(String(b.id || '')); if (!t || t.PERANAN !== 'JURULATIH') ralat('Jurulatih tidak dijumpai.');
  wajibSkop(u, t.NEGERI);
  baca('PENGGUNA').filter(function (x) { return x.ID_GEL === t.ID_GEL && x.KETUA === 'YA'; }).forEach(function (x) { kemas('PENGGUNA', x._r, { KETUA: 'TIDAK' }); });
  kemas('PENGGUNA', t._r, { KETUA: 'YA' });
  var g = gel(t.ID_GEL); if (g) kemas('GELANGGANG', g._r, { KETUA_ID: t.ID });
  audit(u.ID, 'TETAP_KETUA', t.ID);
  return { mesej: t.NAMA + ' kini KETUA gelanggang.' };
};

API.senarai_jurulatih = function (b, u) {
  perlu(u, ['SUPER_ADMIN', 'ADMIN_NEGERI']);
  return { senarai: baca('PENGGUNA').filter(function (x) { return x.PERANAN === 'JURULATIH' && skopNegeri(u, x.NEGERI) && (!b.idGel || x.ID_GEL === b.idGel); }).map(infoJurulatih) };
};

API.senarai_gelanggang = function (b, u) {
  perlu(u, ['SUPER_ADMIN', 'ADMIN_NEGERI']);
  return { senarai: ringkasanGelanggang(u, b.negeri, b.tahun) };
};

function ringkasanGelanggang(u, negeri, tahun) {
  tahun = String(tahun || new Date().getFullYear());
  var ahli = baca('AHLI'), yuran = baca('YURAN_TAHUNAN'), bil = {}, bayar = {};
  ahli.forEach(function (a) { if (a.STATUS === 'AKTIF') bil[a.GEL_UTAMA] = (bil[a.GEL_UTAMA] || 0) + 1; });
  yuran.forEach(function (y) { if (y.TAHUN === tahun) { bayar[y.ID_GEL] = bayar[y.ID_GEL] || {}; bayar[y.ID_GEL][y.NO_KP] = 1; } });
  return baca('GELANGGANG').filter(function (g) { return skopNegeri(u, g.NEGERI) && (!negeri || g.NEGERI === negeri); }).map(function (g) {
    var k = pengguna(g.KETUA_ID);
    return { id: g.ID_GEL, kod: g.KOD_PENUH, nama: g.NAMA, negeri: g.NEGERI, alamat: g.ALAMAT, status: g.STATUS, aktiviti: g.AKTIVITI_TERAKHIR,
      aktif: aktifSebenar(g), ketuaNama: k ? k.NAMA : '-', ketuaTel: k ? k.TELEFON : '-', bilAhli: bil[g.ID_GEL] || 0,
      bilBayar: bayar[g.ID_GEL] ? Object.keys(bayar[g.ID_GEL]).length : 0 };
  });
}

// ----- Super Admin -----
API.senarai_admin = function (b, u) {
  perlu(u, ['SUPER_ADMIN']);
  return { senarai: baca('PENGGUNA').filter(function (x) { return x.PERANAN === 'ADMIN_NEGERI'; })
    .map(function (x) { return { id: x.ID, nama: x.NAMA, telefon: x.TELEFON, negeri: x.NEGERI, status: x.STATUS }; }) };
};
API.lantik_admin = function (b, u) {
  perlu(u, ['SUPER_ADMIN']);
  var id = String(b.id || '').trim().toLowerCase();
  if (!/^[a-z0-9._]{4,30}$/.test(id)) ralat('ID pengguna 4–30 aksara (huruf kecil, nombor, titik atau _).');
  if (!NEGERI.some(function (x) { return x[0] === b.negeri; })) ralat('Pilih negeri.');
  var ada = pengguna(id);
  if (ada) {
    if (ada.PERANAN === 'SUPER_ADMIN') ralat('Tidak boleh.');
    kemas('PENGGUNA', ada._r, { PERANAN: 'ADMIN_NEGERI', NEGERI: b.negeri, STATUS: 'AKTIF', ID_GEL: '', KETUA: '' });
    audit(u.ID, 'LANTIK_ADMIN', id + ' (sedia ada) ' + b.negeri);
    return { mesej: id + ' kini Admin Negeri ' + namaNegeri(b.negeri) + '.' };
  }
  if (String(b.kata || '').length < 6) ralat('Kata laluan sekurang-kurangnya 6 aksara.');
  var salt = rawak().slice(0, 16);
  tambah('PENGGUNA', { ID: id, HASH: hash(b.kata, salt), SALT: salt, NAMA: String(b.nama || '').trim().toUpperCase(), TELEFON: String(b.telefon || ''),
    PERANAN: 'ADMIN_NEGERI', NEGERI: b.negeri, STATUS: 'AKTIF', TARIKH_DAFTAR: hari(), GAGAL: '0' });
  audit(u.ID, 'LANTIK_ADMIN', id + ' ' + b.negeri);
  return { mesej: 'Admin Negeri ' + id + ' dilantik untuk ' + namaNegeri(b.negeri) + '.' };
};
API.buang_admin = function (b, u) {
  perlu(u, ['SUPER_ADMIN']);
  var t = pengguna(String(b.id || '')); if (!t || t.PERANAN !== 'ADMIN_NEGERI') ralat('Admin tidak dijumpai.');
  kemas('PENGGUNA', t._r, { STATUS: b.aktifkan ? 'AKTIF' : 'DIGANTUNG' });
  audit(u.ID, b.aktifkan ? 'AKTIF_ADMIN' : 'BUANG_ADMIN', t.ID);
  return { mesej: t.ID + (b.aktifkan ? ' diaktifkan semula.' : ' dibuang (digantung).') };
};
API.tetapan_get = function (b, u) {
  perlu(u, ['SUPER_ADMIN']);
  var o = {}; baca('TETAPAN').forEach(function (x) { o[x.KUNCI] = x.NILAI; });
  return { tetapan: o };
};
API.tetapan_set = function (b, u) {
  perlu(u, ['SUPER_ADMIN']);
  if (['NAMA_SISTEM', 'YURAN_LALAI'].indexOf(b.kunci) < 0) ralat('Tetapan tidak dikenali.');
  setTetapan(b.kunci, String(b.nilai || ''));
  audit(u.ID, 'TETAPAN', b.kunci);
  return { mesej: 'Tetapan disimpan.' };
};
API.jana_kunci_import = function (b, u) {
  perlu(u, ['SUPER_ADMIN']);
  var k = rawak().slice(0, 24); setTetapan('IMPORT_KEY', k); audit(u.ID, 'JANA_KUNCI_IMPORT', '');
  return { kunci: k };
};
API.log_audit = function (b, u) {
  perlu(u, ['SUPER_ADMIN']);
  var a = baca('LOG_AUDIT'); return { senarai: a.slice(-200).reverse() };
};

// ----- Ahli (Jurulatih) -----
function ahliKp(no) { return cari('AHLI', function (a) { return a.NO_KP === no; }); }
function keahlianDi(no, idGel) { return cari('KEAHLIAN_GELANGGANG', function (k) { return k.NO_KP === no && k.ID_GEL === idGel && k.STATUS !== 'BERPINDAH'; }); }
function jenaNoAhli(g) {
  var siri = (+g.SIRI_TERAKHIR || 0) + 1;
  kemas('GELANGGANG', g._r, { SIRI_TERAKHIR: siri });
  g.SIRI_TERAKHIR = String(siri);
  return g.KOD_PENUH + '-' + ('000' + siri).slice(-4);
}
function bersihAhli(a) {
  var j = String(a.jantina || '').toUpperCase().charAt(0);
  if (j !== 'L' && j !== 'P') ralat('Pilih jantina.');
  var nm = String(a.nama || '').trim().toUpperCase(); if (!nm) ralat('Isi nama ahli.');
  return { NAMA: nm, JANTINA: j, TARIKH_LAHIR: String(a.tarikhLahir || ''), BENGKUNG: String(a.bengkung || '').toUpperCase(), TEL_WARIS: String(a.telWaris || '') };
}

API.semak_kp = function (b, u) {
  var g = gelSaya(u);
  var no = kp(b.noKp); if (no.length !== 12) ralat('No. KP mesti 12 digit.');
  var a = ahliKp(no);
  if (!a) return { wujud: false };
  var ug = gel(a.GEL_UTAMA), di = keahlianDi(no, g.ID_GEL);
  return { wujud: true, noAhli: a.NO_AHLI, nama: a.NAMA, status: a.STATUS, gelUtama: ug ? ug.NAMA + ' (' + namaNegeri(ug.NEGERI) + ')' : '-',
    utamaDiSini: a.GEL_UTAMA === g.ID_GEL, diSini: di ? di.JENIS : '' };
};

API.daftar_ahli = function (b, u) {
  var g = gelSaya(u, true);
  var no = kp(b.ahli && b.ahli.noKp); if (no.length !== 12) ralat('No. KP mesti 12 digit.');
  var a = ahliKp(no), mod = b.mod || 'baru', t = hari();
  if (!a) {
    var d = bersihAhli(b.ahli);
    d.NO_AHLI = jenaNoAhli(g); d.NO_KP = no; d.GEL_UTAMA = g.ID_GEL; d.NEGERI = g.NEGERI; d.STATUS = 'AKTIF'; d.TARIKH_DAFTAR = t;
    tambah('AHLI', d);
    tambah('KEAHLIAN_GELANGGANG', { NO_KP: no, ID_GEL: g.ID_GEL, JENIS: 'UTAMA', STATUS: 'AKTIF', TARIKH_MULA: t });
    audit(u.ID, 'DAFTAR_AHLI', d.NO_AHLI);
    return { mesej: 'Ahli didaftarkan. No. ahli: ' + d.NO_AHLI, noAhli: d.NO_AHLI };
  }
  var di = keahlianDi(no, g.ID_GEL);
  if (mod === 'pindah') {
    if (a.GEL_UTAMA === g.ID_GEL) ralat('Ahli ini sudah berada di gelanggang anda sebagai gelanggang utama.');
    baca('KEAHLIAN_GELANGGANG').filter(function (k) { return k.NO_KP === no && k.JENIS === 'UTAMA' && k.STATUS !== 'BERPINDAH'; })
      .forEach(function (k) { kemas('KEAHLIAN_GELANGGANG', k._r, { STATUS: 'BERPINDAH', TARIKH_TAMAT: t }); });
    if (di) kemas('KEAHLIAN_GELANGGANG', di._r, { JENIS: 'UTAMA', STATUS: 'AKTIF' });
    else tambah('KEAHLIAN_GELANGGANG', { NO_KP: no, ID_GEL: g.ID_GEL, JENIS: 'UTAMA', STATUS: 'AKTIF', TARIKH_MULA: t });
    kemas('AHLI', a._r, { GEL_UTAMA: g.ID_GEL, NEGERI: g.NEGERI, STATUS: 'AKTIF' });
    audit(u.ID, 'PINDAH_AHLI', a.NO_AHLI + ' dari ' + a.GEL_UTAMA);
    return { mesej: a.NAMA + ' dipindahkan ke gelanggang anda. No. ahli kekal: ' + a.NO_AHLI, noAhli: a.NO_AHLI };
  }
  if (mod === 'bersama') {
    if (di) ralat('Ahli ini sudah berdaftar di gelanggang anda.');
    tambah('KEAHLIAN_GELANGGANG', { NO_KP: no, ID_GEL: g.ID_GEL, JENIS: 'BERSAMA', STATUS: 'AKTIF', TARIKH_MULA: t });
    audit(u.ID, 'AHLI_BERSAMA', a.NO_AHLI);
    return { mesej: a.NAMA + ' ditambah sebagai Ahli Bersama. No. ahli: ' + a.NO_AHLI, noAhli: a.NO_AHLI };
  }
  ralat('No. KP ini sudah berdaftar (' + a.NO_AHLI + '). Pilih Pindah atau Ahli Bersama.');
};

API.edit_ahli = function (b, u) {
  var no = kp(b.noKp), a = ahliKp(no); if (!a) ralat('Ahli tidak dijumpai.');
  if (u.PERANAN === 'JURULATIH') { var g = gelSaya(u, true); if (a.GEL_UTAMA !== g.ID_GEL) ralat('Hanya gelanggang utama ahli boleh ubah butiran peribadi.'); }
  else perlu(u, ['SUPER_ADMIN']);
  var d = bersihAhli(b.ahli);
  kemas('AHLI', a._r, d);
  audit(u.ID, 'EDIT_AHLI', a.NO_AHLI);
  return { mesej: 'Butiran ' + a.NO_AHLI + ' dikemas kini.' };
};

API.status_ahli = function (b, u) {
  var g = gelSaya(u, true);
  var no = kp(b.noKp), a = ahliKp(no); if (!a) ralat('Ahli tidak dijumpai.');
  var st = String(b.status || ''); if (ST_AHLI.indexOf(st) < 0) ralat('Status tidak sah.');
  var k = keahlianDi(no, g.ID_GEL); if (!k) ralat('Ahli ini bukan ahli gelanggang anda.');
  kemas('KEAHLIAN_GELANGGANG', k._r, { STATUS: st });
  if (k.JENIS === 'UTAMA') kemas('AHLI', a._r, { STATUS: st });
  audit(u.ID, 'STATUS_AHLI', a.NO_AHLI + ' → ' + st);
  return { mesej: a.NAMA + ' kini ' + st + (k.JENIS === 'BERSAMA' ? ' (di gelanggang anda sahaja)' : '') + '.' };
};

API.senarai_ahli = function (b, u) {
  var tahun = String(b.tahun || new Date().getFullYear());
  var bayar = {};
  baca('YURAN_TAHUNAN').forEach(function (y) { if (y.TAHUN === tahun) bayar[y.NO_KP] = y; });
  var peta = {}; baca('AHLI').forEach(function (a) { peta[a.NO_KP] = a; });
  var gels = {}; baca('GELANGGANG').forEach(function (g) { gels[g.ID_GEL] = g; });
  var out = [];
  if (u.PERANAN === 'JURULATIH') {
    var g = gelSaya(u);
    baca('KEAHLIAN_GELANGGANG').forEach(function (k) {
      if (k.ID_GEL !== g.ID_GEL || (k.STATUS === 'BERPINDAH' && !b.semua)) return;
      var a = peta[k.NO_KP]; if (!a) return;
      var y = bayar[k.NO_KP];
      out.push({ noAhli: a.NO_AHLI, noKp: formatKp(a.NO_KP), nama: a.NAMA, jantina: a.JANTINA, tarikhLahir: a.TARIKH_LAHIR, bengkung: a.BENGKUNG,
        telWaris: a.TEL_WARIS, status: k.JENIS === 'UTAMA' ? a.STATUS : k.STATUS, jenis: k.JENIS, statusKeahlian: k.STATUS, tarikhDaftar: k.TARIKH_MULA,
        idLama: a.ID_LAMA, bayar: y ? { jumlah: y.JUMLAH, tarikh: y.TARIKH_BAYAR, diSini: y.ID_GEL === g.ID_GEL } : null });
    });
  } else {
    perlu(u, ['SUPER_ADMIN', 'ADMIN_NEGERI']);
    var penuh = u.PERANAN === 'SUPER_ADMIN';
    baca('AHLI').forEach(function (a) {
      var ug = gels[a.GEL_UTAMA]; if (!ug || !skopNegeri(u, ug.NEGERI)) return;
      if (b.idGel && a.GEL_UTAMA !== b.idGel) return;
      if (b.negeri && ug.NEGERI !== b.negeri) return;
      out.push({ noAhli: a.NO_AHLI, noKp: penuh ? formatKp(a.NO_KP) : topeng(a.NO_KP), nama: a.NAMA, jantina: a.JANTINA, bengkung: a.BENGKUNG,
        status: a.STATUS, gel: ug.NAMA, negeri: ug.NEGERI, jenis: 'UTAMA', bayar: bayar[a.NO_KP] ? { jumlah: bayar[a.NO_KP].JUMLAH } : null });
    });
  }
  out.sort(function (x, y) { return x.noAhli < y.noAhli ? -1 : 1; });
  return { senarai: out, tahun: tahun };
};

API.rekod_yuran = function (b, u) {
  var g = gelSaya(u, true);
  var no = kp(b.noKp), a = ahliKp(no); if (!a) ralat('Ahli tidak dijumpai.');
  if (!keahlianDi(no, g.ID_GEL)) ralat('Ahli ini bukan ahli gelanggang anda.');
  var th = String(b.tahun || ''); if (!/^\d{4}$/.test(th)) ralat('Tahun tidak sah.');
  var jml = Number(b.jumlah); if (!(jml > 0)) ralat('Isi jumlah yuran.');
  var ada = cari('YURAN_TAHUNAN', function (y) { return y.NO_KP === no && y.TAHUN === th; });
  if (ada && !b.paksa) {
    var ag = gel(ada.ID_GEL);
    return { ok: false, amaran: true, ralat: 'AMARAN: ' + a.NAMA + ' sudah bayar yuran tahunan ' + th + ' (RM' + ada.JUMLAH + ', ' + ada.TARIKH_BAYAR + ' di ' + (ag ? ag.NAMA : '-') + '). Yuran hanya sekali setahun. Rekod juga?' };
  }
  tambah('YURAN_TAHUNAN', { NO_KP: no, ID_GEL: g.ID_GEL, TAHUN: th, JUMLAH: jml.toFixed(2), TARIKH_BAYAR: String(b.tarikh || hari()), DIREKOD_OLEH: u.ID, SUMBER: 'PUSAT' });
  audit(u.ID, 'REKOD_YURAN', a.NO_AHLI + ' ' + th + ' RM' + jml);
  return { mesej: 'Yuran ' + th + ' untuk ' + a.NAMA + ' direkod.' };
};

API.padam_yuran = function (b, u) {
  var g = gelSaya(u, true);
  var no = kp(b.noKp), th = String(b.tahun || '');
  var y = cari('YURAN_TAHUNAN', function (x) { return x.NO_KP === no && x.TAHUN === th && x.ID_GEL === g.ID_GEL; });
  if (!y) ralat('Rekod yuran tidak dijumpai di gelanggang anda.');
  sh('YURAN_TAHUNAN').deleteRow(y._r); delete MEMO.YURAN_TAHUNAN;
  audit(u.ID, 'PADAM_YURAN', no + ' ' + th);
  return { mesej: 'Rekod yuran dipadam.' };
};

// ----- Papan pemuka -----
API.dashboard = function (b, u) {
  perlu(u, ['SUPER_ADMIN', 'ADMIN_NEGERI']);
  var tahun = String(b.tahun || new Date().getFullYear());
  var kunci = 'dash_' + u.PERANAN + '_' + (u.NEGERI || 'ALL') + '_' + tahun;
  var c = CacheService.getScriptCache(), simpan = !b.segar && c.get(kunci);
  if (simpan) return JSON.parse(simpan);
  var gels = {}; baca('GELANGGANG').forEach(function (g) { gels[g.ID_GEL] = g; });
  var neg = {};
  baca('AHLI').forEach(function (a) {
    if (a.STATUS !== 'AKTIF') return;
    var g = gels[a.GEL_UTAMA]; var n = g ? g.NEGERI : a.NEGERI;
    if (!skopNegeri(u, n)) return;
    neg[n] = neg[n] || { L: 0, P: 0 };
    neg[n][a.JANTINA === 'P' ? 'P' : 'L']++;
  });
  var senarai = ringkasanGelanggang(u, '', tahun);
  var mn = API.senarai_menunggu(b, u);
  var r = { ok: true, tahun: tahun,
    negeri: Object.keys(neg).sort().map(function (k) { return { kod: k, nama: namaNegeri(k), L: neg[k].L, P: neg[k].P, jumlah: neg[k].L + neg[k].P }; }),
    gelAktif: senarai.filter(function (g) { return g.aktif; }).length,
    gelTidakAktif: senarai.filter(function (g) { return !g.aktif && g.status !== 'MENUNGGU'; }).length,
    gelanggang: senarai, menunggu: { gelanggang: mn.gelanggang.length, jurulatih: mn.jurulatih.length },
    masa: Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm') };
  try { c.put(kunci, JSON.stringify(r), 60); } catch (x) {}
  return r;
};

// ---------------- Import dari sistem lama ----------------
function keTarikh(s) {
  s = String(s || '').trim(); if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  var m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  var d = new Date(s); return isNaN(d) ? '' : Utilities.formatDate(d, TZ, 'yyyy-MM-dd');
}
function petaStatusLama(s) {
  s = String(s || '').toUpperCase().trim();
  if (s === 'AKTIF' || s === '') return 'AKTIF';
  if (s.indexOf('GANTUNG') >= 0) return 'DIGANTUNG';
  if (s.indexOf('BATAL') >= 0) return 'DIBATALKAN';
  return 'TIDAK AKTIF';
}
/** Teras import — idempotent (padan ikut No. KP). Tidak pernah menulis ke sheet lama. */
function terasImport(kodPenuh, ahliLama, yuranLama, olehId) {
  var g = cari('GELANGGANG', function (x) { return x.KOD_PENUH === String(kodPenuh || '').toUpperCase(); });
  if (!g) ralat('Gelanggang ' + kodPenuh + ' tidak dijumpai di Pusat. Daftar & luluskan gelanggang dahulu.');
  if (g.STATUS === 'MENUNGGU') ralat('Gelanggang ' + kodPenuh + ' belum diluluskan.');
  var t = hari(), peta = {}, kh = {}, yr = {};
  baca('AHLI').forEach(function (a) { peta[a.NO_KP] = a; });
  baca('KEAHLIAN_GELANGGANG').forEach(function (k) { if (k.ID_GEL === g.ID_GEL && k.STATUS !== 'BERPINDAH') kh[k.NO_KP] = 1; });
  baca('YURAN_TAHUNAN').forEach(function (y) { yr[y.NO_KP + '|' + y.TAHUN] = 1; });
  var siri = +g.SIRI_TERAKHIR || 0, baruA = [], baruK = [], baruY = [], hasil = { ahliBaru: 0, ahliSedia: 0, langkau: 0, yuranBaru: 0, yuranSedia: 0 };
  (ahliLama || []).forEach(function (r) {
    var no = kp(r.NO_KP);
    if (no.length !== 12) { hasil.langkau++; return; }
    var a = peta[no];
    if (a) {
      hasil.ahliSedia++;
      if (!a.ID_LAMA && r.ID_AHLI) kemas('AHLI', a._r, { ID_LAMA: r.ID_AHLI });
      if (!kh[no]) { baruK.push({ NO_KP: no, ID_GEL: g.ID_GEL, JENIS: a.GEL_UTAMA === g.ID_GEL ? 'UTAMA' : 'BERSAMA', STATUS: 'AKTIF', TARIKH_MULA: t }); kh[no] = 1; }
      return;
    }
    siri++;
    var j = String(r.JANTINA || '').toUpperCase().charAt(0); j = j === 'P' || j === 'W' ? 'P' : 'L';
    var st = petaStatusLama(r.STATUS);
    var d = { NO_AHLI: g.KOD_PENUH + '-' + ('000' + siri).slice(-4), NO_KP: no, NAMA: String(r.NAMA_PENUH || '').trim().toUpperCase(), JANTINA: j,
      TARIKH_LAHIR: keTarikh(r.TARIKH_LAHIR), BENGKUNG: String(r.BENGKUNG_SEMASA || '').toUpperCase(), GEL_UTAMA: g.ID_GEL, NEGERI: g.NEGERI,
      STATUS: st, TARIKH_DAFTAR: keTarikh(r.TARIKH_DAFTAR) || t, TEL_WARIS: String(r.NO_TEL_WARIS || ''), ID_LAMA: String(r.ID_AHLI || '') };
    baruA.push(d); peta[no] = d; kh[no] = 1;
    baruK.push({ NO_KP: no, ID_GEL: g.ID_GEL, JENIS: 'UTAMA', STATUS: st, TARIKH_MULA: d.TARIKH_DAFTAR });
    hasil.ahliBaru++;
  });
  (yuranLama || []).forEach(function (y) {
    if (String(y.JENIS_YURAN || '').toUpperCase().indexOf('TAHUNAN') < 0) return;
    if (String(y.STATUS_PENGESAHAN || '').toUpperCase().indexOf('TOLAK') >= 0) return;
    var no = kp(y.NO_KP), th = String(y.TAHUN || '').trim();
    if (!/^\d{4}$/.test(th)) th = (keTarikh(y.TARIKH_BAYAR) || '').slice(0, 4);
    if (no.length !== 12 || !th || !peta[no]) return;
    if (yr[no + '|' + th]) { hasil.yuranSedia++; return; }
    yr[no + '|' + th] = 1;
    baruY.push({ NO_KP: no, ID_GEL: g.ID_GEL, TAHUN: th, JUMLAH: (Number(String(y.JUMLAH_BAYARAN).replace(/[^\d.]/g, '')) || 0).toFixed(2),
      TARIKH_BAYAR: keTarikh(y.TARIKH_BAYAR), DIREKOD_OLEH: olehId, SUMBER: 'IMPORT ' + String(y.ID_BAYARAN || '') });
    hasil.yuranBaru++;
  });
  tambahBanyak('AHLI', baruA); tambahBanyak('KEAHLIAN_GELANGGANG', baruK); tambahBanyak('YURAN_TAHUNAN', baruY);
  kemas('GELANGGANG', g._r, { SIRI_TERAKHIR: siri, AKTIVITI_TERAKHIR: t });
  audit(olehId, 'IMPORT', g.KOD_PENUH + ' ' + JSON.stringify(hasil));
  return hasil;
}
function bacaSheetObj(s) {
  if (!s) return [];
  var v = s.getDataRange().getDisplayValues(), h = v[0].map(function (x) { return String(x).trim().toUpperCase(); }), out = [];
  for (var i = 1; i < v.length; i++) { var o = {}; for (var j = 0; j < h.length; j++) o[h[j]] = v[i][j]; out.push(o); }
  return out;
}
/** Jalankan dari editor: baca sheet lama (BACA SAHAJA) dan import ke Pusat. */
function importDariSheetLama(idSheetLama, kodGelanggang) {
  var lama = SpreadsheetApp.openById(idSheetLama);
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    var h = terasImport(kodGelanggang, bacaSheetObj(lama.getSheetByName('AHLI')), bacaSheetObj(lama.getSheetByName('YURAN')), 'IMPORT_EDITOR');
    Logger.log('IMPORT SELESAI: ' + JSON.stringify(h));
    return h;
  } finally { lock.releaseLock(); }
}
/** Butang mudah: isi IMPORT_ID_SHEET_LAMA & IMPORT_KOD_GELANGGANG di atas, kemudian jalankan fungsi ini. */
function importSaya() {
  if (!IMPORT_ID_SHEET_LAMA || !IMPORT_KOD_GELANGGANG) ralat('Isi IMPORT_ID_SHEET_LAMA dan IMPORT_KOD_GELANGGANG di bahagian atas dahulu.');
  return importDariSheetLama(IMPORT_ID_SHEET_LAMA, IMPORT_KOD_GELANGGANG);
}
/** Tindakan API: { action:'import_gelanggang', kunci, kodGelanggang, ahli:[...], yuran:[...] } */
API.import_gelanggang = function (b) {
  var k = tetapan('IMPORT_KEY');
  if (!k || b.kunci !== k) ralat('Kunci import salah.');
  return { hasil: terasImport(b.kodGelanggang, b.ahli, b.yuran, 'IMPORT_API') };
};
