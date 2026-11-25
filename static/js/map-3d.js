/* Canvas bez zewnętrznych bibliotek. Oba widoki używają tych samych miejsc i ID. */
class CemeteryScene {
  static themes = {
    0: {
      name: "Powierzchnia",
      sky: ["#dce9e0", "#f1eee0"],
      soil: ["#667c5e", "#8fa67b", "#afbf93"],
      path: "#e5dcc5",
      detail: "#759267",
    },
    "-1": {
      name: "Ziemia",
      sky: ["#352a24", "#74604c"],
      soil: ["#49362b", "#76543d", "#a67d55"],
      path: "#cbb99a",
      detail: "#745138",
    },
    "-2": {
      name: "Kamień",
      sky: ["#242c32", "#66727b"],
      soil: ["#41494e", "#737e82", "#a0a9a6"],
      path: "#d9d5c5",
      detail: "#6c787d",
    },
    "-3": {
      name: "Łupek",
      sky: ["#1f2434", "#50566d"],
      soil: ["#303549", "#555f74", "#818a9d"],
      path: "#c6c8d1",
      detail: "#454f65",
    },
    "-4": {
      name: "Lawa",
      sky: ["#251b25", "#76362c"],
      soil: ["#3d2931", "#634039", "#442e34"],
      path: "#aaa5a0",
      detail: "#ff9a47",
    },
  };
  static statuses = { available: "Wolne", reserved: "Zarezerwowane", occupied: "Zajęte" };
  static palette = {
    available: ["#638573", "#82a18a", "#b4cbb0"],
    reserved: ["#a48753", "#c5a76c", "#edd29a"],
    occupied: ["#7a7488", "#9992a7", "#c9c1d4"],
  };

