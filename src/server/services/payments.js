"use strict";

const crypto = require("node:crypto");
const { HttpError, readJson } = require("../http");
const { CONTRIBUTION_ID, MAX_PRICE } = require("../validation");

const MIN_AMOUNT = 149.90;
const API_KEY_PATTERN = /^inchk_/;

/** Contribuições por cartão de crédito pelo checkout hospedado da InfinitePay. */
function createPaymentService({ config, store, supabase }) {
  function isEnabled() {
    return Boolean(config.supabase.enabled && API_KEY_PATTERN.test(config.infinitePay.apiKey));
  }

  async function createCheckout(req) {
    supabase.assertConfigured();
    if (!API_KEY_PATTERN.test(config.infinitePay.apiKey)) {
      throw new HttpError(503, "Configure INFINITEPAY_API_KEY com a chave do Checkout Integrado no servidor.");
    }

    const body = await readJson(req, 4096);
    if (!body || typeof body.giftId !== "string") throw new HttpError(400, "Presente inválido.");

    const state = await store.load();
    const contribution = body.giftId === CONTRIBUTION_ID;
    const gift = contribution ? null : state.gifts.find((item) => item.id === body.giftId);
    if (!contribution && !gift) throw new HttpError(404, "Esse presente não está mais na lista.");

    const fixedGiftAmount = Boolean(gift && gift.price > 0);
    const amount = fixedGiftAmount ? gift.price : Number(body.amount);
    if (!Number.isFinite(amount) || (!fixedGiftAmount && amount < MIN_AMOUNT) || amount <= 0 || amount > MAX_PRICE) {
      throw new HttpError(400, "Informe uma contribuição entre R$ 149,90 e R$ 999.999,99.");
    }

    const origin = new URL(req.headers.origin).origin;
    const name = (gift ? gift.name : "Contribuição para a lista").slice(0, 30);
    const payload = {
      items: [{
        quantity: 1,
        price: Math.round(amount * 100),
        description: name
      }],
      order_nsu: crypto.randomUUID(),
      redirect_url: origin + "/?pagamento=retorno",
      options: {
        single_payment: true,
        payment_methods_enabled: ["credit_card"]
      }
    };

    let response;
    try {
      response = await fetch(config.infinitePay.apiUrl + "/links", {
        method: "POST",
        headers: {
          "X-Api-Key": config.infinitePay.apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000)
      });
    } catch {
      throw new HttpError(502, "Não foi possível conectar à InfinitePay. Tente novamente.");
    }

    let result;
    try {
      result = await response.json();
    } catch {
      throw new HttpError(502, "A InfinitePay retornou uma resposta inválida.");
    }
    if (!result || typeof result !== "object" || Array.isArray(result)) {
      throw new HttpError(502, "A InfinitePay retornou uma resposta inválida.");
    }

    let checkoutUrl;
    try {
      checkoutUrl = new URL(typeof result.url === "string" ? result.url : "");
    } catch {
      checkoutUrl = null;
    }
    if (!response.ok || !checkoutUrl || checkoutUrl.protocol !== "https:" ||
        checkoutUrl.hostname !== "checkout.infinitepay.io") {
      console.error("Falha ao criar Checkout InfinitePay:", response.status);
      throw new HttpError(
        502,
        "Não foi possível iniciar o checkout InfinitePay.",
        "Não foi possível iniciar o pagamento. Confira a chave e a configuração do Checkout Integrado da InfinitePay."
      );
    }
    return { url: checkoutUrl.href };
  }

  return { isEnabled, createCheckout };
}

module.exports = { createPaymentService };
