/* Service worker generato da make_pwa.py — mette in cache l'app per l'uso offline.
   Cambia la versione qui sotto per far scaricare i file aggiornati. */
// pwa:inizio
const CACHE = 'tavolo-fe2861da';
const FILES = [
  './',
  './app.css',
  './app.js',
  './carta.js',
  './collante.js',
  './compendio.js',
  './contenuti.js',
  './ia.js',
  './index.html',
  './lettore.js',
  './manifest.webmanifest',
  './piattaforma.js',
  './schemi.js',
  './sessioni.js',
  './sottoclassi.js',
  './dati/srd-classi.js',
  './dati/srd-incantesimi.js',
  './dati/srd-incantesimi2.js',
  './dati/srd-regole.js',
  './dati/srd-sottoclassi.js',
  './assets/icons/icon-180.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];
// pwa:fine

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(FILES.map(f => c.add(f).catch(() => null))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // le richieste esterne (API, font) passano dalla rete: non ha senso metterle in cache qui
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
