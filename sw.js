const CACHE = "mtg-utils-v1";
const ASSETS = [
  "/",                // racine
  "/index.html",
  "/static/css/styles.css",
  "/static/img/kaalia-of-the-vast.jpg",
  "/static/img/derevi-empyrial-tactician.jpg",
  "/static/img/freyalise-llanowar-s-fury.jpg",
  "/static/img/meren-of-clan-nel-toth.jpg",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

// Install: pré-cache
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
});

// Activate: cleanup anciens caches si tu changes la version
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE ? caches.delete(k) : null)))
    )
  );
});

// Fetch: cache d’abord, sinon réseau
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});