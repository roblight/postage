(function () {
  if (!window.L) return; // Leaflet not loaded
  const ns = window.postage || {};
  const mapEl = document.getElementById("map");
  if (!mapEl) return;
  const MAP_ZOOM = 17;
  try {
    window.MAP_ZOOM = MAP_ZOOM;
  } catch (e) {}

  const map = L.map("map", {
    zoomControl: true,
    attributionControl: false,
  }).setView([0, 0], 2);
  const tiles = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    { maxZoom: 19, attribution: "", attributionControl: false },
  ).addTo(map);

  const LocateControl = L.Control.extend({
    options: { position: "topright" },
    onAdd: function (map) {
      const container = L.DomUtil.create("div", "leaflet-bar leaflet-control");
      const btn = L.DomUtil.create("a", "locate-btn", container);
      btn.href = "#";
      btn.title = "Center map on current location";
      btn.setAttribute("role", "button");
      btn.style.display = "flex";
      btn.style.alignItems = "center";
      btn.style.justifyContent = "center";
      btn.style.width = "32px";
      btn.style.height = "32px";
      btn.style.fontSize = "22px";
      btn.style.paddingBottom = "4px";
      btn.textContent = "⌖";
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);
      L.DomEvent.on(btn, "click", (e) => {
        L.DomEvent.stop(e);
        if (!navigator.geolocation) {
          console.warn("Geolocation not supported");
          return;
        }
        btn.style.opacity = "0.6";
        if (typeof ns.watchId !== "undefined" && ns.watchId != null) {
          if (ns.lastPos) {
            map.flyTo(ns.lastPos, MAP_ZOOM, { duration: 0.8 });
          } else if (ns.currentMarker) {
            map.flyTo(ns.currentMarker.getLatLng(), MAP_ZOOM, {
              duration: 0.8,
            });
          }
          btn.style.opacity = "1";
          return;
        }

        if (typeof ns.running !== "undefined" && ns.running) {
          try {
            startGeolocation();
          } catch (err) {}
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const latlng = [pos.coords.latitude, pos.coords.longitude];
              map.flyTo(latlng, MAP_ZOOM, { duration: 0.8 });
              btn.style.opacity = "1";
            },
            (err) => {
              console.warn("Geolocation error", err && err.message);
              btn.style.opacity = "1";
            },
            { enableHighAccuracy: true, timeout: 10000 },
          );
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const latlng = [pos.coords.latitude, pos.coords.longitude];
            map.flyTo(latlng, MAP_ZOOM, { duration: 0.8 });
            btn.style.opacity = "1";
          },
          (err) => {
            console.warn("Geolocation error", err && err.message);
            btn.style.opacity = "1";
          },
          { enableHighAccuracy: true, timeout: 10000 },
        );
      });
      return container;
    },
  });

  map.addControl(new LocateControl());

  setTimeout(() => {
    const els = document.querySelectorAll(".leaflet-control-attribution");
    els.forEach((el) => el.remove());
  }, 50);

  const trackLayer = L.layerGroup().addTo(map);
  ns.lastPos = null;
  ns.currentMarker = null;
  ns.watchId = null;

  function colorForState(state) {
    switch (state) {
      case "pending":
        return "#4fd1c5";
      case "success":
        return "#4cf9b8";
      case "timeout":
        return "#ffb56b";
      case "error":
        return "#ff6b6b";
      default:
        return "#9aa6b2";
    }
  }

  function onPosition(pos) {
    const latlng = [pos.coords.latitude, pos.coords.longitude];
    const state = ns.lastActivityState || null;
    if (ns.lastPos) {
      const seg = L.polyline([ns.lastPos, latlng], {
        color: colorForState(state),
        weight: 4,
        opacity: 0.9,
      }).addTo(trackLayer);
    }
    if (!ns.currentMarker) {
      ns.currentMarker = L.circleMarker(latlng, {
        radius: 6,
        fillColor: colorForState(state),
        color: "#000",
        weight: 0.5,
        fillOpacity: 0.95,
      }).addTo(trackLayer);
      map.setView(latlng, MAP_ZOOM);
    } else {
      ns.currentMarker.setLatLng(latlng);
      ns.currentMarker.setStyle({ fillColor: colorForState(state) });
    }
    ns.lastPos = latlng;
  }

  function onPosError(err) {
    console.warn("Geolocation error", err && err.message);
  }

  function startGeolocation() {
    if (!navigator.geolocation) return;
    if (ns.watchId != null) return;
    ns.watchId = navigator.geolocation.watchPosition(onPosition, onPosError, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000,
    });
  }

  function stopGeolocation() {
    if (ns.watchId != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(ns.watchId);
      ns.watchId = null;
    }
  }

  if (ns.startBtn) {
    ns.startBtn.addEventListener("click", () => {
      setTimeout(() => {
        if (ns.running) startGeolocation();
        else stopGeolocation();
      }, 50);
    });
  }
})();
