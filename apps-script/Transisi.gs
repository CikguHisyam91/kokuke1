// ============================================================
// KOKOSMART PRO — Transisi.gs
// Transisi tahun baharu ikut PELAN yang sama seperti simulasi dalam KokoSmart
// (menu: Transisi Tahun Baharu). Fail ini berdiri sendiri.
//
// Urutan:
//   1. Simpanan penuh ke folder Drive "KOKOSMART SIMPANAN" (perlu Simpanan.gs);
//      jika tiada, salin sheet MASTER & ARKIB sebagai "SIMPANAN <tahun> - MASTER/ARKIB"
//   2. Murid NAIK: tahun, uniform, kelab, sukan dikemas kini ikut pelan
//      (rumah sukan & kelas tidak diubah)
//   3. Murid GRADUAN (Tahun 6): dipindah ke ARKIB dengan catatan "GRADUASI <tahun>"
//   4. Murid yang tiada dalam pelan: tidak diubah
// ============================================================

function laksanaTransisiTahun(pwd, pelan, tahunLama) {
  try {
    var kunci = (typeof kataLaluanSemasa === 'function')
      ? kataLaluanSemasa()
      : (PropertiesService.getScriptProperties().getProperty('SISTEM_KATA_LAUAN') || '');
    if (!kunci || String(pwd || '').trim() !== String(kunci)) return { success: false, error: 'Kata laluan salah!' };
    if (!pelan || !pelan.length) return { success: false, error: 'Pelan transisi kosong.' };

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var master = ss.getSheetByName('DATA MASTER - MASTER') || ss.getSheetByName('MASTER');
    if (!master) return { success: false, error: 'Sheet MASTER tidak dijumpai' };
    var arkib = ss.getSheetByName('DATA MASTER - ARKIB') || ss.getSheetByName('ARKIB');
    if (!arkib) {
      arkib = ss.insertSheet('DATA MASTER - ARKIB');
      arkib.appendRow(['BIL', 'TAHUN', 'KELAS', 'NAMA MURID', 'RUMAH', 'UNIFORM', 'KELAB', 'SUKAN', 'CATATAN']);
    }
    var thn = String(tahunLama || new Date().getFullYear());

    // 1) SALINAN SIMPANAN dahulu: fail penuh dalam folder Drive "KOKOSMART SIMPANAN" (Simpanan.gs);
    //    jika Simpanan.gs belum dipasang, salin sheet MASTER & ARKIB dalam fail yang sama.
    var namaSimpan;
    if (typeof buatSimpanan === 'function') {
      var sp = buatSimpanan('SEBELUM TRANSISI ' + (parseInt(thn, 10) + 1), thn);
      if (!sp.success) return { success: false, error: 'Simpanan gagal, transisi dibatalkan: ' + sp.error };
      namaSimpan = sp.nama;
    } else {
      namaSimpan = _trNamaUnik(ss, 'SIMPANAN ' + thn + ' - MASTER');
      master.copyTo(ss).setName(namaSimpan);
      arkib.copyTo(ss).setName(_trNamaUnik(ss, 'SIMPANAN ' + thn + ' - ARKIB'));
    }

    // Peta pelan: cuba BIL+NAMA dahulu, kemudian NAMA sahaja
    var ikutBilNama = {}, ikutNama = {};
    pelan.forEach(function (p) {
      var n = _trNama(p.nama);
      if (!n) return;
      ikutBilNama[String(p.bil || '').trim() + '|' + n] = p;
      if (!ikutNama[n]) ikutNama[n] = p;
    });

    // 2) & 3) Bina data baharu sepenuhnya sebelum menulis
    var data = master.getDataRange().getValues();
    var lebar = Math.max(9, data[0].length);
    var baru = [data[0]], graduan = [], naik = 0, kekal = 0;
    for (var i = 1; i < data.length; i++) {
      var r = data[i];
      var n = _trNama(r[3]);
      if (!n) { baru.push(r); continue; }
      var p = ikutBilNama[String(r[0]).trim() + '|' + n] || ikutNama[n];
      if (!p) { baru.push(r); kekal++; continue; }
      if (p.status === 'GRADUAN') {
        graduan.push([r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], 'GRADUASI ' + thn]);
        continue;
      }
      if (p.status === 'NAIK') {
        var b = r.slice();
        b[1] = parseInt(p.tahun, 10) || p.tahun;
        b[5] = p.uniform || '-';
        b[6] = p.kelab || '-';
        b[7] = p.sukan || '-';
        baru.push(b);
        naik++;
        continue;
      }
      baru.push(r); kekal++;
    }

    // 4) Tulis: graduan ke ARKIB, kemudian MASTER
    if (graduan.length) {
      arkib.getRange(arkib.getLastRow() + 1, 1, graduan.length, 9).setValues(_trRatakan(graduan, 9));
    }
    var tulis = _trRatakan(baru, lebar);
    master.clearContents();
    master.getRange(1, 1, tulis.length, lebar).setValues(tulis);

    return { success: true, simpanan: namaSimpan, naik: naik, graduan: graduan.length, tidakBerubah: kekal };
  } catch (e) { return { success: false, error: e.toString() }; }
}

function _trNama(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().toUpperCase(); }

function _trRatakan(rows, lebar) {
  return rows.map(function (r) { r = r.slice(0, lebar); while (r.length < lebar) r.push(''); return r; });
}

function _trNamaUnik(ss, nama) {
  if (!ss.getSheetByName(nama)) return nama;
  var t = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone() || 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HHmm');
  return nama + ' (' + t + ')';
}

// ===== TAMAT Transisi.gs =====
