(function () {
  window.postage = window.postage || {};
  const ns = window.postage;

  // Default configuration values centralised here
  ns.config = {
    MAX_HISTORY: 120,
    DEFAULT_INTERVAL: 2000,
    DEFAULT_TIMEOUT: 3000,
    ACTIVITY_CLEAR_MS: 700,
    MAP_ZOOM: 17,
    GEO_WATCH: { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
  };

  // Helper to read CSS variables and convert hex -> rgba
  function readCssVar(name, fallback) {
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue(
        name
      );
      return v ? v.trim() : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function hexToRgba(hex, alpha) {
    if (!hex) return null;
    hex = hex.replace("#", "");
    if (hex.length === 3)
      hex = hex
        .split("")
        .map((c) => c + c)
        .join("");
    const num = parseInt(hex, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // Read colors from CSS variables so styles remain the single source of truth
  const accent = readCssVar("--accent", "#4fd1c5");
  const success = readCssVar("--success", "#4cf9b8");
  const timeout = readCssVar("--timeout", "#ffb56b");
  const muted = readCssVar("--muted", "#9aa6b2");
  const danger = readCssVar("--danger", "#ff6b6b");

  ns.colors = {
    accent: accent,
    success: success,
    timeout: timeout,
    muted: muted,
    error: danger,
    timeoutMarker: hexToRgba(timeout, 0.95),
    errorMarker: hexToRgba(danger, 0.95),
  };
})();
