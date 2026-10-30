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
      h("h2", { id: "pix-h", text: "Prefere enviar um valor livre?" }),
      h("p", {
        class: "sub",
        text: store.payments
          ? "Contribua com qualquer valor a partir de R$ 0,50 pelo checkout Pix seguro da Stripe."
          : "Pix direto para " + config.name + ". Escolha o valor, escaneie o QR code ou copie o código."
      }),
      store.payments ? checkoutPanel(null) : pixPanel(config, { amount: 0, idPrefix: "free", chips: [20, 50, 100] }));
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
  return section;
}
