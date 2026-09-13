const CACHE_NAME = "kenanganku-cache-v1";

// App-shell files served from the same origin as this file.
const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
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
  const req = event.request;

  // Only handle GET requests.
  if (req.method !== "GET") return;

  // Network-first for reverse-geocoding and map tiles (they need to be fresh/live).
  const url = new URL(req.url);
  const isLiveData = url.hostname.includes("nominatim.openstreetmap.org") ||
                      url.hostname.includes("tile.openstreetmap.org");
  if (isLiveData) {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  // Cache-first for the app shell and everything else (fonts, Leaflet from CDN, etc).
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // Cache a copy for next time (best-effort; ignore opaque/error responses issues).
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(req, resClone).catch(() => {});
        });
        return res;
      }).catch(() => cached);
    })
  );
});
