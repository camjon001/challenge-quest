// Challenge Quest offline support.
// Pages: network first (so updates arrive when online), saved copy when offline.
// Google Fonts: saved copy first, since font files never change.
const CACHE = 'challenge-quest-v1';
const CORE = ['./', './index.html'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function save(request, response) {
  const copy = response.clone();
  caches.open(CACHE).then(cache => cache.put(request, copy));
  return response;
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(value => { clearTimeout(timer); resolve(value); }, err => { clearTimeout(timer); reject(err); });
  });
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    event.respondWith(
      withTimeout(fetch(request), 4000)
        .then(response => (response.ok ? save(request, response) : response))
        .catch(() => caches.match(request, { ignoreSearch: true }).then(hit => hit || caches.match('./')))
    );
    return;
  }

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(request).then(hit => hit || fetch(request).then(response => save(request, response)))
    );
  }
});
