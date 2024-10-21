/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';

declare const self: ServiceWorkerGlobalScope;

clientsClaim();

// Remove or comment out precaching
// precacheAndRoute(self.__WB_MANIFEST);

// Remove or comment out any runtime caching
// registerRoute(/* runtime caching routes */);

// Ensure that every request bypasses the cache and fetches from the network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
  );
});

// This allows the web app to trigger skipWaiting via
// registration.waiting.postMessage({type: 'SKIP_WAITING'})
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Any other custom service worker logic can go here.
