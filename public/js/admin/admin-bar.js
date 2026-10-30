// Barra fixa do administrador: muda conforme o modo (ver, editar ou pré-visualizar).

import { $, h } from "../lib/dom.js";
import { icon } from "../lib/icons.js";
import { discardDraft, downloadConfig, logout, save, setMode, startEdit } from "../state/actions.js";
import { store } from "../state/store.js";

let discardArmed = false;
let discardTimer;

function armDiscard() {
  discardArmed = true;
  refreshAdminBar();
  clearTimeout(discardTimer);
  discardTimer = setTimeout(() => {
    discardArmed = false;
    refreshAdminBar();
  }, 4000);
}

function onDiscard() {
  if (store.dirty && !discardArmed) {
    armDiscard();
    return;
  }
  discardArmed = false;
  discardDraft();
}

function saveButton() {
  return h("button", { class: "btn primary", type: "button", onclick: save, disabled: store.saving },
    store.saving ? "Salvando…" : store.backend ? "Salvar e publicar" : "Salvar alterações");
}

function viewBar() {
  const message = store.backend
    ? "Você está na sessão de administrador."
    : "Painel local: suas alterações ficam salvas somente neste navegador.";
  return h("div", { class: "bar-in wrap" },
    h("p", { class: "bar-msg", text: message }),
    h("div", { class: "bar-btns" },
      !store.backend ? h("button", { class: "btn ghost", type: "button", onclick: downloadConfig }, "Baixar configuração") : null,
      store.backend ? h("button", { class: "btn ghost", type: "button", onclick: logout }, "Sair") : null,
      h("button", { class: "btn primary", type: "button", onclick: () => startEdit() }, icon("edit"), "Editar lista")));
}

function editBar() {
  const status = store.saving ? "Salvando…" : store.dirty ? "Alterações não salvas" : "Modo edição";
  return h("div", { class: "bar-in wrap" },
    h("p", { class: "bar-msg", role: "status", text: status }),
    h("div", { class: "bar-btns" },
      h("button", { class: "btn ghost", type: "button", onclick: () => setMode("preview") }, icon("eye"), "Ver como convidado"),
      h("button", { class: "btn ghost", type: "button", onclick: onDiscard }, discardArmed ? "Descartar mesmo?" : "Descartar"),
      saveButton()));
}

function previewBar() {
  return h("div", { class: "bar-in wrap" },
    h("p", { class: "bar-msg", role: "status", text: "Pré-visualização: é assim que os convidados vão ver a lista." }),
    h("div", { class: "bar-btns" },
      h("button", { class: "btn ghost", type: "button", onclick: () => setMode("edit") }, icon("edit"), "Voltar a editar"),
      saveButton()));
}

/** Redesenha só a barra (usado ao marcar alterações, sem perder o foco dos campos). */
export function refreshAdminBar() {
  const host = $("#admin-bar");
  if (!host) return;
  if (!store.admin) {
    host.replaceChildren();
    return;
  }
  const bar = store.mode === "edit" ? editBar() : store.mode === "preview" ? previewBar() : viewBar();
  host.replaceChildren(h("div", { class: "bar" + (store.mode === "view" ? "" : " editing") }, bar));
}