  constructor(canvas, onSelect) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.onSelect = onSelect;
    this.items = [];
    this.layoutItems = [];
    this.faces = [];
    this.floor = 0;
    this.mode = "3d";
    this.selected = null;
    this.sector = document.querySelector("#scene-sector");
    this.choices = document.querySelector("#scene-choices");
    this.viewport = canvas.parentElement;
    this.resetCamera();
    this.bindControls();
    this.bindPointer();
    new ResizeObserver(() => this.draw()).observe(canvas);
  }

  resetCamera() {
    this.angle = -0.55;
    this.tilt = 0.62;
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
  }

  magnify(factor) {
    this.zoom = Math.max(0.65, Math.min(3.5, this.zoom * factor));
  }

  bindControls() {
    const bind = (id, action) => {
      document.querySelector(id).addEventListener("click", () => {
        action();
        this.draw();
      });
    };
    this.sector.addEventListener("change", () => {
      this.resetCamera();
      this.makeChoices();
      this.draw();
    });
    bind("#rotate-left", () => {
      this.angle -= 0.2;
    });
    bind("#rotate-right", () => {
      this.angle += 0.2;
    });
    bind("#zoom-in", () => this.magnify(1.2));
    bind("#zoom-out", () => this.magnify(1 / 1.2));
    bind("#reset-camera", () => this.resetCamera());
    this.canvas.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        const delta =
          event.deltaY *
          (event.deltaMode === 1
            ? 16
            : event.deltaMode === 2
              ? this.canvas.clientHeight
              : 1);
        this.magnify(Math.exp(-Math.max(-120, Math.min(120, delta)) * 0.0025));
        this.draw();
      },
      { passive: false }
    );
    this.canvas.addEventListener("keydown", (event) => {
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
        ].includes(event.key)
      )
        return;
      event.preventDefault();
      const dx = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
      const dy = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
      if (this.mode === "2d") this.movePlan(dx * 24, dy * 24);
      else {
        this.angle += dx * 0.15;
        this.tilt = Math.max(0.25, Math.min(1.15, this.tilt - dy * 0.1));
      }
      if (["+", "="].includes(event.key)) this.magnify(1.2);
      if (event.key === "-") this.magnify(1 / 1.2);
      if (event.key === "Home") this.resetCamera();
      this.draw();
    });
  }

  bindPointer() {
    this.canvas.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || this.drag) return;
      this.drag = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
      };
      this.canvas.setPointerCapture(event.pointerId);
    });
    this.canvas.addEventListener("pointermove", (event) => {
      if (this.drag?.id !== event.pointerId) return;
      const dx = event.clientX - this.drag.x;
      const dy = event.clientY - this.drag.y;
      if (
        Math.hypot(event.clientX - this.drag.startX, event.clientY - this.drag.startY) > 5
      )
        this.drag.moved = true;
      if (this.drag.moved) {
        if (this.mode === "2d") this.movePlan(dx, dy);
        else {
          this.angle += dx * 0.007;
          this.tilt = Math.max(0.25, Math.min(1.15, this.tilt + dy * 0.005));
        }
        this.draw();
      }
      this.drag.x = event.clientX;
      this.drag.y = event.clientY;
    });
    this.canvas.addEventListener("pointerup", (event) => {
      if (this.drag?.id !== event.pointerId) return;
      if (!this.drag.moved) {
        const rect = this.canvas.getBoundingClientRect();
        // Ścieżki są w pikselach CSS; DPR dotyczy wyłącznie ostrości rysunku.
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        const face = [...this.faces]
          .reverse()
          .find((item) =>
            this.ctx.isPointInPath(
              item.path,
              event.clientX - rect.left,
              event.clientY - rect.top
            )
          );
        this.ctx.restore();
        if (face?.place) this.onSelect(face.place);
      }
      this.drag = null;
    });
    this.canvas.addEventListener("pointercancel", () => {
      this.drag = null;
    });
    this.canvas.addEventListener("lostpointercapture", () => {
      this.drag = null;
    });
  }

  movePlan(dx, dy) {
    const limitX = this.canvas.clientWidth * 0.65;
    const limitY = this.canvas.clientHeight * 0.65;
    this.pan.x = Math.max(-limitX, Math.min(limitX, this.pan.x + dx));
    this.pan.y = Math.max(-limitY, Math.min(limitY, this.pan.y + dy));
  }

  setMode(mode) {
    this.mode = mode;
    this.resetCamera();
    for (const value of ["2d", "3d"])
      document
        .querySelector(`#view-${value}`)
        .setAttribute("aria-pressed", String(value === mode));
    for (const id of ["rotate-left", "rotate-right"])
      document.getElementById(id).hidden = mode === "2d";
    document.querySelector("#scene-mode-label").textContent =
      mode === "2d" ? "PLAN Z GÓRY · 2D" : "PERSPEKTYWA 3D";
    document.querySelector("#scene-help").textContent =
      mode === "2d"
        ? "Widok prosto z góry. Przeciągnij lub użyj strzałek, aby przesunąć plan. Kółko myszy lub +/− zmienia skalę, Home przywraca widok. Miejsca są też na liście poniżej."
        : "Przeciągnij lub użyj strzałek, aby obrócić. Kółko myszy lub +/− zmienia skalę, Home przywraca widok. Kliknij nagrobek albo wybierz miejsce z listy poniżej.";
    this.canvas.setAttribute(
      "aria-label",
      mode === "2d" ? "Płaski plan sektora z góry" : "Mapa 3D sektora"
    );
    this.draw();
  }

  update(items, selected, layoutItems, floor) {
    const changedFloor = this.floor !== floor;
    const previousGroup = this.sector.value;
    this.items = items;
    this.layoutItems = layoutItems;
    this.selected = selected;
    this.floor = floor;
    this.viewport.dataset.floor = floor;
    document.querySelector("#scene-floor-label").textContent =
      CemeteryScene.themes[floor].name;
    const groups = new Map(
      items.map((place) => [
        CemeteryLayout.groupKey(place),
        `${place.level_name} · sektor ${place.sector}`,
      ])
    );
    this.sector.replaceChildren(
      ...[...groups].map(([value, text]) => new Option(text, value))
    );
    const chosen = items.find((place) => String(place.id) === selected);
    const wanted = chosen ? CemeteryLayout.groupKey(chosen) : previousGroup;
    if (groups.has(wanted)) this.sector.value = wanted;
    this.sector.disabled = !groups.size;
    document.querySelector("#scene-empty").hidden = items.length > 0;
    if (changedFloor) this.resetCamera();
    this.makeChoices();
    this.draw();
    if (changedFloor) {
      this.canvas.getAnimations().forEach((animation) => animation.cancel());
    }
    if (changedFloor && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.canvas.animate(
        [
          { opacity: 0.3, transform: "translateY(8px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 280, easing: "ease-out" }
      );
    }
  }

  visible() {
    return this.items.filter(
      (place) => CemeteryLayout.groupKey(place) === this.sector.value
    );
  }

  select(id) {
    this.selected = id;
    this.choices
      .querySelectorAll("button")
      .forEach((button) =>
        button.setAttribute("aria-pressed", String(button.dataset.id === id))
      );
    this.draw();
  }

  makeChoices() {
    const visible = this.visible();
    document.querySelector("#scene-count").textContent = `(${visible.length})`;
    this.choices.replaceChildren(
      ...visible.map((place) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `scene-choice ${place.status}`;
        const status = CemeteryScene.statuses[place.status] || "Niedostępne";
        button.textContent = `${place.row}.${place.number} · ${status}`;
        button.setAttribute("aria-label", `Wybierz ${place.code}, ${status}`);
        button.setAttribute("aria-pressed", String(String(place.id) === this.selected));
        button.dataset.id = place.id;
        button.addEventListener("click", () => this.onSelect(place));
        return button;
      })
    );
  }

  project(x, y, z) {
    if (this.mode === "2d")
      return [
        this.width / 2 + x * this.scale + this.pan.x,
        this.height / 2 + z * this.scale + this.pan.y,
        0,
      ];
    const rx = x * Math.cos(this.angle) - z * Math.sin(this.angle);
    const rz = x * Math.sin(this.angle) + z * Math.cos(this.angle);
    return [
      this.width / 2 + rx * this.scale,
      this.height / 2 +
        14 +
        (rz * Math.sin(this.tilt) - y * Math.cos(this.tilt)) * this.scale,
      rz * Math.cos(this.tilt) + y * Math.sin(this.tilt),
    ];
  }

  path(vertices) {
    const path = new Path2D();
    vertices.forEach(([x, y], index) => (index ? path.lineTo(x, y) : path.moveTo(x, y)));
    path.closePath();
    return path;
  }

  plane(x, z, width, depth, y = 0) {
    return this.path(
      [
        [x, y, z],
        [x + width, y, z],
        [x + width, y, z + depth],
        [x, y, z + depth],
      ].map((point) => this.project(...point))
    );
  }

  box(x, y, z, width, height, depth, colors, place = null) {
    const vertices = [
      [x, y, z],
      [x + width, y, z],
      [x + width, y + height, z],
      [x, y + height, z],
      [x, y, z + depth],
      [x + width, y, z + depth],
      [x + width, y + height, z + depth],
      [x, y + height, z + depth],
    ].map((point) => this.project(...point));
    const sides =
      this.mode === "2d"
        ? [[3, 2, 6, 7]]
        : [
            [0, 1, 2, 3],
            [4, 7, 6, 5],
            [0, 3, 7, 4],
            [1, 5, 6, 2],
            [3, 2, 6, 7],
          ];
    sides.forEach((indices, index) => {
      const points = indices.map((i) => vertices[i]);
      this.faces.push({
        path: this.path(points),
        place,
        depth: points.reduce((sum, point) => sum + point[2], 0) / 4,
        color:
          colors[
            this.mode === "2d" || index === 4 ? colors.length - 1 : index % colors.length
          ],
      });
    });
  }

  paintFaces() {
    this.faces
      .sort((a, b) => a.depth - b.depth)
      .forEach((face) => {
        this.ctx.fillStyle = face.color;
        this.ctx.fill(face.path);
        this.ctx.strokeStyle = "rgba(26,37,34,.16)";
        this.ctx.lineWidth = 0.7;
        this.ctx.stroke(face.path);
      });
  }

  drawTerrain(layout, theme) {
    const { width, depth } = layout;
    this.box(-width / 2, -0.65, -depth / 2, width, 0.65, depth, theme.soil);
    this.paintFaces();
    this.faces = [];
    const ctx = this.ctx;
    ctx.save();
    ctx.clip(this.plane(-width / 2, -depth / 2, width, depth));
    // Wzór pozostaje w tym samym miejscu podczas obrotu i zoomu.
    for (let i = 0; i < 110; i++) {
      const x = (((i * 37) % 109) / 109 - 0.5) * width;
      const z = (((i * 53) % 107) / 107 - 0.5) * depth;
      ctx.strokeStyle = theme.detail;
      ctx.lineWidth = this.floor === -4 ? 1.5 : 0.8;
      ctx.globalAlpha = this.floor === -4 ? 0.85 : 0.45;
      const points =
        this.floor === -3
          ? [
              [x, 0, z],
              [x + 2.1, 0, z - 0.3],
              [x + 2.8, 0, z - 0.3],
            ]
          : this.floor === -4
            ? [
                [x, 0, z],
                [x + 0.5, 0, z + 0.2],
                [x + 0.7, 0, z + 0.8],
                [x + 1.3, 0, z + 1],
              ]
            : [
                [x, 0, z],
                [x + 0.16, 0, z - 0.2],
                [x + 0.35, 0, z],
              ];
      ctx.beginPath();
      points
        .map((point) => this.project(...point))
        .forEach(([px, py], index) => (index ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      ctx.stroke();
      if (this.floor === -2) {
        ctx.fillStyle = i % 2 ? "#bcc2ba" : "#7d898b";
        ctx.fill(this.plane(x, z, 0.6, 0.45));
      }
    }
    ctx.restore();
    if (layout.rows.length % 2 === 0)
      this.box(-width / 2, 0.01, -0.4, width, 0.04, 0.8, [theme.path]);
    if (layout.columns.length % 2 === 0)
      this.box(-0.35, 0.01, -depth / 2, 0.7, 0.04, depth, [theme.path]);
    this.paintFaces();
    this.faces = [];
  }

  drawPlace(place, position) {
    const { x, z, width, depth } = position;
    const selected = String(place.id) === this.selected;
    const colors = selected
      ? ["#a97635", "#d7a24f", "#ffe09a"]
      : CemeteryScene.palette[place.status] || CemeteryScene.palette.occupied;
    const left = x - width / 2;
    const top = z - depth / 2;
    if (this.mode === "2d") {
      this.box(
        left - 0.1,
        0,
        top - 0.1,
        width + 0.2,
        0,
        depth + 0.2,
        [selected ? "#263d32" : "#eee8d9"],
        place
      );
      this.box(left, 0, top, width, 0, depth, [colors[2]], place);
      this.box(left, 0, top, width, 0, 0.25, [colors[0]], place);
    } else {
      this.box(
        left - 0.08,
        0.06,
        top,
        width + 0.16,
        0.18,
        depth,
        ["#aaa99c", "#d1d0bd", "#e5dfce"],
        place
      );
      this.box(
        left,
        0.24,
        top + 0.04,
        width,
        place.kind === "child" ? 0.65 : 1.05,
        0.24,
        colors,
        place
      );
      this.box(
        left + 0.06,
        0.24,
        top + 0.4,
        width - 0.12,
        0.14,
        depth - 0.55,
        colors,
        place
      );
    }
  }

  drawLandmarks(layout, theme) {
    for (const x of [-layout.width / 2 + 1, layout.width / 2 - 1]) {
      for (const z of [-layout.depth / 2 + 0.8, layout.depth / 2 - 0.8]) {
        if (this.floor === 0) {
          this.box(x - 0.1, 0, z - 0.1, 0.2, 1, 0.2, ["#7b674e"]);
          this.box(x - 0.4, 0.6, z - 0.4, 0.8, 1.2, 0.8, [
            "#4b7058",
            "#608566",
            "#789973",
          ]);
        } else this.box(x - 0.4, 0, z - 0.3, 0.8, 0.5, 0.6, theme.soil);
      }
    }
  }

  drawLabels(items, layout) {
    const ctx = this.ctx;
    const fontSize = Math.max(8, Math.min(11, this.scale * 0.55));
    ctx.font = `600 ${fontSize}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const marks = { available: "W", reserved: "R", occupied: "Z" };
    items.forEach((place) => {
      const position = layout.positions.get(place.id);
      if (!position) return;
      const [x, y] = this.project(
        position.x,
        1.5,
        position.z + (this.mode === "2d" ? 0.2 : -0.6)
      );
      const text = `${place.row}.${place.number} ${marks[place.status] || "–"}`;
      const labelWidth = ctx.measureText(text).width + 6;
      ctx.fillStyle =
        String(place.id) === this.selected ? "#ffdf95" : "rgba(255,253,248,.95)";
      ctx.fillRect(x - labelWidth / 2, y - fontSize / 2 - 2, labelWidth, fontSize + 4);
      ctx.fillStyle = "#283c33";
      ctx.fillText(text, x, y);
    });
  }

  draw() {
    if (!this.ctx) return;
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    if (!this.width || !this.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const group = this.layoutItems.filter(
      (place) => CemeteryLayout.groupKey(place) === this.sector.value
    );
    const layout = CemeteryLayout.arrange(group);
    const boundsWidth =
      this.mode === "2d"
        ? layout.width
        : Math.abs(Math.cos(this.angle)) * layout.width +
          Math.abs(Math.sin(this.angle)) * layout.depth;
    const boundsHeight =
      this.mode === "2d"
        ? layout.depth
        : (Math.abs(Math.sin(this.angle)) * layout.width +
            Math.abs(Math.cos(this.angle)) * layout.depth) *
            Math.sin(this.tilt) +
          4;
    this.scale =
      Math.min((this.width - 32) / boundsWidth, (this.height - 100) / boundsHeight) *
      this.zoom;
    const theme = CemeteryScene.themes[this.floor];
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    theme.sky.forEach((color, index) => gradient.addColorStop(index, color));
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.faces = [];
    this.drawTerrain(layout, theme);
    this.drawLandmarks(layout, theme);
    const visible = this.visible();
    visible.forEach((place) => {
      const position = layout.positions.get(place.id);
      if (position) this.drawPlace(place, position);
    });
    this.paintFaces();
    this.drawLabels(visible, layout);
  }
}
