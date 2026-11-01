// Seletor de imagem de um presente: foto enviada (quando há servidor com Supabase) ou ícone pronto.

import { api } from "../api/client.js";
import { h } from "../lib/dom.js";
import { GIFT_ICONS, giftIcon, icon } from "../lib/icons.js";
import { imageUrl, shrinkImage } from "../lib/images.js";
import { store } from "../state/store.js";

const PHOTO_ERRORS = { img: "Não foi possível ler essa imagem. Use JPG ou PNG." };

/** `getImage()` devolve a imagem atual; `setImage(img|null)` grava a escolha no rascunho. */
export function imagePicker(idPrefix, getImage, setImage) {
  const canUpload = store.canUploadImages;
  const start = getImage();
  let tab = canUpload && !(start && start.t === "icon") ? "photo" : "icon";
  const root = h("div", { class: "picker" });

  function photoPanel(current) {
    const message = h("p", { class: "hint", role: "status" });
    const input = h("input", { type: "file", accept: "image/*", id: idPrefix + "-file" });
    let uploading = false;

    async function upload(file) {
      if (!file) return;
      if (!/^image\//.test(file.type)) {
        message.textContent = "Escolha um arquivo de imagem.";
        message.className = "hint err";
        return;
      }
      if (uploading) return;
      uploading = true;
      message.textContent = "Enviando…";
      message.className = "hint";
      try {
        const { id } = await api.uploadImage(await shrinkImage(file));
        setImage({ t: "asset", id });
        draw();
      } catch (error) {
        message.textContent = PHOTO_ERRORS[error && error.message] || error.message || "Não foi possível enviar a imagem. Tente de novo.";
        message.className = "hint err";
      } finally {
        uploading = false;
        input.value = "";
      }
    }

    input.addEventListener("change", () => upload(input.files && input.files[0]));
    const hasPhoto = current && current.t === "asset";
    const dropZone = h("div", {
      class: "photo-dropzone",
      tabindex: "0",
      role: "group",
      "aria-label": "Área para escolher, colar ou arrastar uma foto",
      ondragover: (event) => {
        event.preventDefault();
        dropZone.classList.add("drag-over");
      },
      ondragleave: (event) => {
        if (!dropZone.contains(event.relatedTarget)) dropZone.classList.remove("drag-over");
      },
      ondrop: (event) => {
        event.preventDefault();
        dropZone.classList.remove("drag-over");
        upload(event.dataTransfer && event.dataTransfer.files[0]);
      },
      onpaste: (event) => {
        const items = Array.from(event.clipboardData && event.clipboardData.items || []);
        const image = items.find((item) => item.type.startsWith("image/"));
        if (!image) return;
        event.preventDefault();
        upload(image.getAsFile());
      }
    },
      h("div", { class: "pick-row" },
        hasPhoto ? h("img", { class: "thumb", src: imageUrl(current.id), alt: "Imagem atual" }) : null,
        h("label", { class: "btn ghost small" }, icon("plus"), hasPhoto ? "Trocar foto" : "Escolher foto", input)),
      h("p", { class: "hint", text: "Arraste e solte uma foto aqui. Para colar, clique nesta área e use Ctrl+V (ou Cmd+V)." }),
      h("p", { class: "hint", text: "A foto é reduzida antes do envio. Aceita JPG, PNG e WebP." }));
    return [dropZone, message];
  }

  function iconPanel(current) {
    return [h("div", { class: "icon-grid" }, Object.entries(GIFT_ICONS).map(([key, [label]]) =>
      h("button", {
        class: "icon-opt",
        type: "button",
        "aria-pressed": current && current.t === "icon" && current.k === key ? "true" : "false",
        onclick: () => {
          setImage({ t: "icon", k: key });
          draw();
        }
      }, giftIcon(key, 24), label)))];
  }

  function draw() {
    const current = getImage();
    const tabs = h("div", { class: "tabs", role: "tablist", "aria-label": "Opções de imagem" },
      [["photo", "Foto"], ["icon", "Ícones"]]
        .filter(([key]) => key !== "photo" || canUpload)
        .map(([key, label]) => h("button", {
          class: "tab",
          type: "button",
          role: "tab",
          id: idPrefix + "-tab-" + key,
          "aria-selected": tab === key ? "true" : "false",
          "aria-controls": idPrefix + "-panel",
          onclick: () => {
            tab = key;
            draw();
          }
        }, label)));
    const panel = h("div", { id: idPrefix + "-panel", role: "tabpanel", "aria-labelledby": idPrefix + "-tab-" + tab },
      tab === "photo" && canUpload ? photoPanel(current) : iconPanel(current));
    root.replaceChildren(
      tabs,
      panel,
      current
        ? h("div", { class: "btn-row" },
            h("button", {
              class: "btn ghost small danger",
              type: "button",
              onclick: () => {
                setImage(null);
                draw();
              }
            }, icon("trash"), "Sem imagem"))
        : null);
  }

  draw();
  return root;
}
