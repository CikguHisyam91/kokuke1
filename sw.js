// Service worker ringkas: simpan fail paparan, data sentiasa dari pelayan
// Tukar nombor versi setiap kali index.html dikemas kini supaya cache lama dibuang.
var CACHE = 'kokosmart-v2';
var FAIL = ['./', './index.html', './config.js', './manifest.json', './icon-192.png', './icon-512.png'];
self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FAIL); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
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
