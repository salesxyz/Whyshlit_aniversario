// Ações que mudam o estado: editar, pré-visualizar, descartar, salvar e sair.

import { api } from "../api/client.js";
import { $ } from "../lib/dom.js";
import { exportConfig, saveLocalState } from "./local-storage.js";
import { finalizeDraft } from "./finalize.js";
import { notify, store } from "./store.js";
import { refreshAdminBar } from "../admin/admin-bar.js";
import { toast } from "../ui/toast.js";

function focusLater(selector) {
  if (!selector) return;
  requestAnimationFrame(() => {
    const el = $(selector);
    if (el) {
      el.scrollIntoView({ block: "center" });
      el.focus();
    }
  });
}

/** Entra no modo de edição com uma cópia da lista. `focus` é um seletor para destacar um campo. */
export function startEdit(focus) {
  store.draft = structuredClone(store.saved);
  store.mode = "edit";
  store.dirty = false;
  notify();
  if (focus) focusLater(focus);
  else window.scrollTo(0, 0);
}

/** Alterna entre editar e ver como o convidado verá (sem perder o rascunho). */
export function setMode(mode, focus) {
  if (!store.draft) return;
  store.mode = mode;
  notify();
  if (focus) focusLater(focus);
  else window.scrollTo(0, 0);
}

/** Marca o rascunho como alterado sem redesenhar a página (mantém o foco nos campos). */
export function markDirty() {
  if (!store.dirty) {
    store.dirty = true;
    refreshAdminBar();
  }
}

export function discardDraft() {
  store.draft = null;
  store.mode = "view";
  store.dirty = false;
  notify();
}

export async function save() {
  if (store.saving || !store.draft) return;
  const result = finalizeDraft(store.draft);
  if (result.error) {
    toast(result.error);
    if (store.mode === "preview") setMode("edit", result.focus);
    else focusLater(result.focus);
    return;
  }

  store.saving = true;
  refreshAdminBar();
  try {
    if (store.backend) {
      store.saved = await api.saveState(result.data);
      toast("Lista salva e atualizada para todos.");
    } else {
      saveLocalState(result.data);
      store.saved = result.data;
      toast("Alterações salvas neste navegador.");
    }
    store.draft = null;
    store.mode = "view";
    store.dirty = false;
    store.saving = false;
    notify();
  } catch (error) {
    store.saving = false;
    refreshAdminBar();
    toast(error.message || "Não foi possível salvar. Tente de novo.");
  }
}

export async function logout() {
  try {
    await api.logout();
  } catch (error) {
    toast(error.message || "Não foi possível sair.");
    return;
  }
  store.admin = false;
  store.draft = null;
  store.mode = "view";
  store.entryMode = "visitor";
  store.dirty = false;
  notify();
  toast("Sessão administrativa encerrada.");
}

export function downloadConfig() {
  exportConfig(store.saved);
}
