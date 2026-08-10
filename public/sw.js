// Service worker: makes the farm open offline once it has been visited.
//
// Deliberately hand-written and tiny. Vite's asset filenames are content
// hashed, so there is nothing to precache by name — instead the first visit
// warms the cache and later visits are served from it.

const CACHE = "finca-flamenca-v1";

self.addEventListener("install", () => {
  // A new worker takes over straight away rather than waiting for every tab.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function cacheThenNetwork(request) {
  const hit = await caches.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(request, copy));
  }
  return response;
}

async function networkThenCache(request) {
  try {
    const response = await fetch(request);
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(request, copy));
    return response;
  } catch {
    return (await caches.match(request)) ?? (await caches.match("/")) ?? Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;

  // The page itself goes to the network first, so a new build is picked up as
  // soon as she has signal; the cache is the offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(networkThenCache(request));
    return;
  }

  // Hashed assets, the 3D model and the icons never change under a given
  // name, so the cache is authoritative.
  event.respondWith(cacheThenNetwork(request));
});
