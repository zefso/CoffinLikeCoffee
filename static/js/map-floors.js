/* Przycisk piętra działa także klawiaturą; zamknięte opcje nie przejmują fokusu. */
class CemeteryFloors {
  constructor(onChange) {
    this.picker = document.querySelector("#floor-picker");
    this.toggle = document.querySelector("#floor-toggle");
    this.options = document.querySelector("#floor-options");
    this.buttons = [...this.options.querySelectorAll("button")];
    this.floor = 0;

    this.toggle.addEventListener("click", () => this.setOpen(!this.open));
    this.buttons.forEach((button) =>
      button.addEventListener("click", () => {
        this.setOpen(false);
        this.toggle.focus();
        onChange(Number(button.dataset.floor));
      })
    );
    this.picker.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        this.setOpen(false);
        this.toggle.focus();
        event.preventDefault();
      }
      if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      if (!this.open) this.setOpen(true);
      const index = this.buttons.indexOf(document.activeElement);
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? this.buttons.length - 1
            : (index + (event.key === "ArrowUp" ? -1 : 1) + this.buttons.length) %
              this.buttons.length;
      this.buttons[next].focus();
    });
    document.addEventListener("pointerdown", (event) => {
      if (!this.picker.contains(event.target)) this.setOpen(false);
    });
    this.picker.addEventListener("focusout", (event) => {
      if (!this.picker.contains(event.relatedTarget)) this.setOpen(false);
    });
    this.update(0);
  }

  setOpen(open) {
    this.open = open;
    this.picker.dataset.open = String(open);
    this.toggle.setAttribute("aria-expanded", String(open));
    this.options.inert = !open;
    if (open)
      this.buttons.find((button) => Number(button.dataset.floor) === this.floor)?.focus();
  }

  update(floor) {
    this.floor = floor;
    const label = String(floor).replace("-", "−");
    document.querySelector("#floor-current").textContent = label;
    this.toggle.setAttribute("aria-label", `Wybierz piętro. Obecne piętro: ${label}`);
    this.buttons.forEach((button) => {
      button.setAttribute("aria-pressed", String(Number(button.dataset.floor) === floor));
      button.querySelector("b").textContent = button.dataset.floor.replace("-", "−");
    });
  }
}
