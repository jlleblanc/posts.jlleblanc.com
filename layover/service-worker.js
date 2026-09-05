const CACHE_NAME = 'layover-v2';
const ASSETS_TO_CACHE = [
  'layover.html',
  'layover.css',
  'manifest.json',
  'icons/icon-192x192.png',
  'icons/icon-512x512.png',
  'js/app.js',
  'js/data.js',
  'js/prng.js',
  'js/time.js',
  'js/flights.js',
  'js/schedule.js',
  'js/loyalty.js',
  'js/lounge.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) return response;
      return fetch(event.request).then(resp => {
        if (!resp || resp.status !== 200 || resp.type !== 'basic') return resp;
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return resp;
      });
    })
  );
});
