// Offline-cache service worker for Mass Uniform Store.
//
// Strategy: NETWORK-FIRST for everything. Every request tries the network
// first (so you always get the latest deployed version while online), and
// only falls back to the cached copy when there's no internet. A pure
// cache-first strategy would keep serving an old version forever once
// cached, even after a fresh deploy — this avoids that trap.
//
// CACHE_NAME is bumped on every meaningful deploy. Bumping it is what
// makes the "activate" step below discard the previous cache and start
// fresh — without this, browsers keep the old cached files indefinitely.
//
// All paths are relative ("./…"), so this works correctly whether the
// app is served at a domain root or under a GitHub Pages project path
// like /uniform-ledger/ — nothing here is hardcoded to a specific host.
const CACHE_NAME = "mus-ledger-v4-1-pwa-final";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./maskable-icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
  );
});
