"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { loadConfig, startupProblem } = require("../src/server/config");
const { createApi } = require("../src/server");
const { createStaticHandler } = require("../src/server/static");

const PASSWORD = "senha-de-teste-123";

async function startServer(env) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "whylist-"));
  const config = loadConfig({ ADMIN_PASSWORD: PASSWORD, WHYLIST_DATA_DIR: dataDir, ...env });
  const api = createApi(config);
  const serveStatic = createStaticHandler(config.publicDir);
  const server = http.createServer((req, res) => (req.url.startsWith("/api/") ? api(req, res) : serveStatic(req, res)));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  return {
    base,
    dataDir,
    async close() {
      await new Promise((resolve) => server.close(resolve));
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  };
}

const json = (response) => response.json();

async function login(app, password = PASSWORD) {
  return fetch(app.base + "/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: app.base },
    body: JSON.stringify({ password })
  });
}

test("InfinitePay usa a chave secreta apenas no servidor", () => {
  const config = loadConfig({ ADMIN_PASSWORD: PASSWORD, INFINITEPAY_API_KEY: "inchk_exemplo" });
  assert.equal(config.infinitePay.apiKey, "inchk_exemplo");
  assert.equal(config.infinitePay.apiUrl, "https://api.checkout.infinitepay.io");
  assert.equal(startupProblem(config), "");
});

test("chave em formato inválido não habilita o checkout InfinitePay", async (t) => {
  const app = await startServer({
    SUPABASE_URL: "https://exemplo.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "chave",
    INFINITEPAY_API_KEY: "chave_invalida"
  });
  t.after(() => app.close());

  const status = await json(await fetch(app.base + "/api/status"));
  assert.equal(status.payments, false);

  const response = await fetch(app.base + "/api/payments/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: app.base },
    body: JSON.stringify({ giftId: "ex1", amount: 10 })
  });
  assert.equal(response.status, 503);
  assert.equal((await json(response)).error, "Erro interno do servidor.");
});

test("status e lista pública funcionam sem login", async (t) => {
  const app = await startServer();
  t.after(() => app.close());
  const status = await json(await fetch(app.base + "/api/status"));
  assert.deepEqual(status, { backend: true, configured: true, admin: false, storage: "file", payments: false });
  const state = await json(await fetch(app.base + "/api/state"));
  assert.equal(state.gifts.length, 6);
});

test("login: senha errada, limite de tentativas e sessão", async (t) => {
  const app = await startServer();
  t.after(() => app.close());

  const noOrigin = await fetch(app.base + "/api/admin/login", { method: "POST", body: "{}" });
  assert.equal(noOrigin.status, 403);

  for (let i = 0; i < 5; i++) assert.equal((await login(app, "errada")).status, 401);
  const blocked = await login(app, "errada");
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get("retry-after")) > 0);
});

test("salvar exige sessão, origem do site e dados válidos", async (t) => {
  const app = await startServer();
  t.after(() => app.close());
  const state = await json(await fetch(app.base + "/api/state"));
  const put = (body, headers) => fetch(app.base + "/api/admin/state", {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body)
  });

  assert.equal((await put(state, {})).status, 403);
  assert.equal((await put(state, { Origin: app.base })).status, 401);

  const ok = await login(app);
  assert.equal(ok.status, 200);
  const cookie = ok.headers.get("set-cookie").split(";")[0];
  assert.match(ok.headers.get("set-cookie"), /HttpOnly/);

  const status = await json(await fetch(app.base + "/api/status", { headers: { Cookie: cookie } }));
  assert.equal(status.admin, true);

  const headers = { Origin: app.base, Cookie: cookie };
  const bad = await put({ ...state, gifts: [{ id: "x", name: "", price: 1 }] }, headers);
  assert.equal(bad.status, 400);
  assert.equal((await json(bad)).error, "Revise os dados dos presentes.");

  const updated = { ...state, honoree: "Ana", gifts: [{ id: "g1", name: "Fone", price: 10, given: true }] };
  const saved = await put(updated, headers);
  assert.equal(saved.status, 200);
  assert.equal("given" in (await json(saved)).gifts[0], false);

  const reloaded = await json(await fetch(app.base + "/api/state"));
  assert.equal(reloaded.honoree, "Ana");
  assert.equal(reloaded.gifts.length, 1);
  assert.ok(fs.existsSync(path.join(app.dataDir, "state.json")));
});

