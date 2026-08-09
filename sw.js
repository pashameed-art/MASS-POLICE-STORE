const CACHE_NAME = "mus-ledger-v3";
const APP_SHELL = [
  "/MASS-POLICE-STORE/",
  "/MASS-POLICE-STORE/index.html",
  "/MASS-POLICE-STORE/manifest.json",
  "/MASS-POLICE-STORE/icon-192.png",
  "/MASS-POLICE-STORE/icon-512.png",
  "/MASS-POLICE-STORE/maskable-icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    }).catch(() => caches.match("/MASS-POLICE-STORE/index.html"))
  );
});
