const LIW_SW_VERSION = 'liw-cards-20260821-home-screen-1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', event => {
  if (event.data === 'LIW_SKIP_WAITING') self.skipWaiting();
});