test("sair encerra a sessão e cookie adulterado não vale", async (t) => {
  const app = await startServer();
  t.after(() => app.close());
  const cookie = (await login(app)).headers.get("set-cookie").split(";")[0];
  const logout = await fetch(app.base + "/api/admin/logout", { method: "POST", headers: { Origin: app.base } });
  assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
  const forged = cookie.slice(0, -2) + "xx";
  const status = await json(await fetch(app.base + "/api/status", { headers: { Cookie: forged } }));
  assert.equal(status.admin, false);
});

test("mensagens dos convidados ficam privadas e só o admin consulta a caixa de entrada", async (t) => {
  const app = await startServer();
  t.after(() => app.close());

  const submit = (body, headers = { Origin: app.base, "Content-Type": "application/json" }) =>
    fetch(app.base + "/api/messages", { method: "POST", headers, body: JSON.stringify(body) });

  assert.equal((await fetch(app.base + "/api/admin/messages")).status, 401);
  assert.equal((await submit({ name: "Ana", message: "Oi!" }, { "Content-Type": "application/json" })).status, 403);
  assert.equal((await submit({ name: "Ana", message: "   " })).status, 400);
  assert.equal((await submit({ name: "A".repeat(61), message: "Oi!" })).status, 400);

  const sent = await submit({ name: "  Ana  ", message: "  Feliz aniversário!  " });
  assert.equal(sent.status, 201);
  assert.deepEqual(await json(sent), { sent: true });

  const publicState = await json(await fetch(app.base + "/api/state"));
  assert.equal(JSON.stringify(publicState).includes("Feliz aniversário!"), false);

  const cookie = (await login(app)).headers.get("set-cookie").split(";")[0];
  const inbox = await fetch(app.base + "/api/admin/messages", { headers: { Cookie: cookie } });
  assert.equal(inbox.status, 200);
  const items = await json(inbox);
  assert.equal(items.length, 1);
  assert.equal(items[0].sender_name, "Ana");
  assert.equal(items[0].message, "Feliz aniversário!");
  assert.ok(items[0].created_at);
});

test("imagens e pagamentos pedem configuração do servidor", async (t) => {
  const app = await startServer();
  t.after(() => app.close());
  const cookie = (await login(app)).headers.get("set-cookie").split(";")[0];

  const noAuth = await fetch(app.base + "/api/images", { method: "POST", headers: { Origin: app.base, "Content-Type": "image/jpeg" }, body: "x" });
  assert.equal(noAuth.status, 401);

  const noSupabase = await fetch(app.base + "/api/images", {
    method: "POST",
    headers: { Origin: app.base, Cookie: cookie, "Content-Type": "image/jpeg" },
    body: Buffer.from([0xff, 0xd8, 0xff, 0xd9])
  });
  assert.equal(noSupabase.status, 503);

  const checkout = await fetch(app.base + "/api/payments/checkout", {
    method: "POST",
    headers: { Origin: app.base, "Content-Type": "application/json" },
    body: JSON.stringify({ giftId: "ex1", amount: 10 })
  });
  assert.equal(checkout.status, 503);

  const redirect = await fetch(app.base + "/api/images/" + "a".repeat(32), { redirect: "manual" });
  assert.equal(redirect.status, 503);
});

