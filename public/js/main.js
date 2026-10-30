// Ponto de entrada: descobre o modo (servidor ou site estático), carrega a lista e desenha a página.

import { api, detectBackend } from "./api/client.js";
import { checklist } from "./admin/checklist.js";
import { giftsEditor } from "./admin/gifts-editor.js";
import { refreshAdminBar } from "./admin/admin-bar.js";
import { settingsPanels } from "./admin/settings-panels.js";
import { $ } from "./lib/dom.js";
import { pixConfig } from "./lib/pix.js";
import { save } from "./state/actions.js";
import { loadLocalState } from "./state/local-storage.js";
import { current, isEditing, notify, store, subscribe } from "./state/store.js";
import { footer } from "./ui/footer.js";
import { giftsSection } from "./ui/gift-card.js";
import { hero } from "./ui/hero.js";
import { pixSection } from "./ui/pix-section.js";
import { applySiteSettings } from "./ui/site.js";
import { toast } from "./ui/toast.js";
import { welcome } from "./ui/welcome.js";
import { openLogin } from "./admin/login.js";

function render() {
  const state = current();
  applySiteSettings(state);
  if (store.entryMode === "welcome") {
    $("#admin-bar").replaceChildren();
    $("#app").replaceChildren(welcome(state, {
      onVisitor: () => {
        store.admin = false;
        store.entryMode = "visitor";
        notify();
      },
      onAdmin: () => {
        if (store.backend && !store.admin) {
          openLogin();
          return;
        }
        store.admin = true;
        store.entryMode = "admin";
        notify();
      }
    }));
    return;
  }
  const config = pixConfig(state.pix, state.honoree);
  refreshAdminBar();

  const parts = [hero(state)];
  if (isEditing()) {
    parts.push(settingsPanels(state), giftsEditor(state));
  } else {
    if (store.admin && store.mode === "view") parts.push(checklist(state));
    parts.push(pixSection(state, config), giftsSection(state, config));
  }
  parts.push(footer());
  $("#app").replaceChildren(...parts.filter(Boolean));
}

function handleCheckoutReturn() {
  const params = new URLSearchParams(location.search);
  const result = params.get("pagamento");
  if (!result) return;
  history.replaceState(null, "", location.pathname + location.hash);
  if (result === "cancelado") toast("Checkout fechado. As sugestões continuam disponíveis.");
  else if (result === "expirado") toast("O checkout expirou. As sugestões continuam disponíveis.");
  else if (result === "retorno") toast("Você voltou do checkout. A confirmação do pagamento é feita pela Asaas.");
  else toast("Retorno do checkout não reconhecido.");
}

/** Atalhos e proteção contra perder alterações. */
function setupGuards() {
  window.addEventListener("beforeunload", (event) => {
    if (store.dirty) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s" && store.draft) {
      event.preventDefault();
      save();
    }
  });
}

async function loadInitialState() {
  const detection = await detectBackend();
  let notice = detection.error || "";

  if (detection.backend) {
    const status = detection.status;
    store.backend = true;
    if (status && status.configured) {
      store.admin = Boolean(status.admin);
      store.payments = Boolean(status.payments);
      store.canUploadImages = status.storage === "supabase";
      try {
        store.saved = await api.state();
        return { notice };
      } catch {
        notice = "Não foi possível carregar os dados do servidor.";
        store.admin = false;
      }
    } else if (status) {
      notice = "Backend sem configuração necessária.";
    }
    store.saved = await api.defaultState();
    return { notice };
  }

  // Site estático: o dono edita a própria cópia, guardada neste navegador.
  store.admin = true;
  store.saved = await api.defaultState();
  const local = loadLocalState();
  if (local && local.state) store.saved = local.state;
  else if (local && local.error) notice = local.error;
  return { notice };
}

async function boot() {
  subscribe(render);
  setupGuards();
  let notice = "";
  try {
    ({ notice } = await loadInitialState());
  } catch {
    notice = "Não foi possível carregar a lista. Recarregue a página.";
  }
  if (!store.saved) {
    $("#app").textContent = notice;
    return;
  }
  notify();
  handleCheckoutReturn();
  if (notice) toast(notice);
}

boot();
