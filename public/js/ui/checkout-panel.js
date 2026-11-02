// Contribuição por cartão pelo checkout hospedado da InfinitePay.

import { api } from "../api/client.js";
import { CONTRIBUTION_ID, MAX_PRICE, MIN_CARD_CONTRIBUTION } from "../config.js";
import { h } from "../lib/dom.js";
import { parseBRL, priceToInput } from "../lib/format.js";
import { field } from "./form.js";

function infinitePayUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("A InfinitePay retornou um endereço de pagamento inválido.");
  }
  if (url.protocol !== "https:" || url.hostname !== "checkout.infinitepay.io") {
    throw new Error("O endereço de pagamento não pertence à InfinitePay.");
  }
  return url.href;
}

/** `gift` é o presente escolhido, ou null para a contribuição de valor livre. */
export function checkoutPanel(gift, enabled = true) {
  const fixedAmount = Boolean(gift && gift.price > 0);
  const amount = h("input", {
    id: "checkout-amount",
    type: "text",
    inputmode: "decimal",
    autocomplete: "off",
    placeholder: "Ex.: 149,90",
    disabled: !enabled,
    readonly: fixedAmount,
    value: fixedAmount ? priceToInput(gift.price) : ""
  });
  const message = h("p", {
    class: "hint",
    role: "status",
    text: enabled
      ? fixedAmount
        ? "O valor do presente foi definido pelo aniversariante e será cobrado exatamente assim."
        : "A lista é apenas uma sugestão: contribuir é opcional e não reserva nem altera o presente."
      : "Pagamento por cartão indisponível: a InfinitePay ainda não está conectada no servidor."
  });
  const button = h("button", {
    class: "btn primary",
    type: "button",
    disabled: !enabled,
    title: enabled ? null : "Conecte a InfinitePay no servidor para habilitar o pagamento."
  }, "Pagar com cartão de crédito");

  if (enabled) button.addEventListener("click", async () => {
    const value = parseBRL(amount.value);
    if (value === null || Number.isNaN(value) ||
        (!fixedAmount && value < MIN_CARD_CONTRIBUTION) || value > MAX_PRICE) {
      message.textContent = "Informe um valor entre R$ 149,90 e R$ 999.999,99.";
      message.className = "hint err";
      amount.focus();
      return;
    }
    button.disabled = true;
    button.textContent = "Abrindo checkout seguro…";
    message.textContent = "";
    try {
      const body = await api.checkout(gift ? gift.id : CONTRIBUTION_ID, value);
      window.location.assign(infinitePayUrl(body.url));
    } catch (error) {
      message.textContent = error.message || "Não foi possível conectar ao servidor.";
      message.className = "hint err";
      button.disabled = false;
      button.textContent = "Pagar com cartão de crédito";
    }
  });

  return h("div", { class: "pix-info" },
    field(fixedAmount ? "Valor do presente (R$)" : "Valor da contribuição (R$)", "checkout-amount", amount,
      fixedAmount ? "Valor definido pelo aniversariante." : "Valor mínimo R$ 149,90."),
    message,
    h("div", { class: "btn-row" }, button));
}
