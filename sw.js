// ⚠️ Incrémenter la version à chaque modification des fichiers,
// sinon les appareils garderont l'ancienne version en cache.
const CACHE = "mtg-utils-v8";

// Chemins relatifs : fonctionne à la racine d'un domaine comme dans un sous-dossier (ex. GitHub Pages).
const IMAGES = [
  "garruk", "jace-beleren", "ajani-1920",
  "soltari-champion", "ultramarines-honour-guard", "skyhunter-strike-force", "curiosity-crafter",
  "enduring-curiosity", "dream-trawler", "nesting-dovehawk", "hero-of-bladehold",
].map((name) => `./static/img/${name}.jpg`);

IMAGES.push("./static/img/liliana.jpg");

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./static/css/styles.css",
  "./static/js/js.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  ...IMAGES,
];

// Install : pré-cache
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

// Activate : supprime les anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE ? caches.delete(k) : null)))
    )
  );
});

// Fetch : cache d'abord, sinon réseau
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => cached || fetch(event.request))
  );
});
