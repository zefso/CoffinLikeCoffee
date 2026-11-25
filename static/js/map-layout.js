/* Wspólne współrzędne dla widoku z góry i 3D. Filtry nie przesuwają miejsc. */
const CemeteryLayout = (() => {
  "use strict";

  const groupKey = (place) => `${place.level}:${place.sector}`;
  const sortedNumbers = (items, field) =>
    [...new Set(items.map((place) => place[field]))].sort((a, b) => a - b);

  function arrange(items) {
    const columns = sortedNumbers(items, "number");
    const rows = sortedNumbers(items, "row");
    const columnIndex = new Map(columns.map((value, index) => [value, index]));
    const rowIndex = new Map(rows.map((value, index) => [value, index]));
    const positions = new Map();
    const coordinate = (index, count, spacing) =>
      (index - (count - 1) / 2) * spacing + (index < count / 2 ? -0.5 : 0.5);

    items.forEach((place) => {
      positions.set(place.id, {
        x: coordinate(columnIndex.get(place.number), columns.length, 2),
        z: coordinate(rowIndex.get(place.row), rows.length, 2.9),
        width: place.capacity === "family" ? 1.4 : place.capacity === "double" ? 1.2 : 1,
        depth: 1.85,
      });
    });

    return {
      positions,
      rows,
      columns,
      width: Math.max(12, columns.length * 2 + 4),
      depth: Math.max(10, rows.length * 2.9 + 4),
    };
  }

  return { groupKey, arrange };
})();
