// ============ sw.js : STRVEX OFFLINE-FIRST SERVICE WORKER (v4) ============

const CACHE_NAME = "strvex-cache-v4";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./exercises.js",
  "./store.js",
  "./charts.js",
  "./app.js",
  "./icon.svg",
  "./manifest.json"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;

  // Network-First for HTML navigation so users always receive new updates right away
  if (event.request.mode === "navigate" || event.request.url.endsWith("index.html")) {
    event.respondWith(
      fetch(event.request)
        .then(function (response) {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(event.request, copy);
            });
          }
          return response;
        })
        .catch(function () {
          return caches.match("./index.html");
        })
    );
    return;
  }

  // Stale-While-Revalidate for JS, CSS, SVG & Manifest
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      const networkFetch = fetch(event.request)
        .then(function (response) {
          if (response && response.status === 200 && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(event.request, copy);
            });
          }
          return response;
        })
        .catch(function () {
          return cached;
        });
      return cached || networkFetch;
    })
  );
});