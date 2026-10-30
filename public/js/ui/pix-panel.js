// Painel de Pix direto: valor, QR code, copia e cola e botões de copiar.

import { BRL, parseBRL } from "../lib/format.js";
import { h } from "../lib/dom.js";
import { icon } from "../lib/icons.js";
import { buildPix } from "../lib/pix.js";
import { qrSvg } from "../lib/qr.js";
import { toast } from "./toast.js";
import { MAX_PRICE } from "../config.js";

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = h("textarea", { readonly: true, "aria-hidden": "true" });
    area.style.cssText = "position:fixed;opacity:0;top:0;left:0";
    area.value = text;
    document.body.append(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}

export function copyButton(label, getText, fallbackTarget) {
  return h("button", {
    class: "btn ghost small",
    type: "button",
    onclick: async () => {
      if (await copyText(getText())) {
        toast("Copiado");
      } else {
        toast("Não foi possível copiar. Selecione o texto e copie.");
        if (fallbackTarget) fallbackTarget.select();
      }
    }
  }, icon("copy"), label);
}

/** `options`: { amount, idPrefix } — valor inicial e prefixo dos ids. */
export function pixPanel(config, options) {
  const prefix = options.idPrefix;
  const amountInput = h("input", {
    id: prefix + "-amount",
    type: "text",
    inputmode: "decimal",
    placeholder: "Digite o valor que preferir",
    autocomplete: "off",
    value: options.amount ? String(options.amount).replace(".", ",") : ""
  });
  const error = h("p", { class: "hint err", role: "status" });
  const qrBox = h("div", { class: "qr" });
  const summary = h("p", { class: "meta" });
  const code = h("textarea", { id: prefix + "-code", class: "code", readonly: true, rows: 4, "aria-label": "Pix copia e cola" });

  function update() {
    const amount = parseBRL(amountInput.value);
    const invalid = amount !== null && (Number.isNaN(amount) || amount <= 0 || amount > MAX_PRICE);
    error.textContent = invalid ? "Digite um valor entre R$ 0,01 e R$ 999.999,99." : "";
    const value = amount !== null && !invalid ? amount : 0;
    const payload = buildPix(config, value);
    code.value = payload;
    qrBox.replaceChildren(qrSvg(payload) || h("p", { class: "hint", text: "QR code indisponível. Use o Pix copia e cola." }));
    summary.textContent = value ? "Valor: " + BRL.format(value) : "Valor livre: quem paga escolhe no app do banco.";
  }

  amountInput.addEventListener("input", update);
  code.addEventListener("focus", () => code.select());
  update();

  return h("div", { class: "pix-panel" },
    qrBox,
    h("div", { class: "pix-info" },
      h("div", { class: "field" }, h("label", { for: prefix + "-amount", text: "Quanto você quer contribuir? (R$)" }), amountInput),
      error,
      summary,
      h("p", { class: "meta" }, "Recebedor: ", h("b", { text: config.name })),
      h("label", { class: "label", for: prefix + "-code", text: "Pix copia e cola" }),
      code,
      h("div", { class: "btn-row" },
        copyButton("Copiar código", () => code.value, code),
        copyButton("Copiar chave", () => config.key))));
}
