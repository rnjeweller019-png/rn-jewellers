const CACHE_NAME = 'rnj-jewellers-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './collections.html',
  './product.html',
  './wishlist.html',
  './appointments.html',
  './custom-order.html',
  './about.html',
  './contact.html',
  './css/style.css',
  './css/animations.css',
  './js/config.js',
  './js/api.js',
  './js/main.js',
  './assets/logo.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => console.log('Cache addAll warning:', err));
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).then((response) => {
      // Update cache with fresh network response
      if (response && response.status === 200 && response.type === 'basic') {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, responseToCache));
      }
      return response;
    }).catch(() => {
      // Fallback to cache if offline
      return caches.match(e.request);
    })
  );
});
