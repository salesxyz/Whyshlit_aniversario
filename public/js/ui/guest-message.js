// Formulário para enviar uma mensagem privada ao aniversariante.

import { api } from "../api/client.js";
import { h } from "../lib/dom.js";
import { field } from "./form.js";

export function guestMessageSection() {
  const name = h("input", {
    id: "guest-message-name",
    type: "text",
    maxlength: 60,
    autocomplete: "name"
  });
  const message = h("textarea", {
    id: "guest-message-text",
    class: "in",
    rows: 4,
    maxlength: 1000,
    required: true
  });
  const status = h("p", { class: "hint", role: "status", "aria-live": "polite" });
  const submit = h("button", { class: "btn primary", type: "submit" }, "Enviar mensagem");
  const form = h("form", {
    class: "guest-message-form",
    onsubmit: async (event) => {
      event.preventDefault();
      submit.disabled = true;
      status.textContent = "Enviando…";
      status.className = "hint";
      try {
        await api.submitMessage(name.value, message.value);
        name.value = "";
        message.value = "";
        status.textContent = "Mensagem enviada. Obrigado pelo carinho!";
        status.className = "hint ok";
      } catch (error) {
        status.textContent = error.message || "Não foi possível enviar sua mensagem.";
        status.className = "hint err";
      } finally {
        submit.disabled = false;
      }
    }
  },
    field("Seu nome (opcional)", "guest-message-name", name),
    field("Sua mensagem", "guest-message-text", message),
    h("p", { class: "hint", text: "A mensagem será privada e ficará visível ao aniversariante." }),
    status,
    h("div", { class: "btn-row" }, submit));

  return h("section", { class: "guest-message-section", "aria-labelledby": "guest-message-title" },
    h("h2", { id: "guest-message-title", text: "Deixe uma mensagem para o aniversariante" }),
    h("p", { class: "sub", text: "Envie um recado especial junto com seus votos." }),
    form);
}
