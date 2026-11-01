// Cartão de um presente na página pública.

import { showsAdminHints, store } from "../state/store.js";
import { h } from "../lib/dom.js";
import { BRL, safeUrl } from "../lib/format.js";
import { giftIcon, icon } from "../lib/icons.js";
import { imageOf, imageUrl } from "../lib/images.js";
import { openPaymentSheet } from "./payment-sheet.js";

export function giftMedia(gift) {
  const image = imageOf(gift);
  if (!image) return null;
  if (image.t === "asset") return h("img", { class: "media", src: imageUrl(image.id), alt: gift.name, loading: "lazy" });
  return h("div", { class: "media-icon", "aria-hidden": "true" }, giftIcon(image.k, 48));
}

export function giftCard(gift, config) {
  const href = safeUrl(gift.link);
  const actions = h("div", { class: "gift-actions" });
  if (config.ok) {
    actions.append(h("button", {
      class: "btn pix",
      type: "button",
      onclick: () => openPaymentSheet(gift, config, "pix")
    }, "Contribuir com Pix"));
  }
  actions.append(h("button", {
    class: "btn primary",
    type: "button",
    disabled: !store.payments,
    title: store.payments ? null : "Conecte a Stripe no servidor para habilitar o pagamento.",
    onclick: store.payments ? () => openPaymentSheet(gift, config, "card") : null
  }, "Pagar com cartão"));
  if (!config.ok) {
    actions.append(h("span", { class: "pill muted", text: "Pix ainda não configurado" }));
  }
  if (href) {
    actions.append(h("a", { class: "link", href, target: "_blank", rel: "noopener noreferrer" }, "Ver produto", icon("ext")));
  }
  return h("article", { class: "gift" },
    giftMedia(gift),
    h("div", { class: "gift-top" },
      h("h3", { text: gift.name }),
      h("span", { class: "price", text: gift.price > 0 ? BRL.format(gift.price) : "Valor livre" })),
    gift.note ? h("p", { class: "note", text: gift.note }) : null,
    showsAdminHints() && gift.ex ? h("span", { class: "pill warn", text: "Exemplo" }) : null,
    actions);
}

export function giftsSection(state, config) {
  const section = h("section", { "aria-labelledby": "gifts-h", id: "gifts-wrap" },
    h("div", { class: "sec-head" },
      h("div", null,
        h("h2", { id: "gifts-h", text: "Sugestões de presentes" }),
        h("p", { class: "hint", text: "Ideias para quem quiser presentear — sem reserva ou obrigação." }))));
  section.append(state.gifts.length
    ? h("div", { class: "grid" }, state.gifts.map((gift) => giftCard(gift, config)))
    : h("div", { class: "empty", text: "A lista ainda está vazia. Volte em breve." }));
  return section;
}
