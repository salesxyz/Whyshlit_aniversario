// Cartão de Pix da página: contribuição de valor livre ou instrução de configuração para o administrador.

import { startEdit } from "../state/actions.js";
import { showsAdminHints, store } from "../state/store.js";
import { h } from "../lib/dom.js";
import { checkoutPanel } from "./checkout-panel.js";
import { pixPanel } from "./pix-panel.js";

export function pixSection(state, config) {
  const section = h("section", { class: "pix-card", "aria-labelledby": "pix-h" });
  const hasKey = Boolean(state.pix && String(state.pix.key || "").trim());

  if (config.ok) {
    section.append(
      h("h2", { id: "pix-h", text: "Pix direto" }),
      h("p", { class: "sub", text: "Escolha um valor a partir de R$ 99,99." }),
      pixPanel(config, { amount: 0, idPrefix: "free" }));
  } else if (!hasKey && showsAdminHints()) {
    section.append(
      h("h2", { id: "pix-h", text: "Configure o Pix para receber" }),
      h("p", { class: "sub", text: "Informe sua chave Pix e o nome que aparece no seu banco. A página gera o QR code e o Pix copia e cola de cada presente." }),
      h("div", { class: "btn-row" },
        h("button", { class: "btn pix", type: "button", onclick: () => startEdit("#f-key") }, "Configurar Pix")));
  } else {
    section.append(
      h("h2", { id: "pix-h", text: "Pix" }),
      h("p", { class: "sub", text: hasKey ? config.msg : "O Pix desta lista ainda não foi configurado. Volte em breve." }));
  }
  section.append(
    h("h2", { id: "card-h", text: "Pagar com cartão de crédito" }),
    checkoutPanel(null, store.payments));
  return section;
}
