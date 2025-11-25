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
- The app uses image loads (cache-busted) for RTT measurements so it works cross-origin without requiring CORS headers.
- Failures / timeouts are treated as packet loss and marked on the chart.
- For accurate measurements: put both phone and machine on the same Wi‑Fi; close other heavy downloads on the phone; pick a short interval (>=200 ms).
- If you need to expose the page publicly, use a tunneling tool like `ngrok`:

```bash
ngrok http 8000
```

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
