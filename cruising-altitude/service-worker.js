const CACHE_NAME = 'cruising-altitude-v10';
const ASSETS_TO_CACHE = [
  'index.html',
  'styles.css',
  'manifest.json',
  'bundle.js',
  'webgl/index.js',
  'webgl/config.js',
  'webgl/sprites.js',
  'webgl/particles.js',
  'webgl/lighting.js',
  'webgl/scene-terminal.js',
  'webgl/scene-map.js',
  'webgl/scene-encounter.js',
  'icons/icon-192x192.png',
  'icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response;
      return fetch(event.request).then((resp) => {
        // Cache same-origin 200s plus the pinned Pixi CDN (opaque) so the
        // WebGL stage works offline after the first online load. Nothing
        // here runs at push time — plain static precache + runtime fill.
        const cacheable = resp && (
          (resp.status === 200 && resp.type === 'basic') ||
          (resp.type === 'opaque' && event.request.method === 'GET' &&
            event.request.url.startsWith('https://cdn.jsdelivr.net/npm/pixi.js@'))
        );
        if (!cacheable) return resp;
        const clone = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return resp;
      });
    })
  );
});
