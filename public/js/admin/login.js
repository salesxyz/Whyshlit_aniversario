// Janela de login do administrador (senha configurada no servidor).

import { api } from "../api/client.js";
import { h } from "../lib/dom.js";
import { field } from "../ui/form.js";
import { closeSheet, openSheet } from "../ui/sheet.js";
import { toast } from "../ui/toast.js";
import { notify, store } from "../state/store.js";

export function openLogin() {
  const password = h("input", { id: "admin-password", type: "password", autocomplete: "current-password", required: true });
  const message = h("p", { class: "hint err", role: "status" });
  const submit = h("button", { class: "btn primary", type: "submit" }, "Entrar");

  const form = h("form", {
    class: "admin-login",
    onsubmit: async (event) => {
      event.preventDefault();
      submit.disabled = true;
      submit.textContent = "Entrando…";
      message.textContent = "";
      try {
        await api.login(password.value);
        store.admin = true;
        closeSheet();
        notify();
        toast("Sessão administrativa iniciada.");
      } catch (error) {
        message.textContent = error.message || "Não foi possível conectar ao servidor.";
        submit.disabled = false;
        submit.textContent = "Entrar";
        password.select();
      }
    }
  },
    field("Senha de administrador", "admin-password", password),
    message,
    h("div", { class: "btn-row" }, submit));

  openSheet({
    title: "Acesso administrativo",
    titleId: "admin-login-title",
    content: h("div", { class: "sheet-body" },
      h("p", { class: "hint", text: "Entre com a senha configurada no servidor para editar a lista." }),
      form)
  });
  password.focus();
}
