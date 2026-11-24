(() => {
  const dialog = document.getElementById("cancel-dialog");
  if (!dialog) return;
  let pending = null;
  document.querySelectorAll("form[data-cancel]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      if (pending === form) return;
      event.preventDefault();
      pending = null;
      document.getElementById("cancel-text").textContent =
        `Miejsce ${form.dataset.cancel} wróci do puli wolnych. Tej operacji nie można cofnąć.`;
      dialog.returnTarget = form.querySelector("button");
      dialog.showModal();
      document.getElementById("cancel-keep").focus();
    });
  });
  document.getElementById("cancel-keep").addEventListener("click", () => dialog.close());
  document.getElementById("cancel-confirm").addEventListener("click", () => {
    pending = dialog.returnTarget.form;
    pending.requestSubmit();
  });
  // Esc i „Nie” zwracają fokus na przycisk „Anuluj”.
  dialog.addEventListener("close", () => {
    if (!pending) dialog.returnTarget.focus();
  });
})();
