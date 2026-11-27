// ===== Peranan.gs — log masuk ikut peranan (PK / SU Sukan / JK Statistik) =====
// Satu pautan, kata laluan berbeza = paparan berbeza.
//   Kata laluan sistem (sedia ada)  → 'pk'  (akses penuh, seperti biasa)
//   Kata laluan SU Sukan            → 'su'  (modul Sukan Tahunan sahaja)
//   Kata laluan JK Statistik        → 'js'  (modul Sukan Tahunan sahaja)
// Kata laluan SU/JS disimpan dalam Script Properties (PW_SU, PW_JS) supaya PK boleh membacanya
// jika guru terlupa. Kata laluan lalai di bawah dipakai sehingga PK menukarnya dalam menu Tetapan.
// Fail ini TIDAK mengandungi kata laluan sistem; ia memanggil kataLaluanSemasa() dalam Code.gs.

var PERANAN_LALAI = { SU: 'ssukanke1', JS: 'staske1' };

// fungsi yang boleh dipanggil oleh SU Sukan dan JK Statistik
var PERANAN_FUNGSI = ['dapatkanDataSistem', 'dapatkanRekodModul', 'simpanRekodModul', 'simpanRekodModulPukal', 'padamRekodModul'];
// fungsi tulis rekod hanya untuk sheet Sukan Tahunan ("KOKO - SUKAN ...")
var PERANAN_TULIS = ['simpanRekodModul', 'simpanRekodModulPukal', 'padamRekodModul'];

function _pwPeranan(k) {
  return PropertiesService.getScriptProperties().getProperty('PW_' + k) || PERANAN_LALAI[k];
}

// token → 'pk' | 'su' | 'js' | ''
function perananToken(token) {
  token = String(token || '');
  if (!token) return '';
  if (token === kataLaluanSemasa()) return 'pk';
  if (token === _pwPeranan('SU')) return 'su';
  if (token === _pwPeranan('JS')) return 'js';
  return '';
}

// adakah peranan ini dibenarkan memanggil fungsi fn?
function perananBoleh(peranan, fn, args) {
  if (peranan === 'pk') return true;
  if (PERANAN_FUNGSI.indexOf(fn) < 0) return false;
  if (PERANAN_TULIS.indexOf(fn) >= 0) return /^SUKAN /i.test(String((args || [])[0] || ''));
  return true;
}

// tapis hasil supaya SU/JS hanya menerima data Sukan Tahunan daripada rekod modul
function tapisPeranan(peranan, fn, hasil) {
  if (peranan === 'pk' || fn !== 'dapatkanRekodModul' || !hasil || !hasil.modul) return hasil;
  var m = {};
  Object.keys(hasil.modul).forEach(function (k) { if (/^SUKAN /i.test(k)) m[k] = hasil.modul[k]; });
  hasil.modul = m;
  return hasil;
}

// ---- untuk PK sahaja (tidak tersenarai dalam PERANAN_FUNGSI) ----
function dapatkanKataLaluanPeranan() {
  return { success: true, su: _pwPeranan('SU'), js: _pwPeranan('JS') };
}

function simpanKataLaluanPeranan(o) {
  try {
    o = o || {};
    var su = String(o.su || '').trim(), js = String(o.js || '').trim();
    if (su.length < 6 || js.length < 6) return { success: false, error: 'Kata laluan mesti sekurang-kurangnya 6 aksara.' };
    if (su === js) return { success: false, error: 'Kata laluan SU Sukan dan JK Statistik mesti berbeza.' };
    if (su === kataLaluanSemasa() || js === kataLaluanSemasa()) return { success: false, error: 'Jangan guna kata laluan sistem PK.' };
    PropertiesService.getScriptProperties().setProperties({ PW_SU: su, PW_JS: js });
    return { success: true };
  } catch (e) { return { success: false, error: e.toString() }; }
}
