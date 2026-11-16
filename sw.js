// オフラインでも動くように。ネット優先・だめならキャッシュ。
const CACHE = 'kanji-v6';
const FILES = ['./', 'index.html', 'style.css', 'js/app.js', 'js/matcher.js', 'js/audio.js', 'js/tips.js', 'js/kan.js', 'js/cloud.js', 'js/cloud-config.js', 'data/g3.json', 'data/g4.json', 'data/g5.json', 'data/g6.json', 'manifest.webmanifest', 'icon-180.png', 'icon.svg'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then((r) => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
