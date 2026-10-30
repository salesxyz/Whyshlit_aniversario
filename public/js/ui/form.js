// Campos de formulário reutilizados na página pública e no painel.

import { h } from "../lib/dom.js";

export function field(label, id, control, hint, className) {
  return h("div", { class: "field" + (className ? " " + className : "") },
    h("label", { for: id, text: label }),
    control,
    hint ? h("p", { class: "hint", text: hint }) : null);
}

/** Campo de texto que avisa `onInput(valor)` a cada digitação. */
export function textInput(id, value, onInput, attrs) {
  const input = h("input", { id, type: "text", value: value || "", autocomplete: "off", ...(attrs || {}) });
  input.addEventListener("input", () => onInput(input.value));
  return input;
}
