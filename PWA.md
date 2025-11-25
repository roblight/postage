PWA (Progressive Web App)
=========================

What's included
---------------

- `manifest.json` — app metadata (name, colors, icons, start_url, display).
- `sw.js` — a small service worker that precaches core assets and provides a runtime caching/offline fallback.
- `icons/` — simple SVG icons used by the manifest and as favicon.

Run locally
-----------

1. Serve the folder from the project root:

```bash
# from /Users/rob.light/Sandbox/postage
python3 -m http.server 8000
```

2. Open the site from another device on the same network, or on the same machine using `http://localhost:8000/`.

Test PWA behavior
-----------------

- Open DevTools -> Application to verify the `manifest.json` and the service worker registration.
- In Chrome, use the Install button in the address bar or App menu to install the PWA.
- The service worker precaches core assets; if offline, the cached `index.html` will be served for navigation requests.

Notes
-----

- To force an updated service worker: open DevTools -> Application -> Service Workers and click `Update` or reload the page; the worker calls `skipWaiting()` to activate quickly.
- This service worker is intentionally small and conservative; consider a more advanced caching strategy for large apps.
