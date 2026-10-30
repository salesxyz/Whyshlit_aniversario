// Aviso rápido no rodapé da tela.

import { $ } from "../lib/dom.js";

let timer;

export function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(timer);
  timer = setTimeout(() => el.classList.remove("show"), 2800);
}
