// Généré par outils/build.mjs — ne pas modifier à la main.
// Garde toute l'app dans l'iPad pour qu'elle marche sans internet.
const VERSION = "v3-f0d6afac36e4";
const CACHE = "cartes-" + VERSION;
const FICHIERS = [
 "./",
 "icones/apple-touch-icon.png",
 "icones/icone-192.png",
 "icones/icone-512-maskable.png",
 "icones/icone-512.png",
 "jszip.min.js",
 "manifest.webmanifest",
 "polices/bricolage-400.woff2",
 "polices/bricolage-600.woff2",
 "polices/bricolage-800.woff2",
 "polices/noto-sc-500.woff2",
 "polices/noto-sc-900.woff2",
 "polices/polices.css"
];

self.addEventListener("install", e => {
  // cache:"reload" : on ignore le cache HTTP pour être sûr d'avoir les nouveaux fichiers
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS.map(f => new Request(f, { cache: "reload" })))));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith("cartes-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// La nouvelle version attend que l'utilisateur touche « mettre à jour » (jamais pendant une interview)
self.addEventListener("message", e => { if (e.data === "skip") self.skipWaiting(); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.open(CACHE).then(c => c.match(e.request, { ignoreSearch: true })
      .then(r => r || (e.request.mode === "navigate" ? c.match("./") : null))
      .then(r => r || fetch(e.request)))
  );
});
