(() => {
  "use strict";
  const root = document.querySelector("#map-main");
  const form = document.querySelector("#filters");
  const grid = document.querySelector("#places");
  const details = document.querySelector("#details");
  const status = document.querySelector("#result-status");
  const error = document.querySelector("#map-error");
  const retry = document.querySelector("#retry");
  const fields = [...form.querySelectorAll("select")];
  const labels = {
    available: "Wolne",
    reserved: "Zarezerwowane",
    occupied: "Zajęte",
    adult: "Dla dorosłych",
    child: "Dla dzieci",
    single: "Jednoosobowe",
    double: "Dwuosobowe",
    family: "Rodzinne",
    standard: "Standardowy",
    reinforced: "Wzmocniony",
  };
  const marks = { available: "W", reserved: "R", occupied: "Z" };
  let controller;
  let selected = null;
  let loaded = [];
  const scene = new CemeteryScene(document.querySelector("#cemetery-scene"), select);
  function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function restore() {
    const params = new URLSearchParams(location.search);
    fields.forEach((field) => {
      field.value = params.get(field.name) || "";
      if (field.selectedIndex < 0) field.value = "";
    });
    selected = params.get("miejsce");
  }
  function params() {
    const value = new URLSearchParams();
    fields.forEach((field) => {
      if (field.value) value.set(field.name, field.value);
    });
    return value;
  }
  function writeUrl(push = false) {
    const query = params();
    if (selected) query.set("miejsce", selected);
    history[push ? "pushState" : "replaceState"](
      {},
      "",
      location.pathname + (query.size ? "?" + query : "")
    );
  }
  function showDetails(place) {
    details.replaceChildren(
      el("p", "TWÓJ WYBÓR", "eyebrow"),
      el("h2", place ? place.code : "Szczegóły miejsca")
    );
    if (!place) {
      details.append(
        el("p", "Wybierz miejsce na mapie, aby zobaczyć jego cechy i dostępność.")
      );
      return;
    }
    const list = el("dl");
    const values = {
      Poziom: place.level_name,
      Sektor: place.sector,
      Rząd: place.row,
      Numer: place.number,
      Typ: labels[place.kind],
      Pojemność: labels[place.capacity],
      Grunt: labels[place.ground],
      Dostępność: labels[place.status],
    };
    Object.entries(values).forEach(([key, value]) =>
      list.append(el("dt", key), el("dd", String(value)))
    );
    details.append(list);
    if (place.status !== "available") {
      details.append(el("p", "To miejsce nie jest dostępne do rezerwacji."));
    } else if (root.dataset.booking) {
      const link = el("a", "Przejdź do rezerwacji →", "booking-link");
      const url = new URL(root.dataset.booking, location.origin);
      url.searchParams.set("miejsce", place.id);
      link.href = url;
      details.append(link);
    } else {
      details.append(
        el(
          "p",
          "Miejsce jest wolne. Rezerwacje online będą dostępne po uruchomieniu modułu rezerwacji."
        )
      );
    }
  }
  function select(place) {
    selected = String(place.id);
    writeUrl();
    grid
      .querySelectorAll(".place")
      .forEach((button) =>
        button.setAttribute("aria-pressed", String(button.dataset.id === selected))
      );
    showDetails(place);
    scene.select(selected);
  }
  function render() {
    grid.replaceChildren();
    const groups = new Map();
    loaded.forEach((place) => {
      if (!groups.has(place.level)) groups.set(place.level, new Map());
      const sectors = groups.get(place.level);
      if (!sectors.has(place.sector)) sectors.set(place.sector, new Map());
      const rows = sectors.get(place.sector);
      if (!rows.has(place.row)) rows.set(place.row, []);
      rows.get(place.row).push(place);
    });
    groups.forEach((sectors, level) => {
      grid.append(
        el("h2", loaded.find((p) => p.level === level).level_name, "level-title")
      );
      sectors.forEach((rows, sector) => {
        const section = el("section", "", "sector");
        section.append(el("h3", "Sektor " + sector));
        rows.forEach((places, row) => {
          const line = el("div", "", "place-row");
          line.append(el("span", "Rząd " + row, "row-label"));
          for (let number = 1; number <= 8; number++) {
            const place = places.find((p) => p.number === number);
            if (!place) {
              const blank = el("span");
              blank.setAttribute("aria-hidden", "true");
              line.append(blank);
              continue;
            }
            const button = el(
              "button",
              `${place.number} · ${marks[place.status]}`,
              "place " + place.status
            );
            button.type = "button";
            button.dataset.id = place.id;
            button.setAttribute(
              "aria-label",
              `Miejsce ${place.code}, ${labels[place.status]}. Pokaż szczegóły`
            );
            button.setAttribute("aria-pressed", String(String(place.id) === selected));
            button.addEventListener("click", () => select(place));
            line.append(button);
          }
          section.append(line);
        });
        grid.append(section);
      });
    });
    const place = loaded.find((p) => String(p.id) === selected);
    if (!place) selected = null;
    showDetails(place);
    scene.update(loaded, selected);
    writeUrl();
    if (!loaded.length)
      grid.append(
        el(
          "p",
          "Brak miejsc spełniających warunki. Wyczyść filtry lub wybierz inne kryteria."
        )
      );
    status.textContent = `Znaleziono: ${loaded.length} · wolne: ${loaded.filter((p) => p.status === "available").length}`;
  }
  async function load() {
    controller?.abort();
    const current = new AbortController();
    controller = current;
    grid.setAttribute("aria-busy", "true");
    grid.replaceChildren();
    scene.update([], null);
    showDetails(null);
    error.hidden = retry.hidden = true;
    status.textContent = "Ładowanie miejsc…";
    const timeout = setTimeout(() => current.abort(), 15000);
    try {
      const response = await fetch(root.dataset.api + "?" + params(), {
        signal: current.signal,
        cache: "no-store",
      });
      if (!response.ok) throw new Error("API error");
      const data = await response.json();
      if (controller !== current) return;
      loaded = data.places;
      render();
    } catch (err) {
      if (controller !== current) return;
      status.textContent = "Mapa jest chwilowo niedostępna.";
      error.hidden = retry.hidden = false;
    } finally {
      clearTimeout(timeout);
      if (controller === current) grid.setAttribute("aria-busy", "false");
    }
  }
  form.addEventListener("submit", (event) => event.preventDefault());
  form.addEventListener("change", () => {
    selected = null;
    writeUrl(true);
    load();
  });
  form.addEventListener("reset", (event) => {
    event.preventDefault();
    fields.forEach((field) => {
      field.value = "";
    });
    selected = null;
    writeUrl(true);
    load();
  });
  window.addEventListener("popstate", () => {
    restore();
    load();
  });
  retry.addEventListener("click", load);
  document.querySelector("#refresh").addEventListener("click", load);
  restore();
  load();
})();
