"use strict";

const { HttpError, readJson } = require("./http");
const { validateState, IMAGE_ID } = require("./validation");

const SAME_ORIGIN_MESSAGE = "Origem da requisição inválida.";

/**
 * Tabela de rotas da API. Cada rota declara o que exige (`sameOrigin`, `admin`) e devolve
 * `{ status, body, headers }` ou `{ redirect }`; quem monta a resposta HTTP é `index.js`.
 */
function createRoutes({ config, auth, store, images, payments, messages }) {
  const apiReady = () => auth.isPasswordConfigured() && (config.supabase.enabled || !config.isVercel);

  return [
    {
      method: "GET",
      path: "/api/status",
      handle: (ctx) => ({
        body: {
          backend: true,
          configured: apiReady(),
          admin: apiReady() && auth.isAdmin(ctx.req),
          storage: store.kind,
          payments: payments.isEnabled()
        }
      })
    },
    {
      method: "GET",
      path: "/api/state",
      handle: async () => ({ body: await store.load() })
    },
    {
      method: "POST",
      path: "/api/admin/login",
      sameOrigin: true,
      handle: async (ctx) => {
        const setCookie = await auth.login(ctx.req);
        return { body: { admin: true }, headers: { "Set-Cookie": setCookie } };
      }
    },
    {
      method: "POST",
      path: "/api/admin/logout",
      sameOrigin: true,
      handle: () => ({ body: { admin: false }, headers: { "Set-Cookie": auth.logoutCookie() } })
    },
    {
      method: "PUT",
      path: "/api/admin/state",
      sameOrigin: true,
      admin: "Entre como administrador para salvar.",
      handle: async (ctx) => {
        const state = await readJson(ctx.req, 1024 * 1024);
        const problem = validateState(state);
        if (problem) throw new HttpError(400, problem);
        for (const gift of state.gifts) delete gift.given;
        await store.save(state);
        return { body: state };
      }
    },
    {
      method: "POST",
      path: "/api/images",
      sameOrigin: true,
      admin: "Entre como administrador para enviar imagens.",
      handle: async (ctx) => ({ status: 201, body: await images.upload(ctx.req) })
    },
    {
      method: "GET",
      path: /^\/api\/images\/([0-9a-f]{32})$/,
      handle: (ctx) => {
        if (!IMAGE_ID.test(ctx.params[0])) throw new HttpError(404, "Não encontrado.");
        return {
          redirect: images.publicUrl(ctx.params[0]),
          headers: { "Cache-Control": "public, max-age=31536000, immutable" }
        };
      }
    },
    {
      method: "POST",
      path: "/api/payments/checkout",
      sameOrigin: true,
      handle: async (ctx) => ({ body: await payments.createCheckout(ctx.req) })
    },
    {
      method: "POST",
      path: "/api/messages",
      sameOrigin: true,
      handle: async (ctx) => ({ status: 201, body: await messages.submit(ctx.req) })
    },
    {
      method: "GET",
      path: "/api/admin/messages",
      admin: "Entre como administrador para consultar as mensagens.",
      handle: async () => ({ body: await messages.list() })
    }
  ];
}

function findRoute(routes, method, pathname) {
  for (const route of routes) {
    if (route.method !== method) continue;
    if (typeof route.path === "string") {
      if (route.path === pathname) return { route, params: [] };
    } else {
      const match = route.path.exec(pathname);
      if (match) return { route, params: match.slice(1) };
    }
  }
  return null;
}

module.exports = { createRoutes, findRoute, SAME_ORIGIN_MESSAGE };
