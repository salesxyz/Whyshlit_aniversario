// Caixa de entrada privada das mensagens enviadas pelos convidados.

import { api } from "../api/client.js";
import { h } from "../lib/dom.js";
import { openSheet } from "../ui/sheet.js";

function messageCard(item) {
  const date = new Date(item.created_at);
  const timestamp = Number.isNaN(date.getTime()) ? "" : date.toLocaleString("pt-BR");
  return h("article", { class: "guest-message" },
    h("div", { class: "guest-message-head" },
      h("strong", { text: item.sender_name || "Convidado" }),
      h("time", { class: "hint", datetime: item.created_at, text: timestamp })),
    h("p", { class: "guest-message-text", text: item.message }));
}

export function openMessagesInbox() {
  const list = h("div", { class: "guest-message-list", "aria-live": "polite" },
    h("p", { class: "hint", text: "Carregando mensagens…" }));
  openSheet({
    title: "Mensagens dos convidados",
    content: h("div", { class: "sheet-body" },
      h("p", { class: "hint", text: "As mensagens são privadas e visíveis somente nesta área administrativa. Exibindo as 100 mais recentes." }),
      list)
  });

  api.messages().then((items) => {
    list.replaceChildren(...(items.length
      ? items.map(messageCard)
      : [h("p", { class: "hint", text: "Ainda não há mensagens." })]));
  }).catch((error) => {
    list.replaceChildren(h("p", { class: "hint err", role: "alert", text: error.message }));
  });
}
