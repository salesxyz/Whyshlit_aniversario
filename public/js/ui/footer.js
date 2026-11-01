// Rodapé: aviso sobre pagamentos e acesso discreto à área do administrador.

import { notify, store } from "../state/store.js";
import { h } from "../lib/dom.js";
import { openLogin } from "../admin/login.js";

export function footer() {
  const note = store.payments 
  const showLogin = store.backend && !store.admin && store.mode === "view";
  return h("footer", { class: "foot-row" },
    h("p", { class: "foot", text: note }),
    store.entryMode === "visitor"
      ? h("button", { class: "link-button", type: "button", onclick: () => {
          store.entryMode = "welcome";
          notify();
        } }, "Voltar à página inicial")
      : null,
    showLogin ? h("button", { class: "link-button", type: "button", onclick: openLogin }, "Área do administrador") : null);
}
