// Tela inicial para escolher entre a visualização de visitante e a área administrativa.

import { h } from "../lib/dom.js";
import { icon } from "../lib/icons.js";

export function welcome(state, { onVisitor, onAdmin }) {
  const honoree = String(state.honoree || "").trim();
  return h("section", { class: "welcome", "aria-labelledby": "welcome-title" },
    h("div", { class: "welcome-card" },
      h("p", { class: "eyebrow", text: "1.8 do Victor - Momento de celebração e lembrança" }),
      h("h1", { id: "welcome-title", text: "Bem-vindo a lista de sugestões do Victor" }),
      h("p", { class: "welcome-intro", text: honoree
        ? "A lista de " + honoree + " está pronta. Escolha como deseja continuar."
        : "Escolha como deseja acessar a lista." }),
      h("div", { class: "welcome-options" },
        h("article", { class: "welcome-option" },
          h("div", { class: "welcome-icon visitor-icon", "aria-hidden": "true" }, icon("eye")),
          h("h2", { text: "Sou patrocinador" }),
          h("p", { class: "hint", text: "Veja as sugestões de presentes e escolha como participar da comemoração." }),
          h("button", { class: "btn pix", type: "button", onclick: onVisitor }, "Entrar como patrocinador")),
        h("article", { class: "welcome-option" },
          h("div", { class: "welcome-icon admin-icon", "aria-hidden": "true" }, icon("edit")),
          h("h2", { text: "Sou aniversariante" }),
          h("p", { class: "hint", text: "Acesse as configurações para editar e publicar sua lista." }),
          h("button", { class: "btn primary", type: "button", onclick: onAdmin }, "Entrar como aniversariante")))));
}
