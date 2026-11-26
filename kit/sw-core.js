// Kit Service Worker: Netzwerk zuerst (Updates kommen sofort an), Cache als Fallback (offline).
// Einbinden im Spiel über sw.js:  self.GAME_CACHE = 'mein-spiel'; importScripts('kit/sw-core.js');
const CACHE = `${self.GAME_CACHE || 'game'}-v1`;
const PRECACHE = ['./', 'index.html', 'manifest.webmanifest', 'kit/kit.js', 'kit/audio.js', 'kit/legal.js', 'kit/strings.js', 'kit/sprite.js', 'kit/kit.css', ...(self.PRECACHE || [])];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(PRECACHE.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k.startsWith(self.GAME_CACHE || 'game')).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== self.location.origin) return; // z.B. GoatCounter
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
