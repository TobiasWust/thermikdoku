// Offline-Cache für Thermikdoku
const CACHE = 'thermikdoku-v10';
const ASSETS = [
  './', 'index.html', 'css/style.css', 'js/app.js', 'js/puzzle.js', 'js/audio.js', 'js/worker.js',
  'manifest.webmanifest', 'icons/icon-64.png', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
  'assets/glider-1.webp', 'assets/glider-2.webp', 'assets/glider-3.webp', 'assets/glider-4.webp',
  'assets/glider-5.webp', 'assets/glider-6.webp', 'assets/glider-happy.webp', 'assets/glider-scared.webp',
  'assets/cloud.webp',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Netzwerk zuerst (damit Updates ankommen), sonst Cache
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== self.location.origin) return; // z. B. GoatCounter
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
