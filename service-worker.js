/* LIW Cards staging PWA worker: scope is /cards-staging/ only.
   Staging must always prefer the newest deployed files so QA is never trapped
   behind browser/PWA asset caches. Customer/private data is never cached. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request, { cache: 'no-store' }).catch(() => fetch(event.request))
  );
});
