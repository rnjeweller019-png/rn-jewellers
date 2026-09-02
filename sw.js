const CACHE_NAME = 'rnj-jewellers-v430';

// Static assets only — NO HTML pages cached (prevents old website showing on new phones)
const STATIC_ASSETS = [
  './css/style.css',
  './css/animations.css',
  './assets/logo.png'
];

// ─── INSTALL: Pre-cache only static assets ───────────────────────────────────
self.addEventListener('install', (e) => {
  self.skipWaiting(); // Activate immediately — no waiting
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(err => console.log('Cache static warning:', err));
    })
  );
});

// ─── ACTIVATE: Delete ALL old caches, claim all clients instantly ─────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => {
        console.log('[SW] Deleting old cache:', k);
        return caches.delete(k);
      }))
    ).then(() => {
      console.log('[SW] New SW activated, claiming all clients');
      return self.clients.claim(); // Take control of ALL open tabs/PWA windows instantly
    })
  );
});

// ─── FETCH: Smart routing strategy ───────────────────────────────────────────
self.addEventListener('fetch', (e) => {
  const url = e.request.url;
  const isGet = e.request.method === 'GET';

  // 1. NEVER intercept: Google APIs, Apps Script, external CDNs, non-GET
  if (
    !isGet ||
    url.includes('script.google.com') ||
    url.includes('googleusercontent.com') ||
    url.includes('lh3.googleusercontent.com') ||
    url.includes('drive.google.com') ||
    url.includes('onesignal.com') ||
    url.includes('fonts.googleapis.com') ||
    url.includes('fonts.gstatic.com') ||
    url.includes('cdnjs.cloudflare.com') ||
    url.includes('kit.fontawesome.com')
  ) {
    return; // Let browser handle directly — always fresh
  }

  // 2. HTML PAGES → Network First, then cache fallback
  //    Ensures users ALWAYS see latest version, not stale cached HTML
  if (url.endsWith('.html') || url.endsWith('/') || !url.includes('.')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request)) // Only use cache if OFFLINE
    );
    return;
  }

  // 3. JS FILES → Always network-fresh (never serve stale JS)
  if (url.endsWith('.js') || url.includes('/js/')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  // 4. STATIC ASSETS (CSS, fonts, images) → Cache First, background update
  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);

      return cached || networkFetch;
    })
  );
});

// ─── PUSH NOTIFICATIONS ──────────────────────────────────────────────────────
self.addEventListener('push', (e) => {
  let data = { title: '✨ RN Jewellers', body: 'You have a new notification.' };
  if (e.data) {
    try { data = e.data.json(); }
    catch(err) { data.body = e.data.text(); }
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

// ─── NOTIFICATION CLICK ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const targetUrl = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (let client of windowClients) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
