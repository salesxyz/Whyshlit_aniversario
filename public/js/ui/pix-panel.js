// Painel de Pix direto: valor, QR code, copia e cola e botões de copiar.

import { BRL, parseBRL } from "../lib/format.js";
import { h } from "../lib/dom.js";
import { icon } from "../lib/icons.js";
import { buildPix } from "../lib/pix.js";
import { qrSvg } from "../lib/qr.js";
import { toast } from "./toast.js";
import { MAX_PRICE, MIN_PIX_AMOUNT } from "../config.js";

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
    placeholder: "Mínimo R$ 99,99",
    autocomplete: "off",
    value: options.amount ? String(Math.max(options.amount, MIN_PIX_AMOUNT)).replace(".", ",") : ""
  });
  const error = h("p", { class: "hint err", role: "status" });
  const qrBox = h("div", { class: "qr" });
  const summary = h("p", { class: "meta" });
  const code = h("textarea", { id: prefix + "-code", class: "code", readonly: true, rows: 4, "aria-label": "Pix copia e cola" });
  const copyCode = copyButton("Copiar código", () => code.value, code);

  function update() {
    const amount = parseBRL(amountInput.value);
    const invalid = amount === null || Number.isNaN(amount) || amount < MIN_PIX_AMOUNT || amount > MAX_PRICE;
    error.textContent = invalid ? "Informe um valor entre R$ 99,99 e R$ 999.999,99 para gerar o Pix." : "";
    copyCode.disabled = invalid;
    code.value = invalid ? "" : buildPix(config, amount);
    qrBox.replaceChildren(invalid
      ? h("p", { class: "hint", text: "Informe pelo menos R$ 99,99 para gerar o QR code." })
      : qrSvg(code.value) || h("p", { class: "hint", text: "QR code indisponível. Use o Pix copia e cola." }));
    summary.textContent = invalid ? "Valor mínimo: R$ 99,99." : "Valor: " + BRL.format(amount);
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
      h("div", { class: "btn-row" }, copyCode)));
}
