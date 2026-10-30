// Persistência no navegador, usada quando o site roda sem servidor.

import { LOCAL_STORAGE_KEY } from "../config.js";

/** Devolve a lista salva neste navegador, ou { error } se estiver corrompida, ou null se não houver. */
export function loadLocalState() {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw);
    if (!state || typeof state !== "object" || !state.pix || !Array.isArray(state.gifts)) {
      throw new Error("formato inválido");
    }
    return { state };
  } catch {
    return { error: "Não foi possível carregar as alterações salvas neste navegador." };
  }
}

export function saveLocalState(state) {
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch {
    throw new Error("Não foi possível salvar neste navegador. Verifique o espaço disponível e as permissões.");
  }
}

export function exportConfig(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "whylist-config.json";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
