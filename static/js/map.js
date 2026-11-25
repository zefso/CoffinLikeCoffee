(() => {
  "use strict";

  const root = document.querySelector("#map-main");
  const form = document.querySelector("#filters");
  const panel = document.querySelector("#scene-panel");
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
  let controller;
  let selected = null;
  let floor = 0;
  let allPlaces = [];
  const scene = new CemeteryScene(document.querySelector("#cemetery-scene"), select);
  const floors = new CemeteryFloors((value) => {
    floor = value;
    selected = null;
    populateFilters(filterValues());
    render(true);
  });

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function filterValues() {
    return Object.fromEntries(fields.map((field) => [field.name, field.value]));
  }

  function setOptions(name, items, title, format) {
    const field = form.elements.namedItem(name);
    const values = [...new Set(items.map((place) => place[name]))].sort((a, b) =>
      String(a).localeCompare(String(b), "pl", { numeric: true })
    );
    field.replaceChildren(
      new Option(title, ""),
      ...values.map((value) => new Option(format(value), String(value)))
    );
  }

  function populateFilters(wanted) {
    // Opcje położenia pochodzą z API. Zmiana strefy ogranicza sektory i rzędy.
    let items = allPlaces.filter((place) => place.floor === floor);
    for (const [name, title] of [
      ["level", "Wszystkie strefy"],
      ["sector", "Wszystkie sektory"],
      ["row", "Wszystkie rzędy"],
    ]) {
      setOptions(name, items, title, (value) =>
        name === "level"
          ? items.find((place) => place.level === value).level_name
          : String(value)
      );
      const field = form.elements.namedItem(name);
      field.value = wanted[name] || "";
      if (field.selectedIndex < 0) field.value = "";
      if (field.value)
        items = items.filter((place) => String(place[name]) === field.value);
    }
    for (const field of fields.filter(
      (field) => !["level", "sector", "row"].includes(field.name)
    )) {
      field.value = wanted[field.name] || "";
      if (field.selectedIndex < 0) field.value = "";
    }
  }

  function restore() {
    const params = new URLSearchParams(location.search);
    selected = params.get("miejsce");
    const chosen = allPlaces.find((place) => String(place.id) === selected);
    const requestedFloor = params.get("floor");
    floor =
      requestedFloor !== null && Object.hasOwn(CemeteryScene.themes, requestedFloor)
        ? Number(requestedFloor)
        : (chosen?.floor ?? 0);
    populateFilters(Object.fromEntries(params));
    scene.setMode(params.get("widok") === "2d" ? "2d" : "3d");
  }

  function writeUrl(push = false) {
    const params = new URLSearchParams();
    if (floor !== 0) params.set("floor", floor);
    fields.forEach((field) => {
      if (field.value) params.set(field.name, field.value);
    });
    if (scene.mode === "2d") params.set("widok", "2d");
    if (selected) params.set("miejsce", selected);
    const url = location.pathname + (params.size ? `?${params}` : "");
    if (url !== location.pathname + location.search)
      history[push ? "pushState" : "replaceState"]({}, "", url);
    const bookingLink = details.querySelector(".booking-link");
    if (bookingLink) {
      const bookingUrl = new URL(bookingLink.href);
      bookingUrl.searchParams.set("mapa", params.toString());
      bookingLink.href = bookingUrl;
    }
  }

  function showDetails(place) {
    details.replaceChildren(
      element("p", "TWÓJ WYBÓR", "eyebrow"),
      element("h2", place ? place.code : "Szczegóły miejsca")
    );
    if (!place) {
      details.append(
        element(
          "p",
          "Wybierz miejsce na mapie lub z listy, aby zobaczyć jego cechy i dostępność."
        )
      );
      return;
    }
    const list = element("dl");
    const values = {
      Piętro: `${String(place.floor).replace("-", "−")} · ${CemeteryScene.themes[place.floor].name}`,
      Strefa: place.level_name,
      Sektor: place.sector,
      Rząd: place.row,
      Numer: place.number,
      Typ: labels[place.kind],
      Pojemność: labels[place.capacity],
      Grunt: labels[place.ground],
      Dostępność: labels[place.status] || "Niedostępne",
    };
    Object.entries(values).forEach(([name, value]) =>
      list.append(element("dt", name), element("dd", String(value)))
    );
    details.append(list);
    if (place.status !== "available") {
      details.append(element("p", "To miejsce nie jest dostępne do rezerwacji."));
      return;
    }
    const link = element("a", "Przejdź do rezerwacji →", "booking-link");
    const url = new URL(root.dataset.booking, location.origin);
    // Sam ID uruchamia w konfiguratorze pakiet „Wybrane miejsce” i krok 3.
    url.searchParams.set("miejsce", place.id);
    link.href = url;
    details.append(link);
  }

  function select(place) {
    selected = String(place.id);
    showDetails(place);
    scene.select(selected);
    writeUrl(true);
  }

  function render(push = false) {
    const onFloor = allPlaces.filter((place) => place.floor === floor);
    const visible = onFloor.filter((place) =>
      fields.every((field) => !field.value || String(place[field.name]) === field.value)
    );
    const chosen = visible.find((place) => String(place.id) === selected);
    if (!chosen) selected = null;
    floors.update(floor);
    scene.update(visible, selected, onFloor, floor);
    showDetails(chosen);
    status.textContent = `Piętro ${String(floor).replace("-", "−")} · znaleziono: ${visible.length} · wolne: ${visible.filter((place) => place.status === "available").length}`;
    writeUrl(push);
  }

  async function load() {
    controller?.abort();
    const current = new AbortController();
    controller = current;
    panel.setAttribute("aria-busy", "true");
    panel.inert = true;
    fields.forEach((field) => {
      field.disabled = true;
    });
    error.hidden = retry.hidden = true;
    status.textContent = "Ładowanie miejsc…";
    const timeout = setTimeout(() => current.abort(), 15000);
    try {
      // Pełny, niewielki zbiór pozwala zachować geometrię miejsc po filtrowaniu.
      const response = await fetch(root.dataset.api, {
        signal: current.signal,
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Nie udało się pobrać miejsc");
      const data = await response.json();
      if (!Array.isArray(data.places)) throw new Error("Nieprawidłowe dane mapy");
      if (controller !== current) return;
      allPlaces = data.places;
      restore();
      render();
    } catch (failure) {
      if (controller !== current) return;
      allPlaces = [];
      scene.update([], null, [], floor);
      showDetails(null);
      status.textContent = "Mapa jest chwilowo niedostępna.";
      error.hidden = retry.hidden = false;
    } finally {
      clearTimeout(timeout);
      if (controller === current) {
        panel.setAttribute("aria-busy", "false");
        panel.inert = false;
        fields.forEach((field) => {
          field.disabled = false;
        });
      }
    }
  }

  form.addEventListener("submit", (event) => event.preventDefault());
  form.addEventListener("change", () => {
    selected = null;
    populateFilters(filterValues());
    render(true);
  });
  form.addEventListener("reset", (event) => {
    event.preventDefault();
    selected = null;
    populateFilters({});
    render(true);
  });
  scene.sector.addEventListener("change", () => {
    const place = scene.visible()[0];
    if (!place) return;
    selected = null;
    populateFilters({
      ...filterValues(),
      level: String(place.level),
      sector: place.sector,
    });
    render(true);
  });
  for (const mode of ["2d", "3d"]) {
    document.querySelector(`#view-${mode}`).addEventListener("click", () => {
      scene.setMode(mode);
      writeUrl(true);
    });
  }
  window.addEventListener("popstate", () => {
    restore();
    render();
  });
  retry.addEventListener("click", load);
  document.querySelector("#refresh").addEventListener("click", load);
  load();
})();
