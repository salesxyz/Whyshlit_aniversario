// Janela modal (pagamento e login) com foco preso, Esc para fechar e restauração do foco.

import { $, h } from "../lib/dom.js";
import { icon } from "../lib/icons.js";

let lastFocus = null;

export function openSheet({ title, titleId = "sheet-title", content }) {
  const sheet = $("#sheet");
  lastFocus = document.activeElement;
  const close = h("button", { class: "btn ghost icon-btn", type: "button", "aria-label": "Fechar", onclick: closeSheet }, icon("x"));
  sheet.replaceChildren(
    h("div", { class: "sheet-back", onclick: closeSheet }),
    h("div", { class: "sheet-panel", role: "dialog", "aria-modal": "true", "aria-labelledby": titleId },
      h("div", { class: "sheet-head" }, h("h2", { id: titleId, text: title }), close),
      content)
  );
  sheet.hidden = false;
  document.body.classList.add("noscroll");
  return close;
}

export function closeSheet() {
  const sheet = $("#sheet");
  sheet.hidden = true;
  sheet.replaceChildren();
  document.body.classList.remove("noscroll");
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

document.addEventListener("keydown", (event) => {
  const sheet = $("#sheet");
  if (sheet.hidden) return;
  if (event.key === "Escape") {
    closeSheet();
    return;
  }
  if (event.key !== "Tab") return;
  const focusable = [...sheet.querySelectorAll("button, input, textarea, select, a[href]")].filter((el) => !el.disabled);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});
