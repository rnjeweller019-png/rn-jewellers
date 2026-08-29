importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

const CACHE_NAME = 'rnj-jewellers-v32';

// ⚠️ IMPORTANT: JS files are excluded from cache so config.js is ALWAYS served fresh from network.
// This ensures the APPS_SCRIPT_URL in config.js is never stale.
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
  './assets/logo.png'
  // JS files intentionally excluded — must always load fresh from network
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => console.log('Cache addAll warning:', err));
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = e.request.url;

  // NEVER cache: API calls, OneSignal, or ANY JavaScript files
  if (
    url.includes('script.google.com') ||
    url.includes('onesignal.com') ||
    url.endsWith('.js') ||
    url.includes('/js/')
  ) {
    return; // Let the browser handle JS files directly — no caching
  }

  e.respondWith(
    fetch(e.request).then((response) => {
      if (response && response.status === 200 && response.type === 'basic') {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, responseToCache));
      }
      return response;
    }).catch(() => {
      return caches.match(e.request);
    })
  );
});

// ─── PUSH EVENT HANDLER (Background Notifications) ─────────────────────────
self.addEventListener('push', (e) => {
  let data = { title: '✨ RN Jewellers', body: 'You have a new notification.' };
  if (e.data) {
    try {
      data = e.data.json();
    } catch(err) {
      data.body = e.data.text();
    }
  }

  const options = {
    body: data.body || data.message || 'Check out our latest jewellery collection!',
    icon: './assets/logo.png',
    badge: './assets/logo.png',
    tag: 'rnj-notification',
    requireInteraction: true,
    data: { url: data.url || './' }
  };

  e.waitUntil(self.registration.showNotification(data.title || '✨ RN Jewellers', options));
});

// ─── NOTIFICATION CLICK HANDLER ─────────────────────────────────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const targetUrl = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (let client of windowClients) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
