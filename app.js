(function () {
  // Create a single namespace for shared state and helpers
  window.postage = window.postage || {};
  const ns = window.postage;

  // DOM references
  ns.targetEl = document.getElementById("target");
  ns.intervalEl = document.getElementById("interval");
  ns.timeoutEl = document.getElementById("timeout");
  ns.startBtn = document.getElementById("start");
  ns.clearBtn = document.getElementById("clear");

  ns.lastEl = document.getElementById("last");
  ns.avgEl = document.getElementById("avg");
  ns.minEl = document.getElementById("min");
  ns.maxEl = document.getElementById("max");
  ns.jitterEl = document.getElementById("jitter");
  ns.lossEl = document.getElementById("loss");
  ns.timeoutsEl = document.getElementById("timeouts");
  ns.errorsEl = document.getElementById("errors");
  ns.connectionEl = document.getElementById("connection");
  ns.canvas = document.getElementById("chart");
  ns.ctx = ns.canvas.getContext("2d");
  ns.activityEl = document.getElementById("activity");

  let _activityTimer = null;
  ns.lastActivityState = null;
  ns.lastActivityTimestamp = null;

  ns.setActivity = function (state) {
    if (!ns.activityEl) return;
    ns.lastActivityState = state || null;
    if (state) ns.lastActivityTimestamp = Date.now();
    ns.activityEl.className = "activity" + (state ? " " + state : "");
    if (_activityTimer) {
      clearTimeout(_activityTimer);
      _activityTimer = null;
    }
    const clearMs = (ns.config && ns.config.ACTIVITY_CLEAR_MS) || 700;
    if (state === "success" || state === "timeout" || state === "error") {
      _activityTimer = setTimeout(() => {
        if (ns.activityEl) ns.activityEl.className = "activity";
        _activityTimer = null;
        ns.lastActivityState = null;
      }, clearMs);
    }
  };

  ns.running = false;
  let timer = null;
  ns.history = [];
  const MAX_HISTORY = (ns.config && ns.config.MAX_HISTORY) || 120;

  function getLocalIPs(timeout = 1000) {
    return new Promise((resolve) => {
      const ips = new Set();
      if (!window.RTCPeerConnection) return resolve([]);
      const pc = new RTCPeerConnection({ iceServers: [] });
      try {
        pc.createDataChannel("");
      } catch (e) {}
      pc.onicecandidate = (e) => {
        if (!e.candidate) {
          try {
            pc.close();
          } catch (e) {}
          resolve([...ips]);
          return;
        }
        const s = e.candidate.candidate;
        const re = /([0-9]{1,3}(?:\.[0-9]{1,3}){3})/g;
        let m;
        while ((m = re.exec(s))) ips.add(m[1]);
      };
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch(() => {});
      setTimeout(() => {
        try {
          pc.close();
        } catch (e) {}
        resolve([...ips]);
      }, timeout);
    });
  }

  async function getPublicIP() {
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      if (!res.ok) return null;
      const j = await res.json();
      return j.ip;
    } catch (e) {
      return null;
    }
  }

  async function reverseDNS(ip) {
    if (!ip || ip.includes(":")) return null;
    const ptr = ip.split(".").reverse().join(".") + ".in-addr.arpa";
    const url =
      "https://cloudflare-dns.com/dns-query?name=" +
      encodeURIComponent(ptr) +
      "&type=PTR";
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/dns-json" },
      });
      if (!res.ok) return null;
      const j = await res.json();
      if (j && j.Answer && j.Answer.length)
        return j.Answer[0].data.replace(/\.$/, "");
    } catch (e) {}
    return null;
  }

  async function updateConnectionInfo() {
    const parts = ["🌐 "];
    try {
      const local = await getLocalIPs();
      if (local && local.length) parts.push(local.join(", "));
    } catch (e) {}
    try {
      const publicIp = await getPublicIP();
      if (publicIp) {
        const host = await reverseDNS(publicIp);
        if (host) parts.push(host);
        else parts.push(publicIp);
      }
    } catch (e) {}
    ns.connectionEl.textContent = parts.join(" ");
  }

  function pingImage(url, timeout) {
    return new Promise(async (resolve, reject) => {
      const controller = new AbortController();
      const signal = controller.signal;
      const start = performance.now();
      const timer = setTimeout(() => {
        controller.abort();
      }, timeout);
      const sep = url.includes("?") ? "&" : "?";
      const u = url + sep + "_cache=" + Date.now();
      try {
        await fetch(u, {
          method: "GET",
          mode: "no-cors",
          cache: "no-store",
          signal,
        });
        clearTimeout(timer);
        resolve(performance.now() - start);
      } catch (e) {
        clearTimeout(timer);
        if (e && e.name === "AbortError") reject(new Error("timeout"));
        else reject(new Error("error"));
      }
    });
  }

  function addSample(value) {
    ns.history.push(value);
    if (ns.history.length > MAX_HISTORY) ns.history.shift();
    renderStats();
    drawChart();
  }

  function renderStats() {
    const attempts = ns.history.length;
    const successes = ns.history.filter((v) => typeof v === "number");
    const failures = attempts - successes.length;
    const timeouts = ns.history.filter((v) => v === "timeout").length;
    const errors = ns.history.filter((v) => v === "error").length;

    ns.lastEl.textContent = successes.length
      ? `${Math.round(successes[successes.length - 1])} ms`
      : "— ms";
    if (successes.length) {
      const min = Math.round(Math.min(...successes));
      const max = Math.round(Math.max(...successes));
      const avg = Math.round(
        successes.reduce((a, b) => a + b, 0) / successes.length
      );
      ns.minEl.textContent = `${min} ms`;
      ns.maxEl.textContent = `${max} ms`;
      ns.avgEl.textContent = `${avg} ms`;
      let diffs = 0,
        count = 0;
      for (let i = 1; i < successes.length; i++) {
        diffs += Math.abs(successes[i] - successes[i - 1]);
        count++;
      }
      const jitter = count ? Math.round(diffs / count) : 0;
      ns.jitterEl.textContent = `${jitter} ms`;
    } else {
      ns.minEl.textContent = "— ms";
      ns.maxEl.textContent = "— ms";
      ns.avgEl.textContent = "— ms";
      ns.jitterEl.textContent = "— ms";
    }

    const loss = attempts ? Math.round((failures / attempts) * 100) : 0;
    ns.lossEl.textContent = `${loss} %`;
    ns.timeoutsEl.textContent = `${timeouts}`;
    ns.errorsEl.textContent = `${errors}`;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawChart() {
    const w = (ns.canvas.width = ns.canvas.clientWidth * devicePixelRatio);
    const h = (ns.canvas.height = ns.canvas.clientHeight * devicePixelRatio);
    ns.ctx.clearRect(0, 0, w, h);
    ns.ctx.scale(devicePixelRatio, devicePixelRatio);
    const cw = ns.canvas.clientWidth,
      ch = ns.canvas.clientHeight;
    ns.ctx.fillStyle = "rgba(255,255,255,0.02)";
    roundRect(ns.ctx, 0, 0, cw, ch, 8);
    ns.ctx.fill();

    const samples = ns.history.slice(-MAX_HISTORY);
    const values = samples.filter((v) => typeof v === "number");
    const max = values.length ? Math.max(...values) : 1000;
    const min = values.length ? Math.min(...values) : 0;
    const range = Math.max(1, max - min);
    const padding = 6;
    const plotW = cw - padding * 2;
    const plotH = ch - padding * 2 - 10;
    ns.ctx.beginPath();
    let first = true;
    const step = plotW / Math.max(1, samples.length - 1);
    for (let i = 0; i < samples.length; i++) {
      const x = padding + i * step;
      const v = samples[i];
      let y;
      if (typeof v !== "number") y = padding + plotH;
      else y = padding + (1 - (v - min) / range) * plotH;
      if (first) {
        ns.ctx.moveTo(x, y);
        first = false;
      } else ns.ctx.lineTo(x, y);
    }
    ns.ctx.strokeStyle = (ns.colors && ns.colors.accent) || "#4fd1c5";
    ns.ctx.lineWidth = 2;
    ns.ctx.stroke();

    for (let i = 0; i < samples.length; i++) {
      if (typeof samples[i] !== "number") {
        const x = padding + i * step;
        const y = padding + plotH;
        const v = samples[i];
        if (v === "timeout")
          ns.ctx.fillStyle =
            (ns.colors && ns.colors.timeoutMarker) || "rgba(255,181,107,0.95)";
        else
          ns.ctx.fillStyle =
            (ns.colors && ns.colors.errorMarker) || "rgba(255,107,107,0.95)";
        ns.ctx.beginPath();
        ns.ctx.arc(x, y - 6, 4, 0, Math.PI * 2);
        ns.ctx.fill();
      }
    }
  }

  async function singlePing() {
    const url = (ns.targetEl.value || "").trim();
    if (!url) return null;
    const timeout = Math.max(
      50,
      Number(ns.timeoutEl.value) ||
        (ns.config && ns.config.DEFAULT_TIMEOUT) ||
        3000
    );
    try {
      const ms = await pingImage(url, timeout);
      return ms;
    } catch (e) {
      if (e && e.message === "timeout") return "timeout";
      return "error";
    }
  }

  async function loopPing() {
    if (!ns.running) return;
    updateConnectionInfo();
    ns.setActivity("pending");
    const res = await singlePing();
    addSample(res);
    if (typeof res === "number") ns.setActivity("success");
    else if (res === "timeout") ns.setActivity("timeout");
    else ns.setActivity("error");
    const interval = Math.max(
      100,
      Number(ns.intervalEl.value) ||
        (ns.config && ns.config.DEFAULT_INTERVAL) ||
        2000
    );
    timer = setTimeout(loopPing, interval);
  }

  ns.startBtn.addEventListener("click", () => {
    if (ns.running) {
      ns.running = false;
      ns.startBtn.textContent = "Start";
      if (timer) clearTimeout(timer);
      ns.setActivity();
      return;
    }
    ns.history.length = 0;
    renderStats();
    drawChart();
    ns.running = true;
    ns.startBtn.textContent = "Stop";
    loopPing();
  });

  ns.clearBtn.addEventListener("click", () => {
    ns.history.length = 0;
    renderStats();
    drawChart();
  });

  // initial
  renderStats();
  drawChart();
  updateConnectionInfo();
  const nav = navigator;
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
  if (conn && conn.addEventListener)
    conn.addEventListener("change", updateConnectionInfo);

  let resizeTO;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTO);
    resizeTO = setTimeout(() => drawChart(), 120);
  });

  // Register service worker (kept here so index.html is minimal)
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("Service worker registered", reg))
        .catch((err) => console.warn("SW registration failed", err));
    });
  }
})();
