/* LIW Cards staging PWA worker: scope is /cards-staging/ only.
   Network-only: never cache customer cards, sign-in state, or private data. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request));
});
