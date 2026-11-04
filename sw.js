// Offline cache. Bump VERSION when the app shell changes a lot.
const VERSION = 'v3';
const SHELL_CACHE = `n1q-shell-${VERSION}`;
const EXT_CACHE = 'n1q-ext-v1';

const SHELL = [
  './', 'index.html', 'css/style.css',
  'js/app.js', 'js/srs.js', 'js/storage.js', 'js/sync.js', 'js/radio.js',
  'data/vocab.json', 'data/grammar.json', 'data/passages.json',
  'manifest.json', 'icons/icon.svg', 'icons/icon-192.png',
];

// Cross-origin files that never change for a given URL (versioned fonts / SDK).
const EXT_OK = [/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, /^https:\/\/www\.gstatic\.com\/firebasejs\//];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key !== SHELL_CACHE && key !== EXT_CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    // Questions and picture list: try the network first so new content shows up quickly.
    if (url.pathname.endsWith('.json')) e.respondWith(networkFirst(req));
    else e.respondWith(staleWhileRevalidate(req));
    return;
  }
  if (EXT_OK.some((re) => re.test(req.url))) e.respondWith(cacheFirst(req));
  // Everything else (Firebase Auth, Firestore) goes straight to the network.
});

async function networkFirst(req) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req)) || Response.error();
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(SHELL_CACHE);
  const hit = await cache.match(req, { ignoreSearch: true });
  const net = fetch(req).then((res) => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  return hit || (await net) || Response.error();
}

async function cacheFirst(req) {
  const cache = await caches.open(EXT_CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
  return res;
}
