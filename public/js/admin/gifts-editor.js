// Edição da lista de presentes: adicionar, editar, reordenar e remover.

import { $, h } from "../lib/dom.js";
import { icon } from "../lib/icons.js";
import { isValidPrice, newGiftId, parseBRL, priceToInput, safeUrl } from "../lib/format.js";
import { markDirty } from "../state/actions.js";
import { notify, store } from "../state/store.js";
import { field, textInput } from "../ui/form.js";
import { toast } from "../ui/toast.js";
import { imagePicker } from "./image-picker.js";

function imageField(idPrefix, getImage, setImage) {
  return h("div", { class: "field" },
    h("span", { class: "label", text: "Imagem (opcional)" }),
    imagePicker(idPrefix, getImage, setImage));
}

function move(id, offset) {
  const gifts = store.draft.gifts;
  const from = gifts.findIndex((gift) => gift.id === id);
  const to = from + offset;
  if (from < 0 || to < 0 || to >= gifts.length) return;
  [gifts[from], gifts[to]] = [gifts[to], gifts[from]];
  markDirty();
  notify();
  requestAnimationFrame(() => {
    const target = $("#" + (offset < 0 ? "up-" : "down-") + id);
    const fallback = $("#" + (offset < 0 ? "down-" : "up-") + id);
    const el = target && !target.disabled ? target : fallback;
    if (el) el.focus();
  });
}

function giftEditor(gift, index, total) {
  const id = gift.id;
  return h("article", { class: "gift" },
    field("Nome do presente", "n-" + id, textInput("n-" + id, gift.name, (v) => {
      gift.name = v;
      markDirty();
    }, { maxlength: 80 })),
    h("div", { class: "row2" },
      field("Valor (R$)", "p-" + id, textInput("p-" + id, priceToInput(gift.price), (v) => {
        gift._pt = v;
        markDirty();
      }, { inputmode: "decimal", placeholder: "Valor livre" })),
      field("Link (opcional)", "l-" + id, textInput("l-" + id, gift.link || "", (v) => {
        gift.link = v;
        markDirty();
      }, { inputmode: "url", placeholder: "https://" }))),
    field("Observação (opcional)", "o-" + id, textInput("o-" + id, gift.note || "", (v) => {
      gift.note = v;
      markDirty();
    }, { maxlength: 140 })),
    imageField("img-" + id, () => gift.img || null, (img) => {
      if (img) gift.img = img;
      else delete gift.img;
      markDirty();
    }),
    gift.ex ? h("span", { class: "pill warn", text: "Exemplo" }) : null,
    h("div", { class: "gift-actions" },
      h("div", { class: "move-group", role: "group", "aria-label": "Posição na lista" },
        h("button", {
          class: "btn ghost small icon-btn", type: "button", id: "up-" + id,
          "aria-label": "Mover para cima", disabled: index === 0, onclick: () => move(id, -1)
        }, icon("up")),
        h("button", {
          class: "btn ghost small icon-btn", type: "button", id: "down-" + id,
          "aria-label": "Mover para baixo", disabled: index === total - 1, onclick: () => move(id, 1)
        }, icon("down"))),
      h("button", {
        class: "btn ghost danger small",
        type: "button",
        onclick: () => {
          store.draft.gifts = store.draft.gifts.filter((item) => item.id !== id);
          markDirty();
          notify();
          toast("Presente removido. Salve para publicar.");
        }
      }, icon("trash"), "Remover")));
}

function addForm() {
  const name = h("input", { id: "add-name", type: "text", maxlength: 80, placeholder: "Ex.: Jogo de toalhas", autocomplete: "off" });
  const price = h("input", { id: "add-price", type: "text", inputmode: "decimal", placeholder: "Valor livre", autocomplete: "off" });
  const note = h("input", { id: "add-note", type: "text", maxlength: 140, placeholder: "Cor, tamanho, loja…", autocomplete: "off" });
  const link = h("input", { id: "add-link", type: "text", inputmode: "url", placeholder: "https://", autocomplete: "off" });
  const error = h("p", { class: "hint err", role: "status" });
  let pendingImage = null;

  function add() {
    const title = name.value.trim();
    if (!title) {
      error.textContent = "Dê um nome ao presente.";
      return name.focus();
    }
    const value = parseBRL(price.value);
    if (!isValidPrice(value)) {
      error.textContent = "Valor inválido. Use algo como 120,50.";
      return price.focus();
    }
    const url = safeUrl(link.value);
    if (url === null) {
      error.textContent = "Link inválido. Use um endereço http ou https.";
      return link.focus();
    }
    const gift = { id: newGiftId(), name: title, price: value || 0, note: note.value.trim(), link: url };
    if (pendingImage) gift.img = pendingImage;
    store.draft.gifts.unshift(gift);
    markDirty();
    notify();
    toast("Adicionado: " + title);
    requestAnimationFrame(() => $("#add-name") && $("#add-name").focus());
  }

  return h("form", { class: "add", novalidate: true, onsubmit: (event) => { event.preventDefault(); add(); } },
    h("h3", { text: "Adicionar presente" }),
    h("div", { class: "form-grid" },
      field("Nome do presente", "add-name", name, null, "wide"),
      field("Valor (R$)", "add-price", price, "Deixe em branco para valor livre."),
      field("Link (opcional)", "add-link", link),
      field("Observação (opcional)", "add-note", note, null, "wide"),
      h("div", { class: "wide" }, imageField("add-img", () => pendingImage, (img) => { pendingImage = img; }))),
    error,
    h("div", { class: "btn-row" }, h("button", { class: "btn primary", type: "submit" }, icon("plus"), "Adicionar à lista")));
}

function examplesBanner(count) {
  return h("div", { class: "banner" },
    h("span", { text: count + (count === 1 ? " presente de exemplo na lista." : " presentes de exemplo na lista.") }),
    h("button", {
      class: "btn ghost small",
      type: "button",
      onclick: () => {
        store.draft.gifts = store.draft.gifts.filter((gift) => !gift.ex);
        markDirty();
        notify();
        toast("Exemplos removidos. Salve para publicar.");
      }
    }, icon("trash"), "Remover exemplos"));
}

export function giftsEditor(draft) {
  const total = draft.gifts.length;
  const examples = draft.gifts.filter((gift) => gift.ex).length;
  return h("section", { "aria-labelledby": "gifts-h", id: "gifts-wrap" },
    h("div", { class: "sec-head" },
      h("div", null,
        h("h2", { id: "gifts-h", text: "Sugestões de presentes" }),
        h("p", { class: "hint", text: total + (total === 1 ? " presente" : " presentes") + " na lista. Use as setas para mudar a ordem." }))),
    addForm(),
    examples ? examplesBanner(examples) : null,
    total
      ? h("div", { class: "grid" }, draft.gifts.map((gift, index) => giftEditor(gift, index, total)))
      : h("div", { class: "empty", text: "Nenhum presente ainda. Use o formulário acima para adicionar o primeiro." }));
}
