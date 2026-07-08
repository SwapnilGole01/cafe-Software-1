const CACHE_NAME = "cafe-manager-cache-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/icon.svg",
  "/manifest.json"
];

// Install Service Worker and Pre-cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Pre-caching app shell");
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Service Worker and clean up stale caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercept requests
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Strategy for API endpoints (e.g. fetching menu) - Network First, fallback to Cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          console.log("[Service Worker] API network failure, loading from cache fallback");
          return caches.match(req);
        })
    );
  } else {
    // Strategy for Local Assets - Stale While Revalidate
    event.respondWith(
      caches.match(req).then((cachedResponse) => {
        const fetchPromise = fetch(req).then((networkResponse) => {
          if (networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => {
          // If network fails completely and there's no cache, return fallback or empty response
        });
        return cachedResponse || fetchPromise;
      })
    );
  }
});
