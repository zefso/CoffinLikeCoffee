(() => {
  "use strict";
  const host = document.querySelector(".mini-map");
  if (!host) return;
  const svg = document.querySelector("#mini-map-canvas");
  const status = document.querySelector("#mini-map-status");
  const NS = "http://www.w3.org/2000/svg";
  const world = { width: 1120, height: 660 };
  let cx = 560,
    cy = 330,
    zoom = 1.6,
    baseWidth = 1120,
    baseHeight = 660;
  let places = [],
    dragged = false,
    gesture = null;
  const pointers = new Map();
  function node(tag, attrs, text) {
    const n = document.createElementNS(NS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, v));
    if (text) n.textContent = text;
    return n;
  }
  function view() {
    const width = baseWidth / zoom,
      height = baseHeight / zoom;
    // Keep part of the cemetery in view, including when zoomed out.
    cx = Math.max(-width * 0.15, Math.min(world.width + width * 0.15, cx));
    cy = Math.max(-height * 0.15, Math.min(world.height + height * 0.15, cy));
    svg.setAttribute(
      "viewBox",
      `${cx - width / 2} ${cy - height / 2} ${width} ${height}`
    );
  }
  function resize() {
    const r = svg.getBoundingClientRect();
    if (!r.width || !r.height) return;
    baseWidth = Math.max(world.width, (world.height * r.width) / r.height);
    baseHeight = (baseWidth * r.height) / r.width;
    view();
  }
  function at(x, y) {
    const r = svg.getBoundingClientRect();
    return {
      x: cx + ((x - r.left - r.width / 2) * baseWidth) / zoom / r.width,
      y: cy + ((y - r.top - r.height / 2) * baseHeight) / zoom / r.height,
    };
  }
  function magnify(factor, x, y) {
    const before = at(x, y);
    zoom = Math.max(0.7, Math.min(7, zoom * factor));
    const after = at(x, y);
    cx += before.x - after.x;
    cy += before.y - after.y;
    view();
  }
  svg.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const delta =
        e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? svg.clientHeight : 1);
      magnify(
        Math.exp(-Math.max(-120, Math.min(120, delta)) * 0.0025),
        e.clientX,
        e.clientY
      );
    },
    { passive: false }
  );
  function currentGesture() {
    const p = [...pointers.values()];
    return p.length === 1
      ? { x: p[0].x, y: p[0].y, distance: 0 }
      : {
          x: (p[0].x + p[1].x) / 2,
          y: (p[0].y + p[1].y) / 2,
          distance: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y),
        };
  }
  svg.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    if (!pointers.size) dragged = false;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gesture = currentGesture();
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const next = currentGesture(),
      r = svg.getBoundingClientRect();
    if (Math.hypot(next.x - gesture.x, next.y - gesture.y) > 1 || pointers.size > 1)
      dragged = true;
    cx -= ((next.x - gesture.x) * baseWidth) / zoom / r.width;
    cy -= ((next.y - gesture.y) * baseHeight) / zoom / r.height;
    if (next.distance && gesture.distance)
      magnify(next.distance / gesture.distance, next.x, next.y);
    gesture = next;
    view();
  });
  function release(e) {
    if (!pointers.has(e.pointerId)) return;
    const wasSingle = pointers.size === 1;
    pointers.delete(e.pointerId);
    if (e.type === "pointerup" && wasSingle && !dragged) {
      const p = at(e.clientX, e.clientY);
      const place = places.find(
        (item) =>
          p.x >= item.x && p.x <= item.x + 12 && p.y >= item.y && p.y <= item.y + 22
      );
      if (place) {
        const url = new URL(host.dataset.mapUrl, location.origin);
        url.searchParams.set("level", place.data.level);
        url.searchParams.set("sector", place.data.sector);
        url.searchParams.set("miejsce", place.data.id);
        location.assign(url);
      }
    }
    gesture = pointers.size ? currentGesture() : null;
  }
  svg.addEventListener("pointerup", release);
  svg.addEventListener("pointercancel", release);
  svg.addEventListener("keydown", (e) => {
    if (
      ![
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "+",
        "=",
        "-",
        "Home",
      ].includes(e.key)
    )
      return;
    e.preventDefault();
    const step = 45 / zoom;
    if (e.key === "ArrowLeft") cx -= step;
    if (e.key === "ArrowRight") cx += step;
    if (e.key === "ArrowUp") cy -= step;
    if (e.key === "ArrowDown") cy += step;
    if (e.key === "+" || e.key === "=") zoom = Math.min(7, zoom * 1.2);
    if (e.key === "-") zoom = Math.max(0.7, zoom / 1.2);
    if (e.key === "Home") {
      cx = 560;
      cy = 330;
      zoom = 1.6;
    }
    view();
  });
  function draw(data) {
    svg.replaceChildren();
    places = [];
    svg.append(
      node("rect", {
        x: 0,
        y: 0,
        width: 1120,
        height: 660,
        rx: 36,
        fill: "#354d40",
        stroke: "#7b937c",
        "stroke-width": 5,
      })
    );
    svg.append(
      node("path", {
        d: "M 30 330 H 1090 M 373 25 V 635 M 746 25 V 635",
        stroke: "#baa67e",
        "stroke-width": 22,
        fill: "none",
      })
    );
    svg.append(
      node("circle", {
        cx: 560,
        cy: 330,
        r: 38,
        fill: "#718e77",
        stroke: "#d9c598",
        "stroke-width": 7,
      })
    );
    svg.append(node("circle", { cx: 560, cy: 330, r: 15, fill: "#acc4bd" }));
    const groups = new Map();
    data.forEach((p) => {
      const key = p.level + "-" + p.sector;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    });
    const colors = { available: "#a1c0a6", reserved: "#d9b579", occupied: "#aaa4b3" };
    const names = { available: "wolne", reserved: "zarezerwowane", occupied: "zajęte" };
    const levels = [...new Set(data.map((p) => p.level))].sort((a, b) => a - b);
    levels.forEach((level, index) => {
      const x = index * 373;
      const first = data.find((p) => p.level === level);
      svg.append(
        node(
          "text",
          {
            x: x + 186,
            y: 48,
            fill: "#efe8d7",
            "font-size": 17,
            "text-anchor": "middle",
            "font-family": "sans-serif",
          },
          first.level_name
        )
      );
      const sectors = [...groups.entries()].filter(
        ([, items]) => items[0].level === level
      );
      sectors.forEach(([key, items], i) => {
        const sx = x + 30 + (i % 2) * 177,
          sy = 80 + Math.floor(i / 2) * 310;
        svg.append(
          node("rect", {
            x: sx - 10,
            y: sy - 8,
            width: 165,
            height: 185,
            rx: 12,
            fill: "#405e49",
            stroke: "#658269",
          })
        );
        svg.append(
          node(
            "text",
            {
              x: sx + 70,
              y: sy + 18,
              fill: "#e2d6b5",
              "font-size": 14,
              "text-anchor": "middle",
              "font-family": "sans-serif",
            },
            "Sektor " + items[0].sector
          )
        );
        items.forEach((p) => {
          const px = sx + (p.number - 1) * 18,
            py = sy + 35 + (p.row - 1) * 32;
          const rect = node("rect", {
            x: px,
            y: py,
            width: 12,
            height: 22,
            rx: 3,
            fill: colors[p.status],
            class: "mini-map-place",
          });
          rect.append(node("title", {}, `${p.code} · ${names[p.status]}`));
          svg.append(rect);
          places.push({ x: px, y: py, data: p });
        });
      });
    });
    for (let x = 35; x < 1100; x += 55)
      for (const y of [22, 628])
        svg.append(node("circle", { cx: x, cy: y, r: 7, fill: "#759773" }));
    svg.append(
      node(
        "text",
        {
          x: 560,
          y: 385,
          fill: "#eadfc6",
          "font-size": 11,
          "text-anchor": "middle",
          "font-family": "sans-serif",
        },
        "PLAC PAMIĘCI"
      )
    );
    resize();
  }
  new ResizeObserver(resize).observe(svg);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  fetch(host.dataset.api, { signal: controller.signal, cache: "no-store" })
    .then((r) => {
      if (!r.ok) throw Error();
      return r.json();
    })
    .then((data) => {
      draw(data.places);
      status.textContent = data.places.length
        ? `${data.places.length} miejsc · demo`
        : "Brak miejsc";
    })
    .catch(() => {
      status.textContent = "Mapa niedostępna";
      document.querySelector("#mini-map-help").textContent =
        "Nie udało się wczytać mapy. Odśwież stronę, aby ponowić.";
    })
    .finally(() => clearTimeout(timer));
})();
