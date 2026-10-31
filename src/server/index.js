"use strict";

const { HttpError, SECURITY_HEADERS, sendJson, isSameOrigin } = require("./http");
const { createAuth } = require("./auth");
const { createSupabase } = require("./supabase");
const { createStateStore } = require("./stores");
const { createImageService } = require("./services/images");
const { createPaymentService } = require("./services/payments");
const { createMessageService } = require("./services/messages");
const { createRoutes, findRoute, SAME_ORIGIN_MESSAGE } = require("./routes");
const defaultState = require("../../public/default-state.json");

/**
 * Monta a aplicação a partir de uma configuração e devolve o manipulador `(req, res)` da API.
 * Serve tanto o servidor local (`server.js`) quanto a função da Vercel (`api/[...path].js`).
 */
function createApi(config) {
  const auth = createAuth(config);
  const supabase = createSupabase(config);
  const store = createStateStore({ config, supabase, defaultState });
  const images = createImageService({ supabase });
  const payments = createPaymentService({ config, store, supabase });
  const messages = createMessageService({ store });
  const routes = createRoutes({ config, auth, store, images, payments, messages });

  async function dispatch(req, res) {
    const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));
    const found = findRoute(routes, req.method || "GET", url.pathname);
    if (!found) throw new HttpError(404, "Não encontrado.");

    const { route, params } = found;
    if (route.sameOrigin && !isSameOrigin(req)) throw new HttpError(403, SAME_ORIGIN_MESSAGE);
    if (route.admin) auth.requireAdmin(req, route.admin);

    const result = await route.handle({ req, res, url, params });
    if (result.redirect) {
      res.writeHead(302, {
        Location: result.redirect,
        "X-Content-Type-Options": SECURITY_HEADERS["X-Content-Type-Options"],
        ...(result.headers || {})
      });
      res.end();
      return;
    }
    sendJson(res, result.status || 200, result.body, result.headers);
  }

  return async function handler(req, res) {
    try {
      await dispatch(req, res);
    } catch (cause) {
      if (res.headersSent) {
        res.destroy(cause);
        return;
      }
      const status = cause.status || 500;
      if (status >= 500) console.error("Falha ao processar requisição:", cause);
      sendJson(res, status, {
        error: cause.publicMessage || (status >= 500 ? "Erro interno do servidor." : cause.message)
      }, cause.headers);
    }
  }
}

module.exports = { createApi };
