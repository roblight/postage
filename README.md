# Mobile Latency Monitor — Postage

This is a small, mobile-friendly single-page app to measure simple network latency from a phone using cache-busted image "pings".

## Quick start (local network)

1. Serve the repo from your machine (recommended so the page can load resources reliably):

```bash
# from /Users/rob.light/Sandbox/postage
python3 -m http.server 8000
# or, if you prefer Node:
npx http-server -p 8000
```

2. Find your machine's local IP (macOS Wi‑Fi usually `en0`):

```bash
ipconfig getifaddr en0
# if that doesn't return an address, try `en1` or use `ifconfig` to inspect interfaces
```

3. On your phone (connected to the same Wi‑Fi), open:

```txt
http://<YOUR_IP>:8000
```

4. Tap the page, configure the `Target` URL, `Interval` (ms) and `Timeout` (ms), then tap `Start`.

## Notes

- Default `Target` is `https://www.google.com/generate_204` (a tiny fast endpoint). You can change it to any URL reachable from the phone.
- The app measures RTT to the target and treats failures/timeouts as packet loss (shown on the chart).
- For accurate measurements: put both phone and machine on the same Wi‑Fi; close other heavy downloads on the phone; pick a short interval (>=200 ms).
- If you need to expose the page publicly, use a tunneling tool like `ngrok`:

```bash
ngrok http 8000
```

### Ping implementation & timeouts

- Recent change: the internal ping logic was updated to use `fetch` with an `AbortController`-based timeout instead of relying on `Image.onload`/`onerror` events. This improves reliability for endpoints like `generate_204` that return no body and can behave inconsistently with image-based probes.
- Implementation detail: the app issues a `fetch` with `mode: 'no-cors'` and a cache-busting query parameter so the request remains cross-origin-friendly and the response is opaque — we only use it for timing and reachability.
- UI: adjust the `Timeout` control (default `3000` ms) to tune when requests should be aborted. Shorten for snappier failure detection, lengthen if your network has high latency.

### Testing locally

1. Serve the repo locally (example using Python):

```bash
# from /Users/rob.light/Sandbox/postage
python3 -m http.server 8000
```

2. Find your machine IP (macOS):

```bash
ipconfig getifaddr en0
```

3. On your phone, open `http://<YOUR_IP>:8000/`, set the `Target`, `Interval`, and `Timeout`, then tap `Start`.

4. If you see repeated timeouts while the phone can otherwise browse the target, try increasing `Timeout` to 5000 ms to rule out transient slowness.

If you'd like, you can revert to image-based probing, but the current fetch-based approach gives more consistent timing and timeout semantics across modern mobile browsers.

## Troubleshooting

- If the chart never shows samples: check that the phone can reach the `Target` URL in its browser.
- If `ipconfig getifaddr en0` returns nothing, run `ifconfig` to find your active interface name.
- Ensure local firewall settings allow incoming connections on the chosen port.

## Next steps (optional)

- Add CSV export or logging of samples.
- Add background polling while the screen is off (requires a PWA/service worker and careful battery considerations).
- Add more detailed visualizations (histogram, percentile lines).

---

File: `index.html` contains the app UI and logic.
