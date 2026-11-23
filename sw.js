// オフラインでも動くように。ネット優先（毎回サーバーに新しい版がないか確かめる）・だめならキャッシュ。
const CACHE = 'kanji-v16';
const FILES = ['./', 'index.html', 'style.css', 'js/app.js', 'js/matcher.js', 'js/audio.js', 'js/tips.js', 'js/kan.js', 'js/cloud.js', 'js/cloud-config.js', 'data/g3.json', 'data/g4.json', 'data/g5.json', 'data/g6.json', 'data/g7.json', 'data/g8.json', 'data/g9.json', 'data/g10.json', 'manifest.webmanifest', 'icon-180.png', 'icon-512.png', 'icon-64.png'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const same = new URL(e.request.url).origin === self.location.origin;
  if (!same) return; // Firestore などはそのまま通す
  e.respondWith(
    // ブラウザの一時保存（10分間）を使わず、かならず最新かどうか確かめる
    fetch(e.request.url, { cache: 'no-cache' }).then((r) => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
