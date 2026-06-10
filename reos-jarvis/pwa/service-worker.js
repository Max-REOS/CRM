// REOS JARVIS PWA — Service Worker

const CACHE = 'jarvis-pwa-v1';
const ASSETS = ['/', '/pwa/', '/pwa/index.html', '/pwa/styles.css', '/pwa/app.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => caches.match('/pwa/index.html')))
  );
});

self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title: 'JARVIS', body: 'Neue Nachricht' };
  e.waitUntil(
    self.registration.showNotification(data.title || 'JARVIS', {
      body: data.body,
      icon: '/pwa/icon-192.png',
      badge: '/pwa/icon-192.png',
      actions: data.actions || [],
      data: data
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'ARBEITEN' || e.action === 'VERSAGEN') {
    // Post to sync endpoint
    e.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        if (clients.length > 0) clients[0].postMessage({ type: 'accountability', status: e.action });
        else self.clients.openWindow('/pwa/');
      })
    );
  } else {
    e.waitUntil(self.clients.openWindow('/pwa/'));
  }
});
