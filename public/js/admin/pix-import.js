// Importa a chave Pix a partir de um print do QR code ou de um Pix copia e cola.

import { h } from "../lib/dom.js";
import { icon } from "../lib/icons.js";
import { readPix } from "../lib/pix.js";
import { decodeQr } from "../lib/qr.js";
import { markDirty } from "../state/actions.js";
import { notify, store } from "../state/store.js";
import { field } from "../ui/form.js";
import { toast } from "../ui/toast.js";

const READ_ERRORS = {
  lib: "O leitor de QR code não carregou. Cole o Pix copia e cola abaixo.",
  noqr: "Não encontrei um QR code nessa imagem. Use um print só do QR code, inteiro e sem reflexo.",
  img: "Não foi possível ler essa imagem. Use JPG ou PNG."
};

export function pixImport() {
  const message = h("p", { class: "hint", role: "status" });
  const fileInput = h("input", { type: "file", accept: "image/*", id: "imp-file" });
  const codeInput = h("textarea", {
    id: "imp-text",
    class: "in",
    rows: 2,
    placeholder: "00020126…",
    autocomplete: "off",
    spellcheck: "false"
  });

  function showError(text) {
    message.textContent = text;
    message.className = "hint err";
  }

  function apply(text) {
    const result = readPix(text);
    if (!result.ok) return showError(result.msg);
    const pix = store.draft.pix;
    pix.type = result.type;
    pix.key = result.key;
    if (result.name) pix.name = result.name;
    if (result.city) pix.city = result.city;
    markDirty();
    notify();
    toast("Chave importada. Confira os dados e teste o QR code.");
  }

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    message.textContent = "Lendo o QR code…";
    message.className = "hint";
    try {
      apply(await decodeQr(file));
    } catch (error) {
      showError(READ_ERRORS[error && error.message] || READ_ERRORS.img);
    }
  });

  return h("div", { class: "import" },
    h("h3", { text: "Importar a chave de um QR code" }),
    h("p", { class: "hint", text: "No app do seu banco, abra o QR code da sua chave Pix e tire um print. Envie a imagem aqui ou cole o Pix copia e cola. A página lê a chave, o nome e a cidade e preenche os campos." }),
    h("div", { class: "pick-row" }, h("label", { class: "btn ghost small" }, icon("plus"), "Enviar print do QR code", fileInput)),
    field("Ou cole o Pix copia e cola", "imp-text", codeInput),
    h("div", { class: "btn-row" },
      h("button", {
        class: "btn ghost small",
        type: "button",
        onclick: () => {
          if (!codeInput.value.trim()) {
            showError("Cole o código primeiro.");
            codeInput.focus();
            return;
          }
          apply(codeInput.value);
        }
      }, "Ler código")),
    message);
}
