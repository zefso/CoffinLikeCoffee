const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");

const context = vm.createContext({});
for (const name of ["map-layout", "map-3d"]) {
  vm.runInContext(
    readFileSync(join(__dirname, "../static/js", `${name}.js`), "utf8"),
    context
  );
}
const layout = vm.runInContext("CemeteryLayout", context);
const scene = vm.runInContext("CemeteryScene", context);

test("Układ obejmuje nietypowe rzędy i numery, również większe niż 8", () => {
  const places = [
    { id: 1, row: 2, number: 1, capacity: "single" },
    { id: 2, row: 2, number: 16, capacity: "family" },
    { id: 3, row: 12, number: 9, capacity: "double" },
  ];
  const result = layout.arrange(places);
  assert.equal(result.positions.size, 3);
  for (const position of result.positions.values()) {
    assert.ok(Number.isFinite(position.x) && Number.isFinite(position.z));
    assert.ok(Math.abs(position.x) + position.width / 2 < result.width / 2);
    assert.ok(Math.abs(position.z) + position.depth / 2 < result.depth / 2);
  }
  assert.equal(result.positions.get(1).z, result.positions.get(2).z);
  assert.notEqual(result.positions.get(1).x, result.positions.get(2).x);
  assert.notEqual(result.positions.get(1).z, result.positions.get(3).z);
});

test("Plan 2D ignoruje wysokość i obrót kamery, zachowując proste kąty i skalę", () => {
  const camera = {
    mode: "2d",
    width: 600,
    height: 400,
    scale: 10,
    pan: { x: 20, y: -10 },
    angle: 0.7,
    tilt: 0.3,
  };
  const project = (...point) =>
    Array.from(scene.prototype.project.call(camera, ...point));
  assert.deepEqual(project(2, 0, 3), project(2, 30, 3));
  assert.deepEqual(project(2, 0, 3), [340, 220, 0]);
  assert.deepEqual(project(3, 0, 3), [350, 220, 0]);
  assert.deepEqual(project(2, 0, 4), [340, 230, 0]);
});

test("Pusty sektor ma poprawne wymiary do wyświetlenia komunikatu", () => {
  const result = layout.arrange([]);
  assert.equal(result.positions.size, 0);
  assert.ok(result.width > 0 && result.depth > 0);
});
