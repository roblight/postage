// Simple service worker: precache core assets and provide offline fallback
const CACHE_NAME = "postage-pwa-v2";
const PRECACHE = [
  "/",
  "/index.html",
  "/js/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Update cache with latest copy (best-effort)
        const resClone = response.clone();
        // Only attempt to cache http(s) responses. Some requests (e.g. from
        // browser extensions) use other schemes like `chrome-extension:` which
        // `Cache.put` does not support and will throw. Also avoid caching
        // non-OK responses. Wrap cache operations in catches so any failures
        // don't surface as uncaught exceptions in the service worker.
        try {
          const proto = new URL(event.request.url).protocol;
          if (
            (proto === "http:" || proto === "https:") &&
            response &&
            response.ok
          ) {
            caches
              .open(CACHE_NAME)
              .then((cache) =>
                cache.put(event.request, resClone).catch((err) => {
                  // Some requests may still fail to be cached (unsupported
                  // scheme or other reasons) — swallow and log for debugging.
                  console.warn("Cache.put failed for", event.request.url, err);
                })
              )
              .catch((err) => {
                console.warn("caches.open failed:", err);
              });
          }
        } catch (err) {
          // Ignore invalid URLs or other unexpected errors.
          console.warn(
            "Skipping caching for request",
            event.request && event.request.url,
            err
          );
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // If it's a navigation request, serve the cached index.html as fallback
          if (event.request.mode === "navigate")
            return caches.match("/index.html");
          return undefined;
        })
      )
  );
});

self.addEventListener("message", (event) => {
  if (!event.data) return;
  if (event.data.type === "SKIP_WAITING") self.skipWaiting();
});
