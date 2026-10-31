"use strict";

const { HttpError, readJson } = require("../http");
const { CONTRIBUTION_ID, MAX_PRICE } = require("../validation");

const MIN_AMOUNT = 50;
const SECRET_KEY_PATTERN = /^sk_(test|live)_/;

/** Contribuições por cartão de crédito pelo checkout hospedado do Stripe. */
function createPaymentService({ config, store, supabase }) {
  function isEnabled() {
    return Boolean(config.supabase.enabled && SECRET_KEY_PATTERN.test(config.stripe.secretKey));
  }

  async function createCheckout(req) {
    supabase.assertConfigured();
    if (!SECRET_KEY_PATTERN.test(config.stripe.secretKey)) {
      throw new HttpError(503, "Configure STRIPE_SECRET_KEY com uma chave secreta sk_test_ ou sk_live_ no ambiente do servidor.");
    }
    const body = await readJson(req, 4096);
    if (!body || typeof body.giftId !== "string") throw new HttpError(400, "Presente inválido.");

    const state = await store.load();
    const contribution = body.giftId === CONTRIBUTION_ID;
    const gift = contribution ? null : state.gifts.find((item) => item.id === body.giftId);
    if (!contribution && !gift) throw new HttpError(404, "Esse presente não está mais na lista.");

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_PRICE) {
      throw new HttpError(400, "Informe uma contribuição entre R$ 50,00 e R$ 999.999,99.");
    }

    const origin = new URL(req.headers.origin).origin;
    const name = (gift ? gift.name : "Contribuição para a lista").slice(0, 30);
    const description = (gift ? gift.note || gift.name : "Contribuição para a lista").slice(0, 150);
    const payload = new URLSearchParams({
      mode: "payment",
      success_url: origin + "/?pagamento=retorno",
      cancel_url: origin + "/?pagamento=cancelado",
      "excluded_payment_method_types[0]": "pix",
      "line_items[0][price_data][currency]": "brl",
      "line_items[0][price_data][unit_amount]": String(Math.round(amount * 100)),
      "line_items[0][price_data][product_data][name]": name,
      "line_items[0][price_data][product_data][description]": description,
      "line_items[0][quantity]": "1",
      client_reference_id: body.giftId
    });
    let response;
    try {
      response = await fetch(config.stripe.apiUrl + "/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + config.stripe.secretKey,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: payload.toString(),
        signal: AbortSignal.timeout(15000)
      });
    } catch {
      throw new HttpError(502, "Não foi possível conectar ao Stripe. Tente novamente.");
    }

    let result;
    try {
      result = await response.json();
    } catch {
      throw new HttpError(502, "O Stripe retornou uma resposta inválida.");
    }
    if (!result || typeof result !== "object" || Array.isArray(result)) {
      throw new HttpError(502, "O Stripe retornou uma resposta inválida.");
    }

    const checkoutLink = typeof result.url === "string" ? result.url : "";
    if (!response.ok || !checkoutLink) {
      const error = result.error && typeof result.error === "object" ? result.error : {};
      console.error(
        "Falha ao criar Checkout Stripe:",
        response.status,
        error.type || "erro desconhecido",
        error.code || "",
        error.param || "",
        response.headers.get("request-id") || ""
      );
      throw new HttpError(
        502,
        "Não foi possível iniciar o checkout Stripe.",
        "Não foi possível iniciar o pagamento. Confira se cartão está ativo nas configurações de métodos de pagamento do Stripe."
      );
    }
    return { url: checkoutLink };
  }

  return { isEnabled, createCheckout };
}

module.exports = { createPaymentService };
