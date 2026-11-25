// Offline-Cache: Logik steckt im Kit (Netzwerk zuerst, Cache als Rückfall)
self.GAME_CACHE = 'thermikdoku';
self.PRECACHE = [
  'css/style.css', 'js/game.js', 'js/puzzle.js', 'js/audio.js', 'js/worker.js', 'js/i18n.js', 'kit/sprite.js',
  'i18n/de.json', 'i18n/en.json',
  'icons/icon-64.png', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
  'assets/glider-1.webp', 'assets/glider-2.webp', 'assets/glider-3.webp', 'assets/glider-4.webp',
  'assets/glider-5.webp', 'assets/glider-6.webp', 'assets/glider-happy.webp', 'assets/glider-scared.webp',
  'assets/cloud.webp',
];
importScripts('kit/sw-core.js');
