// Janela de contribuição de um presente.

import { store } from "../state/store.js";
import { h } from "../lib/dom.js";
import { checkoutPanel } from "./checkout-panel.js";
import { pixPanel } from "./pix-panel.js";
import { openSheet } from "./sheet.js";

export function openPaymentSheet(gift, config) {
  const direct = !store.payments;
  const close = openSheet({
    title: gift.name,
    content: h("div", { class: "sheet-body" },
      gift.note ? h("p", { class: "note", text: gift.note }) : null,
      direct ? pixPanel(config, { amount: gift.price || 0, idPrefix: "sheet" }) : checkoutPanel(gift),
      direct
        ? h("p", { class: "hint", text: "A lista é apenas uma sugestão. Se fizer um Pix, a contribuição é opcional e não altera nem reserva este presente." })
        : null)
  });
  close.focus();
}
