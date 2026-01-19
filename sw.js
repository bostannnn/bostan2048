const CACHE_NAME = 'photo-2048-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './ui/theme.css',
  './ui/components.css',
  './core.js',
  './effects.js',
  './app.js',
  './src/core/GameInterface.js',
  './src/games/2048/index.js',
  './src/games/2048/style.css',
  './src/games/2048/components/GameManager.js',
  './src/games/2048/components/Grid.js',
  './src/games/2048/components/HTMLActuator.js',
  './src/games/2048/components/KeyboardInputManager.js',
  './src/games/2048/components/LocalStorageManager.js',
  './src/games/2048/components/Tile.js',
  './city/src/MinigameBase.js',
  './city/src/CityScene.js',
  './vendor/pixi.min.js'
];

// Add image assets dynamically if needed, or list critical ones
const THEMES = ['classic', 'nature', 'darkmode'];
const TILE_VALUES = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192];

THEMES.forEach(theme => {
    TILE_VALUES.forEach(val => {
        ASSETS_TO_CACHE.push(`./assets/${theme}/${val}.jpg`);
    });
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});