// Cabeçalho: nome, data, mensagem e contagem regressiva.

import { h } from "../lib/dom.js";
import { daysLeft, formatDate, parseDate } from "../lib/format.js";

export function hero(state) {
  const days = daysLeft(state.date);
  let caption = "";
  if (days !== null) caption = days === 0 ? "é dia de festa" : days === 1 ? "dia para o aniversário" : "dias para o aniversário";
  return h("header", { class: "hero" },
    h("div", { class: "hero-main" },
      h("p", { class: "eyebrow", text: "Whylist · lista de presentes" }),
      h("h1", null, " Dezoitou do ", h("span", { class: "who", text: state.honoree || "Aniversariante" })),
      state.date && parseDate(state.date) ? h("p", { class: "when", text: formatDate(state.date) }) : null,
      state.message ? h("p", { class: "msg", text: state.message }) : null),
    days !== null
      ? h("div", { class: "count" },
          h("strong", { class: "big", text: days === 0 ? "Hoje" : String(days) }),
          h("span", { text: caption }))
      : null);
}
