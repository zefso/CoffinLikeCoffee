(() => {
  const root = document.getElementById("reservation");
  if (!root) return;
  const pricing = JSON.parse(document.getElementById("pricing").textContent);
  const form = document.getElementById("reservation-form");
  const fields = form.elements;
  const steps = [...form.querySelectorAll("[data-step]")];
  const message = document.getElementById("reservation-message");
  const retry = document.getElementById("reservation-retry");
  const back = document.getElementById("step-back");
  const next = document.getElementById("step-next");
  const submit = document.getElementById("step-submit");
  const seats = document.getElementById("seats");
  const beneficiary = document.getElementById("beneficiary");
  const loginLink = document.getElementById("login-link");
  const labels = {
    adult: "Dla dorosłych",
    child: "Dla dzieci",
    single: "Jednoosobowe",
    double: "Dwuosobowe",
    family: "Rodzinne",
  };
  const statusNames = {
    available: "wolne",
    reserved: "zarezerwowane",
    occupied: "zajęte",
  };
  const marks = { available: "W", reserved: "R", occupied: "Z" };
  // Parametry wyboru w URL; dane osobowe nigdy tu nie trafiają.
  const urlFields = ["kind", "capacity", "level", "package", "sector", "row"];
  let places = [];
  let step = 1;

  const money = (amount) =>
    String(amount).replace(/\B(?=(\d{3})+$)/g, " ") + " zł";
  const el = (tag, text) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const choice = () => ({
    kind: fields.kind.value,
    capacity: fields.capacity.value,
    level: fields.level.value,
    package: fields.package.value,
    sector: fields.sector.value,
    row: fields.row.value,
    reinforced: fields.reinforced.checked,
    place: fields.place.value,
  });
  const seat = () => places.find((p) => String(p.id) === fields.place.value);
  const fits = (p, c) =>
    p.status === "available" &&
    p.kind === c.kind &&
    p.capacity === c.capacity &&
    String(p.level) === c.level;
  function pool(c) {
    const ground = c.reinforced ? "reinforced" : "standard";
    return places.filter(
      (p) => fits(p, c) && (c.package === "place" || p.ground === ground)
    );
  }
  function showMessage(text) {
    message.textContent = text;
    message.hidden = !text;
  }
  function setRadio(name, value) {
    form.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
      input.checked = input.value === value;
    });
  }
  function fillSelect(select, values, allowed, prefix) {
    const current = select.value;
    select.replaceChildren(new Option("Wybierz…", ""));
    values.forEach((value) => {
      const option = new Option(`${prefix}${value}`, value);
      option.disabled = !allowed.has(value);
      select.add(option);
    });
    select.value = allowed.has(current) ? current : "";
  }
  function refreshChoices() {
    const c = choice();
    const available = places.filter((p) => p.status === "available");
    form.querySelectorAll('input[name="capacity"]').forEach((input) => {
      input.disabled = !available.some(
        (p) => p.kind === c.kind && p.capacity === input.value
      );
      if (input.disabled) input.checked = false;
    });
    c.capacity = fields.capacity.value;
    form.querySelectorAll('input[name="level"]').forEach((input) => {
      const count = places.filter((p) =>
        fits(p, { ...c, level: input.value })
      ).length;
      input.disabled = !count;
      if (input.disabled) input.checked = false;
      root.querySelector(`[data-count="${input.value}"]`).textContent = c.capacity
        ? `Wolnych pasujących miejsc: ${count}`
        : "";
    });
    c.level = fields.level.value;
    const inLevel = places.filter((p) => fits(p, c));
    const standard = inLevel.filter((p) => p.ground === "standard");
    form.querySelectorAll('input[name="package"]').forEach((input) => {
      input.disabled = !(input.value === "basic" ? standard : inLevel).length;
      if (input.disabled) input.checked = false;
      const fee = c.kind === "child" ? 0 : pricing.packages[input.value];
      root.querySelector(`[data-fee="${input.value}"]`).textContent = fee
        ? `+${money(fee)}`
        : "bez dopłaty";
    });
    c.package = fields.package.value;

    const reinforcedOption = c.package === "sector" || c.package === "row";
    document.getElementById("reinforced-field").hidden = !reinforcedOption;
    fields.reinforced.disabled = !inLevel.some((p) => p.ground === "reinforced");
    if (!reinforcedOption || fields.reinforced.disabled) {
      fields.reinforced.checked = false;
    }
    c.reinforced = fields.reinforced.checked;

    const allSeats = places.filter((p) => String(p.level) === c.level);
    const open = pool(c);
    document.getElementById("sector-field").hidden =
      !c.package || c.package === "basic";
    fillSelect(
      fields.sector,
      [...new Set(allSeats.map((p) => p.sector))],
      new Set(open.map((p) => p.sector)),
      "Sektor "
    );
    const picked = seat();
    if (c.package === "place" && picked && !fields.sector.value) {
      fields.sector.value = picked.sector;
    }
    c.sector = fields.sector.value;
    document.getElementById("row-field").hidden = c.package !== "row";
    const sectorSeats = allSeats.filter((p) => p.sector === c.sector);
    fillSelect(
      fields.row,
      [...new Set(sectorSeats.map((p) => String(p.row)))],
      new Set(open.filter((p) => p.sector === c.sector).map((p) => String(p.row))),
      "Rząd "
    );
    if (
      picked &&
      (!fits(picked, c) || (c.package === "place" && picked.sector !== c.sector))
    ) {
      fields.place.value = "";
      c.place = "";
    }
    c.row = fields.row.value;
    drawSeats(c, allSeats, open);
    if (fields.for_self) {
      fields.for_self.disabled = c.kind === "child";
      if (fields.for_self.disabled) fields.for_self.checked = false;
      beneficiary.disabled = fields.for_self.checked;
      beneficiary.hidden = fields.for_self.checked;
    }
  }
  function seatLabel(p) {
    const reinforced = p.ground === "reinforced";
    return (
      `Rząd ${p.row}, miejsce ${p.number}, ${statusNames[p.status]}` +
      (reinforced ? `, grunt wzmocniony +${money(pricing.reinforced)}` : "")
    );
  }
  function drawSeat(p, c, candidates) {
    const exact = c.package === "place";
    const node = el(exact ? "button" : "span", `${marks[p.status]}${p.number}`);
    if (p.ground === "reinforced") node.textContent += "+";
    node.className = `place ${p.status}`;
    node.style.setProperty("--column", p.number + 1);
    if (exact) {
      node.type = "button";
      node.dataset.id = p.id;
      node.disabled = !fits(p, c);
      node.setAttribute("aria-pressed", String(p.id) === c.place);
      node.setAttribute("aria-label", seatLabel(p));
    } else {
      node.classList.add(candidates.has(p.id) ? "candidate" : "dimmed");
    }
    return node;
  }
  function drawSeats(c, levelSeats, open) {
    const panel = document.getElementById("seat-panel");
    const exact = c.package === "place";
    panel.hidden = !c.package || (exact && !c.sector);
    seats.replaceChildren();
    if (panel.hidden) return;
    const sector = c.package === "basic" ? "" : c.sector;
    const row = c.package === "row" ? c.row : "";
    const shown = levelSeats.filter((p) => !sector || p.sector === sector);
    const candidates = new Set(
      open
        .filter(
          (p) => (!sector || p.sector === sector) && (!row || String(p.row) === row)
        )
        .map((p) => p.id)
    );
    // Podgląd puli jest tylko wizualny; czytniki ekranu dostają liczbę z podpisu.
    seats.classList.toggle("overview", !exact);
    seats.toggleAttribute("aria-hidden", !exact);
    document.getElementById("seat-caption").textContent = exact
      ? ""
      : `Wolne miejsca, z których przydzielimy Twoje: ${candidates.size}. Dokładne miejsce poznasz po rezerwacji.`;
    document.getElementById("seat-legend-exact").hidden = !exact;
    document.getElementById("seat-legend-pool").hidden = exact;
    [...new Set(shown.map((p) => p.sector))].forEach((name) => {
      const block = el("div");
      block.className = "sector";
      block.append(el("h3", `Sektor ${name}`));
      const inSector = shown.filter((p) => p.sector === name);
      [...new Set(inSector.map((p) => p.row))].forEach((number) => {
        const line = el("div");
        line.className = "place-row";
        const label = el("span", `R${number}`);
        label.className = "row-label";
        line.append(label);
        inSector
          .filter((p) => p.row === number)
          .forEach((p) => line.append(drawSeat(p, c, candidates)));
        block.append(line);
      });
      seats.append(block);
    });
  }
  function reinforcedNow(c) {
    return c.package === "place" ? seat()?.ground === "reinforced" : c.reinforced;
  }
  function price(c) {
    if (!c.level) return null;
    const fee = c.kind === "child" ? 0 : pricing.packages[c.package] || 0;
    return (
      pricing.levels[c.level] +
      fee +
      (pricing.capacity[c.capacity] || 0) +
      (reinforcedNow(c) ? pricing.reinforced : 0)
    );
  }
  function summaryRows(c) {
    const rows = [];
    if (c.kind) rows.push(["Typ", labels[c.kind]]);
    if (c.capacity) rows.push(["Pojemność", labels[c.capacity]]);
    if (c.level) rows.push(["Poziom", pricing.levelNames[c.level]]);
    if (c.package) rows.push(["Pakiet", pricing.packageNames[c.package]]);
    const picked = c.package === "place" ? seat() : null;
    if (picked) rows.push(["Miejsce", picked.code]);
    else if (c.package === "sector" || c.package === "row") {
      if (c.sector) rows.push(["Sektor", c.sector]);
      if (c.package === "row" && c.row) rows.push(["Rząd", c.row]);
    }
    if (c.package) {
      rows.push(["Grunt", reinforcedNow(c) ? "Wzmocniony" : "Standardowy"]);
    }
    return rows;
  }
  function drawList(list, rows) {
    list.replaceChildren();
    rows.forEach(([key, value]) => list.append(el("dt", key), el("dd", value)));
  }
  function writeUrl(push) {
    const query = new URLSearchParams();
    const c = choice();
    urlFields.forEach((name) => {
      if (c[name]) query.set(name, c[name]);
    });
    if (c.reinforced) query.set("reinforced", "1");
    if (c.place) query.set("miejsce", c.place);
    if (step > 1) query.set("step", step);
    const url = location.pathname + (query.size ? "?" + query : "");
    history[push ? "pushState" : "replaceState"]({}, "", url);
    if (loginLink) {
      const loginQuery = new URLSearchParams(query);
      loginQuery.set("step", 4);
      loginLink.href =
        root.dataset.login +
        "?next=" +
        encodeURIComponent(`${location.pathname}?${loginQuery}`);
    }
  }
  function render() {
    refreshChoices();
    const c = choice();
    const rows = summaryRows(c);
    const total = price(c);
    drawList(document.getElementById("summary"), rows);
    drawList(document.getElementById("review"), rows);
    document.getElementById("total").textContent = total ? money(total) : "—";
    steps.forEach((section) => {
      section.hidden = Number(section.dataset.step) !== step;
    });
    back.hidden = step === 1;
    next.hidden = step === 5 || (step === 4 && Boolean(loginLink));
    submit.hidden = step !== 5;
    writeUrl(false);
  }
  function stepProblem() {
    const c = choice();
    if (step === 1 && !(c.kind && c.capacity)) {
      return "Wybierz typ miejsca i pojemność.";
    }
    if (step === 2 && !c.level) return "Wybierz poziom.";
    if (step === 3) {
      if (!c.package) return "Wybierz pakiet.";
      if (c.package !== "basic" && !c.sector) return "Wybierz sektor.";
      if (c.package === "row" && !c.row) return "Wybierz rząd.";
      if (c.package === "place" && !c.place) return "Wybierz miejsce na planie.";
    }
    return "";
  }
  function go(target) {
    step = target;
    writeUrl(true);
    render();
    steps[step - 1].querySelector("h2").focus();
  }
  function clearErrors() {
    showMessage("");
    form.querySelectorAll(".field-error").forEach((node) => {
      node.textContent = "";
    });
    form.querySelectorAll("[aria-invalid]").forEach((node) => {
      node.removeAttribute("aria-invalid");
    });
  }
  function showFieldErrors(errors) {
    let other = "";
    Object.entries(errors).forEach(([name, text]) => {
      const target = document.getElementById(`error-${name}`);
      if (target) {
        target.textContent = text;
        fields[name].setAttribute("aria-invalid", "true");
      } else other = text;
    });
    if (other) {
      showMessage(other);
      go(3);
    } else go(4);
  }
  function payload() {
    const c = choice();
    const data = {
      kind: c.kind,
      capacity: c.capacity,
      level: c.level,
      package: c.package,
    };
    if (c.package === "sector" || c.package === "row") {
      data.sector = c.sector;
      data.reinforced = c.reinforced;
    }
    if (c.package === "row") data.row = c.row;
    if (c.package === "place") data.place = c.place;
    ["first_name", "last_name", "email", "phone", "pesel"].forEach((name) => {
      data[name] = fields[name].value.trim();
    });
    data.for_self = fields.for_self.checked;
    if (!data.for_self) {
      ["beneficiary_first_name", "beneficiary_last_name", "beneficiary_pesel"].forEach(
        (name) => {
          data[name] = fields[name].value.trim();
        }
      );
    }
    return data;
  }
  async function send() {
    clearErrors();
    submit.disabled = true;
    try {
      const response = await fetch(root.dataset.post, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": fields.csrfmiddlewaretoken.value,
        },
        body: JSON.stringify(payload()),
      });
      // Błąd CSRF zwraca HTML, a nie JSON.
      const data = await response.json().catch(() => ({}));
      if (response.status === 201) {
        location.href = data.url;
      } else if (response.status === 400 && data.errors) {
        showFieldErrors(data.errors);
      } else if (response.status === 409) {
        showMessage(data.error);
        fields.place.value = "";
        await loadPlaces();
        go(3);
      } else if (response.status === 401 || response.status === 403) {
        showMessage(
          "Sesja wygasła. Zaloguj się w nowej karcie i odśwież stronę; wybór pozostanie w adresie."
        );
      } else {
        showMessage(data.error || "Nie udało się zapisać rezerwacji. Spróbuj ponownie.");
      }
    } catch {
      showMessage("Brak połączenia. Twoje dane pozostały w formularzu, spróbuj ponownie.");
    } finally {
      submit.disabled = false;
    }
  }
  async function loadPlaces() {
    const response = await fetch(root.dataset.api, { cache: "no-store" });
    if (!response.ok) throw new Error(response.status);
    places = (await response.json()).places;
  }
  function restore() {
    const query = new URLSearchParams(location.search);
    ["kind", "capacity", "level", "package"].forEach((name) =>
      setRadio(name, query.get(name) || "")
    );
    fields.reinforced.checked = query.get("reinforced") === "1";
    fields.place.value = query.get("miejsce") || "";
    const picked = seat();
    if (fields.place.value && (!picked || picked.status !== "available")) {
      fields.place.value = "";
      showMessage("Wybrane na mapie miejsce nie jest już wolne. Wybierz inne poniżej.");
    } else if (picked && !query.has("kind")) {
      // Wejście z mapy: proces zaczyna się od kroku 1, a miejsce tylko podpowiada wybór.
      setRadio("kind", picked.kind);
      setRadio("capacity", picked.capacity);
      setRadio("level", String(picked.level));
    }
    refreshChoices();
    fields.sector.value = query.get("sector") || "";
    refreshChoices();
    fields.row.value = query.get("row") || "";
    // Krok z URL obowiązuje tylko, gdy poprzednie kroki są uzupełnione.
    const wanted = Math.min(Number(query.get("step")) || 1, loginLink ? 4 : 5);
    step = 1;
    while (step < wanted && !stepProblem()) step += 1;
    render();
  }
  async function start() {
    showMessage("");
    retry.hidden = true;
    try {
      await loadPlaces();
      restore();
    } catch {
      showMessage("Nie udało się pobrać miejsc.");
      retry.hidden = false;
    }
  }

  form.addEventListener("change", (event) => {
    if (event.target.matches("input, select")) {
      showMessage("");
      render();
    }
  });
  form.addEventListener("submit", (event) => event.preventDefault());
  seats.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    fields.place.value = button.dataset.id;
    showMessage("");
    render();
    seats.querySelector(`[data-id="${button.dataset.id}"]`).focus();
  });
  back.addEventListener("click", () => {
    showMessage("");
    go(step - 1);
  });
  next.addEventListener("click", () => {
    const problem = stepProblem();
    showMessage(problem);
    if (problem) return;
    if (step === 4) {
      const invalid = [...steps[3].querySelectorAll("input")].find(
        (input) => !input.disabled && !input.checkValidity()
      );
      if (invalid) {
        invalid.reportValidity();
        return;
      }
    }
    go(step + 1);
  });
  submit.addEventListener("click", send);
  retry.addEventListener("click", start);
  window.addEventListener("popstate", restore);
  start();
})();
