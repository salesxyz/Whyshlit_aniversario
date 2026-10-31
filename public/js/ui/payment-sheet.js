// Janela de contribuição de um presente.

import { h } from "../lib/dom.js";
import { checkoutPanel } from "./checkout-panel.js";
import { pixPanel } from "./pix-panel.js";
import { openSheet } from "./sheet.js";

export function openPaymentSheet(gift, config, method = "pix") {
  const direct = method === "pix";
  const close = openSheet({
    title: gift.name,
    content: h("div", { class: "sheet-body" },
      gift.note ? h("p", { class: "note", text: gift.note }) : null,
      direct
        ? pixPanel(config, { amount: gift.price || 0, idPrefix: "sheet" })
        : checkoutPanel(gift),
      direct
        ? h("p", { class: "hint", text: "Pix direto para a chave cadastrada. A contribuição é opcional e não altera nem reserva este presente." })
        : null)
  });
  close.focus();
}
