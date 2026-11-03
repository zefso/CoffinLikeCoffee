/* Small orthographic 3D renderer: world vertices, camera rotation and depth-sorted faces.
   No external services or assets. The same Place IDs drive both map views. */
class CemeteryScene {
  constructor(canvas, onSelect) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.onSelect = onSelect;
    this.items = [];
    this.selected = null;
    this.angle = -0.55;
    this.tilt = 0.55;
    this.zoom = 1;
    this.sector = document.querySelector("#scene-sector");
    this.choices = document.querySelector("#scene-choices");
    this.sector.addEventListener("change", () => {
      this.makeChoices();
      this.draw();
    });
    const bind = (id, action) =>
      document.querySelector(id).addEventListener("click", () => {
        action();
        this.draw();
      });
    bind("#rotate-left", () => {
      this.angle -= 0.2;
    });
    bind("#rotate-right", () => {
      this.angle += 0.2;
    });
    bind("#zoom-in", () => {
      this.zoom = Math.min(2, this.zoom + 0.15);
    });
    bind("#zoom-out", () => {
      this.zoom = Math.max(0.65, this.zoom - 0.15);
    });
    bind("#reset-camera", () => {
      this.angle = -0.55;
      this.tilt = 0.55;
      this.zoom = 1;
    });
    this.canvas.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      this.drag = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        startX: e.clientX,
        startY: e.clientY,
        moved: false,
      };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!this.drag || this.drag.id !== e.pointerId) return;
      if (Math.hypot(e.clientX - this.drag.startX, e.clientY - this.drag.startY) > 5)
        this.drag.moved = true;
      if (this.drag.moved) {
        this.angle += (e.clientX - this.drag.x) * 0.007;
        this.tilt = Math.max(
          0.25,
          Math.min(1.1, this.tilt + (e.clientY - this.drag.y) * 0.005)
        );
        this.draw();
      }
      this.drag.x = e.clientX;
      this.drag.y = e.clientY;
    });
    canvas.addEventListener("pointerup", (e) => {
      if (!this.drag || this.drag.id !== e.pointerId) return;
      if (!this.drag.moved) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left,
          y = e.clientY - rect.top;
        const face = [...this.faces]
          .reverse()
          .find((f) => this.ctx.isPointInPath(f.path, x, y));
        if (face?.place) this.onSelect(face.place);
      }
      this.drag = null;
    });
    canvas.addEventListener("pointercancel", () => {
      this.drag = null;
    });
    canvas.addEventListener("keydown", (e) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "-"].includes(e.key))
        return;
      e.preventDefault();
      if (e.key === "ArrowLeft") this.angle -= 0.15;
      if (e.key === "ArrowRight") this.angle += 0.15;
      if (e.key === "ArrowUp") this.tilt = Math.min(1.1, this.tilt + 0.1);
      if (e.key === "ArrowDown") this.tilt = Math.max(0.25, this.tilt - 0.1);
      if (e.key === "+") this.zoom = Math.min(2, this.zoom + 0.15);
      if (e.key === "-") this.zoom = Math.max(0.65, this.zoom - 0.15);
      this.draw();
    });
    for (const mode of ["2d", "3d"])
      bind("#view-" + mode, () => {
        document.querySelector("#scene-panel").hidden = mode !== "3d";
        document.querySelector("#places").hidden = mode !== "2d";
        for (const m of ["2d", "3d"])
          document
            .querySelector("#view-" + m)
            .setAttribute("aria-pressed", String(m === mode));
      });
    new ResizeObserver(() => this.draw()).observe(canvas);
  }
  update(items, selected) {
    const old = this.sector.value;
    this.items = items;
    this.selected = selected;
    this.sector.replaceChildren();
    const groups = new Map(
      items.map((p) => [`${p.level}-${p.sector}`, `${p.level_name} · sektor ${p.sector}`])
    );
    groups.forEach((name, key) => {
      const o = document.createElement("option");
      o.value = key;
      o.textContent = name;
      this.sector.append(o);
    });
    const chosen = items.find((p) => String(p.id) === selected);
    const wanted = chosen ? `${chosen.level}-${chosen.sector}` : old;
    if (groups.has(wanted)) this.sector.value = wanted;
    document.querySelector("#scene-empty").hidden = items.length > 0;
    this.canvas.hidden = !items.length;
    this.makeChoices();
    this.draw();
  }
  visible() {
    return this.items.filter((p) => `${p.level}-${p.sector}` === this.sector.value);
  }
  select(id) {
    this.selected = id;
    this.choices
      .querySelectorAll("button")
      .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.id === id)));
    this.draw();
  }
  makeChoices() {
    this.choices.replaceChildren();
    const names = { available: "Wolne", reserved: "Zarezerwowane", occupied: "Zajęte" };
    this.visible().forEach((p) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "scene-choice " + p.status;
      b.textContent = `${p.row}.${p.number} · ${names[p.status]}`;
      b.setAttribute("aria-label", `Wybierz ${p.code}, ${names[p.status]}`);
      b.setAttribute("aria-pressed", String(String(p.id) === this.selected));
      b.dataset.id = p.id;
      b.addEventListener("click", () => this.onSelect(p));
      this.choices.append(b);
    });
  }
  project(x, y, z) {
    const rx = x * Math.cos(this.angle) - z * Math.sin(this.angle);
    const rz = x * Math.sin(this.angle) + z * Math.cos(this.angle);
    return [
      this.width / 2 + rx * this.scale,
      this.height / 2 +
        35 +
        (rz * Math.sin(this.tilt) - y * Math.cos(this.tilt)) * this.scale,
      rz * Math.cos(this.tilt) + y * Math.sin(this.tilt),
    ];
  }
  box(x, y, z, w, h, d, color, place = null) {
    const v = [
      [x, y, z],
      [x + w, y, z],
      [x + w, y + h, z],
      [x, y + h, z],
      [x, y, z + d],
      [x + w, y, z + d],
      [x + w, y + h, z + d],
      [x, y + h, z + d],
    ].map((p) => this.project(...p));
    [
      [0, 1, 2, 3],
      [4, 7, 6, 5],
      [0, 3, 7, 4],
      [1, 5, 6, 2],
      [3, 2, 6, 7],
    ].forEach((indices, i) => {
      const points = indices.map((j) => v[j]);
      const path = new Path2D();
      points.forEach((p, k) => (k ? path.lineTo(p[0], p[1]) : path.moveTo(p[0], p[1])));
      path.closePath();
      this.faces.push({
        path,
        place,
        depth: points.reduce((s, p) => s + p[2], 0) / 4,
        color: color[i % color.length],
      });
    });
  }
  draw() {
    if (!this.ctx || this.canvas.hidden) return;
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    if (!this.width) return;
    // CSS pixel coordinates keep picking and rendering identical at every DPR.
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.scale = Math.min(this.width / 24, this.height / 18) * this.zoom;
    const ctx = this.ctx;
    this.faces = [];
    const sky = ctx.createLinearGradient(0, 0, 0, this.height);
    sky.addColorStop(0, "#e2ece8");
    sky.addColorStop(1, "#f4f1e8");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.width, this.height);
    this.box(-9, -0.7, -6.5, 18, 0.65, 13, [
      "#657763",
      "#788966",
      "#829474",
      "#9baa86",
      "#b5c59b",
    ]);
    this.box(-9, 0, -0.4, 18, 0.04, 0.8, ["#d9d1b9"]);
    this.box(-0.35, 0, -6.5, 0.7, 0.04, 13, ["#d9d1b9"]);
    const groundFaces = this.faces.sort((a, b) => a.depth - b.depth);
    this.faces = [];
    for (const x of [-8.4, 8.4])
      for (const z of [-5.7, 5.7]) {
        this.box(x, 0, z, 0.2, 1.2, 0.2, ["#87735d"]);
        this.box(x - 0.4, 0.8, z - 0.4, 1, 1.5, 1, ["#436655", "#527764", "#5c8067"]);
        this.box(x - 0.25, 2.3, z - 0.25, 0.7, 0.6, 0.7, ["#62816a", "#719075"]);
      }
    const palette = {
      available: ["#668877", "#7a9a87", "#8fab96", "#a1b9a1"],
      reserved: ["#a18857", "#b69c68", "#ccb27a", "#dfc58f"],
      occupied: ["#777383", "#8f899a", "#aaa4b3", "#bbb6c1"],
    };
    this.visible().forEach((p) => {
      const x = (p.number - 4.5) * 1.8 - 0.55,
        z = (p.row - 2.5) * 2.5 - 0.8;
      const color =
        String(p.id) === this.selected
          ? ["#bc8544", "#d39d56", "#e9b969", "#ffda8b"]
          : palette[p.status];
      const width = p.capacity === "family" ? 1.3 : p.capacity === "double" ? 1.1 : 0.9;
      this.box(x, 0.05, z, width, 0.18, 1.7, ["#c5c4b5", "#d9d7c8", "#ede7d7"], p);
      this.box(
        x + 0.04,
        0.23,
        z + 0.06,
        width - 0.08,
        p.kind === "child" ? 0.65 : 1.05,
        0.25,
        color,
        p
      );
      this.box(x + 0.09, 0.23, z + 0.4, width - 0.18, 0.12, 1.15, color, p);
    });
    this.faces = [...groundFaces, ...this.faces.sort((a, b) => a.depth - b.depth)];
    this.faces.forEach((f) => {
      ctx.fillStyle = f.color;
      ctx.fill(f.path);
      ctx.strokeStyle = "rgba(46,58,48,.12)";
      ctx.lineWidth = 0.6;
      ctx.stroke(f.path);
    });
    // Labels drawn after geometry stay readable from any camera angle.
    ctx.font = "600 11px system-ui";
    ctx.textAlign = "center";
    const marks = { available: "W", reserved: "R", occupied: "Z" };
    this.visible().forEach((p) => {
      const [x, y] = this.project(
        (p.number - 4.5) * 1.8,
        1.45,
        (p.row - 2.5) * 2.5 - 0.65
      );
      ctx.fillStyle =
        String(p.id) === this.selected ? "#ffda8b" : "rgba(255,253,249,.94)";
      ctx.fillRect(x - 20, y - 10, 40, 17);
      ctx.fillStyle = "#263d32";
      ctx.fillText(`${p.row}.${p.number} ${marks[p.status]}`, x, y + 2);
    });
    ctx.textAlign = "left";
    ctx.fillStyle = "#496454";
    ctx.font = "12px system-ui";
    ctx.fillText(
      "HORYZONT / " + (this.visible()[0]?.level_name || "MAPA").toUpperCase(),
      18,
      26
    );
  }
}
