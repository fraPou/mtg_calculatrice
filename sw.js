// ⚠️ Incrémenter la version à chaque modification des fichiers,
// sinon les appareils garderont l'ancienne version en cache.
const CACHE = "mtg-utils-v9";

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

const CODE = /\.(?:css|js|html)$/;

// Install : pré-cache, puis prend la main sans attendre la fermeture des onglets
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

// Activate : supprime les anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// HTML, CSS et JS : réseau d'abord (le cache ne peut plus figer une vieille feuille de style).
// Images et icônes : cache d'abord.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const { pathname } = new URL(event.request.url);
  if (CODE.test(pathname) || pathname.endsWith("/")) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.ok) caches.open(CACHE).then((cache) => cache.put(event.request, res.clone()));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
