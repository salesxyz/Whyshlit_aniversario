"use strict";

const { HttpError, readJson } = require("../http");
const { CONTRIBUTION_ID, MAX_PRICE } = require("../validation");

const MIN_AMOUNT = 0.5;
const CHECKOUT_IMAGE = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lS8AAAAASUVORK5CYII=";

/** Contribuições por Pix ou cartão de crédito pelo checkout hospedado da Asaas. */
function createPaymentService({ config, store, supabase }) {
  function isEnabled() {
    return Boolean(config.supabase.enabled && config.asaas.apiKey);
  }

  async function createCheckout(req) {
    supabase.assertConfigured();
    if (!config.asaas.apiKey) {
      throw new HttpError(503, "Configure ASAAS_API_KEY no ambiente do servidor.");
    }
    const body = await readJson(req, 4096);
    if (!body || typeof body.giftId !== "string") throw new HttpError(400, "Presente inválido.");

    const state = await store.load();
    const contribution = body.giftId === CONTRIBUTION_ID;
    const gift = contribution ? null : state.gifts.find((item) => item.id === body.giftId);
    if (!contribution && !gift) throw new HttpError(404, "Esse presente não está mais na lista.");

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_PRICE) {
      throw new HttpError(400, "Informe uma contribuição entre R$ 0,50 e R$ 999.999,99.");
    }

    const origin = new URL(req.headers.origin).origin;
    const name = (gift ? gift.name : "Contribuição para a lista").slice(0, 30);
    let response;
    try {
      response = await fetch(config.asaas.apiUrl + "/checkouts", {
        method: "POST",
        headers: {
          access_token: config.asaas.apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          billingTypes: ["PIX", "CREDIT_CARD"],
          chargeTypes: ["DETACHED"],
          minutesToExpire: 60,
          callback: {
            successUrl: origin + "/?pagamento=retorno",
            cancelUrl: origin + "/?pagamento=cancelado",
            expiredUrl: origin + "/?pagamento=expirado"
          },
          items: [{
            name,
            description: (gift ? gift.note || gift.name : "Contribuição para a lista").slice(0, 150),
            imageBase64: CHECKOUT_IMAGE,
            quantity: 1,
            value: amount
          }]
        }),
        signal: AbortSignal.timeout(15000)
      });
    } catch {
      throw new HttpError(502, "Não foi possível conectar à Asaas. Tente novamente.");
    }

    let result;
    try {
      result = await response.json();
    } catch {
      throw new HttpError(502, "A Asaas retornou uma resposta inválida.");
    }
    if (!result || typeof result !== "object" || Array.isArray(result)) {
      throw new HttpError(502, "A Asaas retornou uma resposta inválida.");
    }

    const checkoutLink = typeof result.link === "string"
      ? result.link
      : typeof result.id === "string"
        ? config.asaas.checkoutUrl + encodeURIComponent(result.id)
        : "";
    if (!response.ok || !checkoutLink) {
      const errorCode = result.errors && result.errors[0] && result.errors[0].code;
      console.error("Falha ao criar Checkout Asaas:", response.status, errorCode || "resposta inválida");
      throw new HttpError(502, "Não foi possível iniciar o pagamento. Confira a chave e os métodos de pagamento na Asaas.");
    }
    return { url: checkoutLink };
  }

  return { isEnabled, createCheckout };
}

module.exports = { createPaymentService };
