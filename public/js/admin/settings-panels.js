// Painéis de configuração: aniversário, Pix e site.

import { $, h } from "../lib/dom.js";
import { PIX_KEY_EXAMPLES, PIX_TYPES, THEMES } from "../config.js";
import { buildPix, pixConfig } from "../lib/pix.js";
import { qrSvg } from "../lib/qr.js";
import { markDirty } from "../state/actions.js";
import { field, textInput } from "../ui/form.js";
import { applySiteSettings } from "../ui/site.js";
import { pixImport } from "./pix-import.js";

/** Atualiza o texto de validação e o QR de teste ao lado do formulário Pix. */
function refreshPixStatus(draft) {
  const status = $("#pix-status");
  const box = $("#test-qr");
  const keyInput = $("#f-key");
  if (!status || !box || !keyInput) return;
  keyInput.placeholder = PIX_KEY_EXAMPLES[draft.pix.type] || "";
  box.replaceChildren();
  box.hidden = true;
  if (!String(draft.pix.key || "").trim()) {
    status.textContent = "Informe a chave Pix para gerar os QR codes.";
    status.className = "hint";
    return;
  }
  const config = pixConfig(draft.pix, draft.honoree);
  if (!config.ok) {
    status.textContent = config.msg;
    status.className = "hint err";
    return;
  }
  status.textContent = "Chave válida: " + config.key + ". Recebedor: " + config.name + ", " + config.city + ".";
  status.className = "hint ok";
  const svg = qrSvg(buildPix(config, 0));
  if (svg) {
    box.append(svg);
    box.hidden = false;
  }
}

function panel(title, open, ...children) {
  return h("details", { class: "panel", open }, h("summary", { text: title }), ...children);
}

function birthdayPanel(draft) {
  const message = h("textarea", { id: "f-message", class: "in", rows: 3, maxlength: 280 }, draft.message || "");
  message.addEventListener("input", () => {
    draft.message = message.value;
    markDirty();
  });
  const track = (key, after) => (value) => {
    draft[key] = value;
    markDirty();
    if (after) after();
  };
  return panel("Aniversário", true,
    h("div", { class: "form-grid" },
      field("Nome de quem faz aniversário", "f-honoree",
        textInput("f-honoree", draft.honoree, track("honoree", () => refreshPixStatus(draft)), { maxlength: 40 })),
      field("Data do aniversário", "f-date",
        textInput("f-date", draft.date, track("date"), { type: "date" }), "Usada para a contagem regressiva."),
      field("Mensagem para os convidados (opcional)", "f-message", message, null, "wide")));
}

function pixPanel(draft) {
  const pix = draft.pix;
  const update = (key) => (value) => {
    pix[key] = value;
    markDirty();
    refreshPixStatus(draft);
  };
  const type = h("select", { id: "f-type" },
    PIX_TYPES.map(([value, label]) => h("option", { value, selected: pix.type === value }, label)));
  type.addEventListener("change", () => {
    pix.type = type.value;
    markDirty();
    refreshPixStatus(draft);
  });
  return panel("Pix", true,
    h("div", { class: "form-grid" },
      field("Tipo de chave Pix", "f-type", type),
      field("Chave Pix", "f-key", textInput("f-key", pix.key, update("key"))),
      field("Nome do recebedor", "f-pname", textInput("f-pname", pix.name, update("name"), { maxlength: 25 }),
        "Como aparece no seu banco, até 25 letras. Se ficar vazio, usa o nome do aniversariante."),
      field("Cidade (opcional)", "f-city", textInput("f-city", pix.city, update("city"), { maxlength: 15 }), "Até 15 letras.")),
    pixImport(),
    h("div", { class: "pix-test" },
      h("div", { class: "qr small", id: "test-qr", hidden: true }),
      h("div", { class: "txt" },
        h("p", { class: "hint", id: "pix-status" }),
        h("p", { class: "hint", text: "Teste: escaneie com o app do seu banco. O nome do recebedor deve aparecer antes de você confirmar. Não precisa pagar." }))));
}

function sitePanel(draft) {
  const theme = h("select", { id: "f-theme" },
    THEMES.map(([value, label]) => h("option", { value, selected: (draft.theme || "system") === value }, label)));
  theme.addEventListener("change", () => {
    draft.theme = theme.value;
    applySiteSettings(draft);
    markDirty();
  });
  return panel("Site", false,
    h("div", { class: "form-grid" },
      field("Nome na aba do navegador", "f-site-title",
        textInput("f-site-title", draft.siteTitle || "Whylist", (value) => {
          draft.siteTitle = value;
          applySiteSettings(draft);
          markDirty();
        }, { maxlength: 60 }), "Exibido no título da aba."),
      field("Aparência", "f-theme", theme, "Escolha o tema do site.")));
}

export function settingsPanels(draft) {
  const stack = h("div", { class: "settings-stack" }, birthdayPanel(draft), pixPanel(draft), sitePanel(draft));
  queueMicrotask(() => refreshPixStatus(draft));
  return stack;
}
