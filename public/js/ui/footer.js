// Rodapé: aviso sobre pagamentos e acesso discreto à área do administrador.

import { notify, store } from "../state/store.js";
import { h } from "../lib/dom.js";
import { openLogin } from "../admin/login.js";

export function footer() {
  const note = store.payments
    ? "Pagamentos com cartão são processados pela InfinitePay. O Pix é enviado diretamente para a chave cadastrada e não é detectado pelo site."
    : "O pagamento é feito direto no app do seu banco, para a chave Pix de quem faz aniversário. Esta página não confirma pagamentos.";
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
