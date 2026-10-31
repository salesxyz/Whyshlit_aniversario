// Estado da página: a lista salva, o rascunho em edição e as permissões da sessão.

const listeners = new Set();

export const store = {
  saved: null, // lista publicada (ou salva neste navegador)
  draft: null, // cópia em edição; só existe nos modos "edit" e "preview"
  mode: "view", // "view" (visitante/administrador), "edit" (editando) ou "preview" (visão do convidado)
  entryMode: "welcome", // "welcome", "visitor" ou "admin"
  dirty: false,
  saving: false,
  admin: false, // pode editar (sessão administrativa, ou site estático em que o dono é quem abre)
  backend: false, // há servidor com API
  payments: false, // checkout Stripe disponível
  canUploadImages: false
};

/** O que a página mostra agora: o rascunho durante a edição, senão a lista salva. */
export const current = () => (store.mode === "view" ? store.saved : store.draft);
export const isEditing = () => store.mode === "edit";
/** Dicas só para o administrador (exemplos, atalhos) aparecem fora da pré-visualização. */
export const showsAdminHints = () => store.admin && store.mode === "view";

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Pede para a página inteira ser redesenhada. */
export function notify() {
  for (const listener of listeners) listener();
}
