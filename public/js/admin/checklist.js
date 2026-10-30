// "Primeiros passos": mostra ao administrador o que falta configurar antes de divulgar a lista.

import { startEdit } from "../state/actions.js";
import { h } from "../lib/dom.js";
import { icon } from "../lib/icons.js";
import { pixConfig } from "../lib/pix.js";

function steps(state) {
  const config = pixConfig(state.pix, state.honoree);
  const hasExamples = state.gifts.some((gift) => gift.ex);
  return [
    { done: Boolean(state.honoree && state.date), label: "Informar o nome e a data do aniversário", focus: "#f-honoree" },
    { done: config.ok, label: "Configurar a chave Pix", focus: "#f-key" },
    {
      done: state.gifts.length > 0 && !hasExamples,
      label: hasExamples ? "Trocar os presentes de exemplo pelos seus" : "Adicionar os primeiros presentes",
      focus: "#add-name"
    }
  ];
}

/** Devolve o cartão, ou null quando tudo já está pronto. */
export function checklist(state) {
  const list = steps(state);
  const remaining = list.filter((step) => !step.done).length;
  if (!remaining) return null;
  return h("section", { class: "checklist", "aria-labelledby": "checklist-h" },
    h("div", null,
      h("h2", { id: "checklist-h", text: "Primeiros passos" }),
      h("p", { class: "hint", text: remaining === 1 ? "Falta 1 passo para a lista ficar pronta." : "Faltam " + remaining + " passos para a lista ficar pronta." })),
    h("ol", { class: "steps" }, list.map((step) =>
      h("li", { class: step.done ? "done" : "" },
        h("span", { class: "step-mark", "aria-hidden": "true" }, icon(step.done ? "check" : "circle")),
        step.done
          ? h("span", { text: step.label })
          : h("button", { class: "link-button", type: "button", onclick: () => startEdit(step.focus) }, step.label),
        step.done ? h("span", { class: "sr-only", text: " (concluído)" }) : null))));
}
