const CACHE_NAME = 'rnj-jewellers-v7';
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
  self.skipWaiting(); // Activate new SW immediately
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => console.log('Cache addAll warning:', err));
    })
  );
});

self.addEventListener('activate', (e) => {
  // Clear old caches completely
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Never cache API calls to Google Apps Script or OneSignal
  if (e.request.url.includes('script.google.com') || e.request.url.includes('onesignal.com')) {
    return;
  }

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
    icon: '/rn-jewellers/assets/logo.png',
    badge: '/rn-jewellers/assets/logo.png',
    tag: 'rnj-notification',
    requireInteraction: true,
    data: { url: data.url || '/rn-jewellers/' }
  };

  e.waitUntil(self.registration.showNotification(data.title || '✨ RN Jewellers', options));
});

// ─── NOTIFICATION CLICK HANDLER ─────────────────────────────────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const targetUrl = (e.notification.data && e.notification.data.url) || '/rn-jewellers/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (let client of windowClients) {
        if (client.url.includes('rn-jewellers') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
