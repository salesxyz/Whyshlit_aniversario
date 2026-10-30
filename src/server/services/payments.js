"use strict";

const crypto = require("node:crypto");
const { HttpError, readJson } = require("../http");
const { CONTRIBUTION_ID, MAX_PRICE } = require("../validation");

const MIN_AMOUNT = 0.5;

/** Contribuições por Pix pelo checkout hospedado da Stripe. */
function createPaymentService({ config, store, supabase }) {
  function isEnabled() {
    return Boolean(config.supabase.enabled && config.stripeSecretKey);
  }

  async function createCheckout(req) {
    supabase.assertConfigured();
    if (!config.stripeSecretKey) {
      throw new HttpError(503, "Configure STRIPE_SECRET_KEY no ambiente do servidor.");
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
    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.append("payment_method_types[]", "pix");
    params.set("line_items[0][price_data][currency]", "brl");
    params.set("line_items[0][price_data][unit_amount]", String(Math.round(amount * 100)));
    params.set("line_items[0][price_data][product_data][name]",
      (gift ? gift.name : "Contribuição para a lista").slice(0, 120));
    params.set("line_items[0][quantity]", "1");
    params.set("payment_method_options[pix][expires_after_seconds]", "3600");
    params.set("success_url", origin + "/?pagamento=confirmado");
    params.set("cancel_url", origin + "/?pagamento=cancelado");

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + config.stripeSecretKey,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": crypto.randomUUID()
      },
      body: params,
      signal: AbortSignal.timeout(15000)
    });
    const result = await response.json();
    if (!response.ok || typeof result.url !== "string") {
      console.error("Falha ao criar Checkout Stripe:", response.status, result.error && result.error.type);
      throw new HttpError(502, "Não foi possível iniciar o pagamento Pix. Confira se Pix está ativado na conta Stripe.");
    }
    return { url: result.url };
  }

  return { isEnabled, createCheckout };
}

module.exports = { createPaymentService };
