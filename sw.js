// Service worker ringkas: simpan fail paparan, data sentiasa dari pelayan
// Tukar nombor versi setiap kali index.html dikemas kini supaya cache lama dibuang.
var CACHE = 'kokosmart-v19';
var LUAR = /^https:\/\/(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;
var CDN = ['https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css', 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'];
var FAIL = ['./', './index.html', './config.js', './manifest.json', './icon-192.png', './icon-512.png', './logo.png'];
self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FAIL).then(function () { return Promise.all(CDN.map(function (x) { return c.add(x).catch(function () {}); })); }); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Bootstrap, ikon & fon dari luar: simpan dalam telefon supaya rupa aplikasi kekal walaupun tiada internet
  if (LUAR.test(e.request.url)) {
    e.respondWith(caches.match(e.request).then(function (c) {
      var net = fetch(e.request).then(function (r) { if (r && (r.ok || r.type === 'opaque')) { var cp = r.clone(); caches.open(CACHE).then(function (k) { k.put(e.request, cp); }); } return r; }).catch(function () { return c; });
      return c || net;
    }));
    return;
  }
  if (u.origin !== location.origin) return;
  var simpan = function (r) {
    if (r && r.ok) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, cp); }); }
    return r;
  };
  // Halaman & config: ambil versi terkini dahulu (kemas kini terus nampak), guna cache jika tiada internet
  if (e.request.mode === 'navigate' || /\.(html|js)$/.test(u.pathname) || u.pathname.endsWith('/')) {
    e.respondWith(fetch(e.request).then(simpan).catch(function () { return caches.match(e.request); }));
    return;
  }
  // Ikon & manifest: terus dari cache (kilat), kemas kini di latar belakang
  e.respondWith(caches.match(e.request).then(function (c) {
    var net = fetch(e.request).then(simpan).catch(function () { return c; });
    return c || net;
  }));
});