test("com Supabase configurado a imagem redireciona para o bucket público", async (t) => {
  const app = await startServer({ SUPABASE_URL: "https://exemplo.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "chave" });
  t.after(() => app.close());
  const id = "b".repeat(32);
  const response = await fetch(app.base + "/api/images/" + id, { redirect: "manual" });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "https://exemplo.supabase.co/storage/v1/object/public/whylist-assets/" + id + ".jpg");
  const status = await json(await fetch(app.base + "/api/status"));
  assert.equal(status.storage, "supabase");
});

test("checkout InfinitePay aceita somente cartão e valores em BRL", async (t) => {
  const app = await startServer({
    SUPABASE_URL: "https://exemplo.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "chave",
    INFINITEPAY_API_KEY: "inchk_exemplo"
  });
  t.after(() => app.close());

  const originalFetch = global.fetch;
  let infinitePayRequest;
  global.fetch = async (input, options) => {
    const url = String(input);
    if (url.startsWith("https://exemplo.supabase.co/rest/v1/whylist_state?")) {
      return new Response(JSON.stringify([{ state: JSON.parse(fs.readFileSync(path.join(__dirname, "..", "public", "default-state.json"), "utf8")) }]), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (url === "https://api.checkout.infinitepay.io/links") {
      infinitePayRequest = options;
      return new Response(JSON.stringify({ url: "https://checkout.infinitepay.io/example-checkout" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    return originalFetch(input, options);
  };

  try {
    const belowMinimum = await fetch(app.base + "/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: app.base },
      body: JSON.stringify({ giftId: "ex1", amount: 149.89 })
    });
    assert.equal(belowMinimum.status, 400);
    assert.equal((await json(belowMinimum)).error, "Informe uma contribuição entre R$ 149,90 e R$ 999.999,99.");

    const response = await fetch(app.base + "/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: app.base },
      body: JSON.stringify({ giftId: "ex1", amount: 149.90 })
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await json(response), { url: "https://checkout.infinitepay.io/example-checkout" });
    const payload = JSON.parse(infinitePayRequest.body);
    assert.equal(payload.items[0].quantity, 1);
    assert.equal(payload.items[0].price, 14990);
    assert.equal(payload.items[0].description, "Fone de ouvido sem fio");
    assert.match(payload.order_nsu, /^[0-9a-f-]{36}$/);
    assert.equal(payload.redirect_url, "http://127.0.0.1:" + new URL(app.base).port + "/?pagamento=retorno");
    assert.equal(payload.options.single_payment, true);
    assert.deepEqual(payload.options.payment_methods_enabled, ["credit_card"]);
    assert.equal(infinitePayRequest.headers["X-Api-Key"], "inchk_exemplo");
    assert.equal(infinitePayRequest.headers["Content-Type"], "application/json");
    const status = await json(await fetch(app.base + "/api/status"));
    assert.equal(status.payments, true);
  } finally {
    global.fetch = originalFetch;
  }
});

test("rejeição da InfinitePay retorna orientação segura para o checkout", async (t) => {
  const app = await startServer({
    SUPABASE_URL: "https://exemplo.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "chave",
    INFINITEPAY_API_KEY: "inchk_exemplo"
  });
  t.after(() => app.close());

  const originalFetch = global.fetch;
  global.fetch = async (input, options) => {
    const url = String(input);
    if (url.startsWith("https://exemplo.supabase.co/rest/v1/whylist_state?")) {
      return new Response(JSON.stringify([{ state: JSON.parse(fs.readFileSync(path.join(__dirname, "..", "public", "default-state.json"), "utf8")) }]), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (url === "https://api.checkout.infinitepay.io/links") {
      return new Response(JSON.stringify({
        error: {
          type: "invalid_request_error",
          param: "payment_methods_enabled",
          message: "provider detail must not be sent to visitors"
        }
      }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    return originalFetch(input, options);
  };

  try {
    const response = await fetch(app.base + "/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: app.base },
      body: JSON.stringify({ giftId: "ex1", amount: 149.90 })
    });
    assert.equal(response.status, 502);
    assert.deepEqual(await json(response), {
      error: "Não foi possível iniciar o pagamento. Confira a chave e a configuração do Checkout Integrado da InfinitePay."
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test("rota desconhecida devolve 404 em JSON", async (t) => {
  const app = await startServer();
  t.after(() => app.close());
  const response = await fetch(app.base + "/api/nada");
  assert.equal(response.status, 404);
  assert.deepEqual(await json(response), { error: "Não encontrado." });
});

test("arquivos estáticos: página, módulos e proteção contra caminhos fora de public/", async (t) => {
  const app = await startServer();
  t.after(() => app.close());
  const page = await fetch(app.base + "/");
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-type"), /text\/html/);
  const main = await fetch(app.base + "/js/main.js");
  assert.match(main.headers.get("content-type"), /text\/javascript/);
  assert.equal((await fetch(app.base + "/default-state.json")).status, 200);

  for (const bad of ["/../package.json", "/%2e%2e/package.json", "/.env", "/js/../../server.js", "/css/"]) {
    const response = await fetch(app.base + bad);
    assert.equal(response.status, 404, bad);
  }
  // O caminho precisa ser enviado cru, sem normalização do cliente.
  const raw = await new Promise((resolve) => {
    const req = http.request({ host: "127.0.0.1", port: new URL(app.base).port, path: "/../package.json" }, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.end();
  });
  assert.equal(raw, 404);
});
