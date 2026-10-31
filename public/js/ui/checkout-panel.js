// Contribuição por cartão pelo checkout hospedado do Stripe.

import { api } from "../api/client.js";
import { CONTRIBUTION_ID, MAX_PRICE, MIN_CONTRIBUTION } from "../config.js";
import { h } from "../lib/dom.js";
import { parseBRL, priceToInput } from "../lib/format.js";
import { field } from "./form.js";

function stripeUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("O Stripe retornou um endereço de pagamento inválido.");
  }
  if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com") {
    throw new Error("O endereço de pagamento não pertence ao Stripe.");
  }
  return url.href;
}

/** `gift` é o presente escolhido, ou null para a contribuição de valor livre. */
export function checkoutPanel(gift) {
  const suggested = Boolean(gift && gift.price > 0);
  const amount = h("input", {
    id: "checkout-amount",
    type: "text",
    inputmode: "decimal",
    autocomplete: "off",
    placeholder: "Ex.: 50,00",
    value: gift ? priceToInput(gift.price) : ""
  });
  const message = h("p", {
    class: "hint",
    role: "status",
    text: "A lista é apenas uma sugestão: contribuir é opcional e não reserva nem altera o presente."
  });
  const button = h("button", { class: "btn primary", type: "button" }, "Pagar com cartão de crédito");

  button.addEventListener("click", async () => {
    const value = parseBRL(amount.value);
    if (value === null || Number.isNaN(value) || value < MIN_CONTRIBUTION || value > MAX_PRICE) {
      message.textContent = "Informe um valor entre R$ 50,00 e R$ 999.999,99.";
      message.className = "hint err";
      amount.focus();
      return;
    }
    button.disabled = true;
    button.textContent = "Abrindo checkout seguro…";
    message.textContent = "";
    try {
      const body = await api.checkout(gift ? gift.id : CONTRIBUTION_ID, value);
      window.location.assign(stripeUrl(body.url));
    } catch (error) {
      message.textContent = error.message || "Não foi possível conectar ao servidor.";
      message.className = "hint err";
      button.disabled = false;
      button.textContent = "Pagar com cartão de crédito";
    }
  });

  return h("div", { class: "pix-info" },
    field(gift ? "Contribuição sugerida (R$)" : "Valor da contribuição (R$)", "checkout-amount", amount,
      suggested ? "Sugestão, se quiser você pode alterar. Mínimo R$ 50,00." : "Valor mínimo R$ 50,00."),
    message,
    h("div", { class: "btn-row" }, button));
}
