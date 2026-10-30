// Rodapé: aviso sobre pagamentos e acesso discreto à área do administrador.

import { store } from "../state/store.js";
import { h } from "../lib/dom.js";
import { openLogin } from "../admin/login.js";

export function footer() {
  const note = store.payments
    ? "Pagamentos Pix feitos pelo checkout Stripe são confirmados automaticamente. Pagamentos enviados diretamente à chave Pix não são detectados."
    : "O pagamento é feito direto no app do seu banco, para a chave Pix de quem faz aniversário. Esta página não confirma pagamentos.";
  const showLogin = store.backend && !store.admin && store.mode === "view";
  return h("footer", { class: "foot-row" },
    h("p", { class: "foot", text: note }),
    showLogin ? h("button", { class: "link-button", type: "button", onclick: openLogin }, "Área do administrador") : null);
}
