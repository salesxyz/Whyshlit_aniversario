"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.resolve(process.env.WHYLIST_DATA_DIR || path.join(ROOT, "data"));
const STATE_FILE = path.join(DATA_DIR, "state.json");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "whylist-assets";
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const SESSION_SECRET = process.env.SESSION_SECRET ||
  crypto.createHash("sha256").update("whylist-session:" + ADMIN_PASSWORD).digest("hex");
const SESSION_MAX_AGE = 8 * 60 * 60;
const LOGIN_WINDOW = 15 * 60 * 1000;
const LOGIN_LIMIT = 5;
const loginAttempts = new Map();
const ICONS = new Set(["gift", "tech", "kitchen", "home", "book", "style", "trip", "food", "cash"]);
const PIX_TYPES = new Set(["cpf", "cnpj", "phone", "email", "random"]);
const IMAGE_ID = /^[0-9a-f]{32}$/;
const USE_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const CONTRIBUTION_ID = "__whylist_contribution__";

function sendJson(res, status, data, headers) {
  res.writeHead(status, Object.assign({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY"
  }, headers || {}));
  res.end(JSON.stringify(data));
}

function error(status, message) {
  const result = new Error(message);
  result.status = status;
  return result;
}

async function readBody(req, limit) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw error(413, "Corpo da requisição muito grande.");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJson(req, limit) {
  const body = await readBody(req, limit);
  try {
    return JSON.parse(body.toString("utf8"));
  } catch {
    throw error(400, "JSON inválido.");
  }
}

function readCookie(req, name) {
  for (const cookie of String(req.headers.cookie || "").split(";")) {
    const separator = cookie.indexOf("=");
    if (separator >= 0 && cookie.slice(0, separator).trim() === name) {
      return cookie.slice(separator + 1).trim();
    }
  }
  return "";
}

function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function sign(payload) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
}

function isAdmin(req) {
  const [payload, signature, extra] = readCookie(req, "whylist_session").split(".");
  if (!payload || !signature || extra) return false;
  if (!safeEqual(signature, sign(payload))) return false;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number.isInteger(session.exp) && session.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function cookie(value, maxAge) {
  return "whylist_session=" + value + "; Path=/; HttpOnly; SameSite=Strict; Max-Age=" + maxAge +
    (process.env.NODE_ENV === "production" || process.env.VERCEL ? "; Secure" : "");
}

function requireSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin || !req.headers.host) return false;
  try {
    const parsedOrigin = new URL(origin);
    const forwardedProtocol = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
    const requestProtocol = forwardedProtocol || (req.socket && req.socket.encrypted ? "https" : "http");
    return parsedOrigin.host === req.headers.host && parsedOrigin.protocol === requestProtocol + ":";
  } catch {
    return false;
  }
}

function validString(value, maxLength, optional) {
  return (optional && value === undefined) || (typeof value === "string" && value.length <= maxLength);
}

function validateState(state) {
  if (!state || typeof state !== "object" || Array.isArray(state)) return "Configuração inválida.";
  if (!validString(state.siteTitle, 60, true) || !validString(state.theme, 10, true) ||
      !validString(state.honoree, 40, false) || !validString(state.date, 10, false) ||
      !validString(state.message, 280, false)) return "Revise os campos de configuração do site.";
  if (state.theme !== undefined && !["system", "light", "dark"].includes(state.theme)) return "Tema inválido.";
  if (state.date) {
    const date = new Date(state.date + "T00:00:00Z");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(state.date) || Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== state.date) return "Data inválida.";
  }
  if (!state.pix || typeof state.pix !== "object" || Array.isArray(state.pix) ||
      !PIX_TYPES.has(state.pix.type) || !validString(state.pix.key, 200, false) ||
      !validString(state.pix.name, 25, false) || !validString(state.pix.city, 15, false)) {
    return "Configuração do Pix inválida.";
  }
  if (!Array.isArray(state.gifts) || state.gifts.length > 200) return "A lista pode ter no máximo 200 presentes.";

  const ids = new Set();
  for (const gift of state.gifts) {
    if (!gift || typeof gift !== "object" || Array.isArray(gift) ||
        !validString(gift.id, 100, false) || !/^[A-Za-z0-9_-]{1,100}$/.test(gift.id) ||
        gift.id === CONTRIBUTION_ID ||
        !validString(gift.name, 80, false) || !gift.name.trim() ||
        !validString(gift.note, 140, true) || !validString(gift.link, 2048, true) ||
        typeof gift.price !== "number" || !Number.isFinite(gift.price) ||
        gift.price < 0 || gift.price > 999999.99) {
      return "Revise os dados dos presentes.";
    }
    if (ids.has(gift.id)) return "Cada presente precisa ter um identificador único.";
    ids.add(gift.id);
    if (gift.link) {
      try {
        if (!["http:", "https:"].includes(new URL(gift.link).protocol)) return "Os links precisam usar HTTP ou HTTPS.";
      } catch {
        return "Há um link inválido na lista.";
      }
    }
    if (gift.img !== undefined &&
        (!gift.img || typeof gift.img !== "object" ||
          !((gift.img.t === "icon" && ICONS.has(gift.img.k)) ||
            (gift.img.t === "asset" && IMAGE_ID.test(String(gift.img.id)))))) {
      return "Imagem de presente inválida.";
    }
  }
  return "";
}

function requireSupabase() {
  if (!USE_SUPABASE) throw error(503, "Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no servidor.");
  try {
    const url = new URL(SUPABASE_URL);
    if (url.protocol !== "https:" &&
        !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) {
      throw new Error("URL não segura.");
    }
  } catch {
    throw error(503, "SUPABASE_URL inválida. Use HTTPS (ou HTTP apenas para localhost).");
  }
}

async function supabaseRequest(route, options) {
  requireSupabase();
  const response = await fetch(SUPABASE_URL + route, Object.assign({
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
      Accept: "application/json"
    },
    signal: AbortSignal.timeout(10000)
  }, options || {}));
  if (!response.ok) {
    throw new Error("Falha na requisição ao Supabase (HTTP " + response.status + ").");
  }
  return response;
}

async function readInitialState() {
  const html = await fs.readFile(path.join(ROOT, "index.html"), "utf8");
  const match = html.match(/<script type="application\/json" id="state">\s*([\s\S]*?)\s*<\/script>/);
  if (!match) throw new Error("Não foi possível encontrar a configuração inicial em index.html.");
  return JSON.parse(match[1]);
}

async function readSupabaseState() {
  const query = "/rest/v1/whylist_state?id=eq.1&select=state";
  const response = await supabaseRequest(query);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error("Resposta inválida ao carregar estado do Supabase.");
  if (rows.length) return rows[0].state;

  const initialState = await readInitialState();
  await supabaseRequest("/rest/v1/whylist_state?on_conflict=id", {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates,return=minimal"
    },
    body: JSON.stringify({ id: 1, state: initialState })
  });
  const initialized = await supabaseRequest(query);
  const initializedRows = await initialized.json();
  if (!Array.isArray(initializedRows) || !initializedRows.length) {
    throw new Error("Não foi possível inicializar o estado no Supabase.");
  }
  return initializedRows[0].state;
}

async function loadState() {
  if (USE_SUPABASE) return readSupabaseState();
  if (process.env.VERCEL) requireSupabase();
  try {
    return JSON.parse(await fs.readFile(STATE_FILE, "utf8"));
  } catch (cause) {
    if (cause.code !== "ENOENT") throw cause;
    return readInitialState();
  }
}

async function saveState(state) {
  if (USE_SUPABASE) {
    await supabaseRequest("/rest/v1/whylist_state?on_conflict=id", {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify({ id: 1, state, updated_at: new Date().toISOString() })
    });
    return;
  }
  if (process.env.VERCEL) requireSupabase();
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tempFile = STATE_FILE + "." + crypto.randomBytes(8).toString("hex") + ".tmp";
  try {
    await fs.writeFile(tempFile, JSON.stringify(state, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
    await fs.rename(tempFile, STATE_FILE);
  } catch (cause) {
    try {
      await fs.unlink(tempFile);
    } catch (cleanupError) {
      if (cleanupError.code !== "ENOENT") console.error("Falha ao remover arquivo temporário:", cleanupError);
    }
    throw cause;
  }
}

function storageObjectUrl(id) {
  return SUPABASE_URL + "/storage/v1/object/" + encodeURIComponent(SUPABASE_BUCKET) + "/" + id + ".jpg";
}

async function uploadImage(req, res) {
  if (!requireSameOrigin(req)) return sendJson(res, 403, { error: "Origem da requisição inválida." });
  if (!isAdmin(req)) return sendJson(res, 401, { error: "Entre como administrador para enviar imagens." });
  requireSupabase();
  const mime = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
  if (mime !== "image/jpeg") return sendJson(res, 415, { error: "Envie uma imagem JPEG." });
  const image = await readBody(req, 1024 * 1024);
  if (image.length < 4 || image[0] !== 0xff || image[1] !== 0xd8 || image[image.length - 2] !== 0xff || image[image.length - 1] !== 0xd9) {
    return sendJson(res, 400, { error: "O arquivo enviado não é um JPEG válido." });
  }
  const id = crypto.randomBytes(16).toString("hex");
  const response = await supabaseRequest("/storage/v1/object/" + encodeURIComponent(SUPABASE_BUCKET) + "/" + id + ".jpg", {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
      "x-upsert": "false"
    },
    body: image
  });
  await response.arrayBuffer();
  return sendJson(res, 201, { id });
}

async function createCheckout(req, res) {
  if (!requireSameOrigin(req)) return sendJson(res, 403, { error: "Origem da requisição inválida." });
  requireSupabase();
  if (!STRIPE_SECRET_KEY) return sendJson(res, 503, { error: "Configure STRIPE_SECRET_KEY no ambiente do servidor." });
  const body = await readJson(req, 4096);
  if (!body || typeof body.giftId !== "string") return sendJson(res, 400, { error: "Presente inválido." });
  const state = await loadState();
  const contribution = body.giftId === CONTRIBUTION_ID;
  const gift = contribution ? null : state.gifts.find((item) => item.id === body.giftId);
  if (!contribution && !gift) return sendJson(res, 404, { error: "Esse presente não está mais na lista." });

  const value = Number(body.amount);
  if (!Number.isFinite(value) || value < 0.5 || value > 999999.99) {
    return sendJson(res, 400, { error: "Informe uma contribuição entre R$ 0,50 e R$ 999.999,99." });
  }
  const origin = new URL(req.headers.origin).origin;
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.append("payment_method_types[]", "pix");
  params.set("line_items[0][price_data][currency]", "brl");
  params.set("line_items[0][price_data][unit_amount]", String(Math.round(value * 100)));
  params.set("line_items[0][price_data][product_data][name]", (gift ? gift.name : "Contribuição para a lista").slice(0, 120));
  params.set("line_items[0][quantity]", "1");
  params.set("payment_method_options[pix][expires_after_seconds]", "3600");
  params.set("success_url", origin + "/?pagamento=confirmado");
  params.set("cancel_url", origin + "/?pagamento=cancelado");
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + STRIPE_SECRET_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": crypto.randomUUID()
    },
    body: params,
    signal: AbortSignal.timeout(15000)
  });
  const result = await response.json();
  if (!response.ok || typeof result.url !== "string") {
    console.error("Falha ao criar Checkout Stripe:", response.status, result.error && result.error.type);
    return sendJson(res, 502, { error: "Não foi possível iniciar o pagamento Pix. Confira se Pix está ativado na conta Stripe." });
  }
  return sendJson(res, 200, { url: result.url });
}

async function handleApi(req, res) {
  const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));
  const method = req.method || "GET";

  if (method === "GET" && url.pathname === "/api/status") {
    const configured = Boolean(ADMIN_PASSWORD.length >= 12 && (USE_SUPABASE || !process.env.VERCEL));
    return sendJson(res, 200, {
      backend: true,
      configured,
      admin: configured && isAdmin(req),
      storage: USE_SUPABASE ? "supabase" : "file",
      payments: Boolean(USE_SUPABASE && STRIPE_SECRET_KEY)
    });
  }
  if (method === "GET" && url.pathname === "/api/state") {
    return sendJson(res, 200, await loadState());
  }
  if (method === "POST" && url.pathname === "/api/admin/login") {
    if (!requireSameOrigin(req)) return sendJson(res, 403, { error: "Origem da requisição inválida." });
    if (ADMIN_PASSWORD.length < 12) return sendJson(res, 503, { error: "Configure ADMIN_PASSWORD com pelo menos 12 caracteres." });
    const address = req.socket && req.socket.remoteAddress || "unknown";
    const now = Date.now();
    let attempts = loginAttempts.get(address);
    if (!attempts || attempts.resetAt <= now) attempts = { count: 0, resetAt: now + LOGIN_WINDOW };
    if (attempts.count >= LOGIN_LIMIT) {
      return sendJson(res, 429, { error: "Muitas tentativas. Aguarde antes de tentar novamente." },
        { "Retry-After": String(Math.ceil((attempts.resetAt - now) / 1000)) });
    }
    const body = await readJson(req, 4096);
    if (!safeEqual(String(body && body.password || ""), ADMIN_PASSWORD)) {
      attempts.count++;
      loginAttempts.set(address, attempts);
      return sendJson(res, 401, { error: "Senha incorreta." });
    }
    loginAttempts.delete(address);
    const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE })).toString("base64url");
    const token = payload + "." + sign(payload);
    return sendJson(res, 200, { admin: true }, { "Set-Cookie": cookie(token, SESSION_MAX_AGE) });
  }
  if (method === "POST" && url.pathname === "/api/admin/logout") {
    if (!requireSameOrigin(req)) return sendJson(res, 403, { error: "Origem da requisição inválida." });
    return sendJson(res, 200, { admin: false }, { "Set-Cookie": cookie("", 0) });
  }
  if (method === "PUT" && url.pathname === "/api/admin/state") {
    if (!requireSameOrigin(req)) return sendJson(res, 403, { error: "Origem da requisição inválida." });
    if (!isAdmin(req)) return sendJson(res, 401, { error: "Entre como administrador para salvar." });
    const state = await readJson(req, 1024 * 1024);
    const validationError = validateState(state);
    if (validationError) return sendJson(res, 400, { error: validationError });
    for (const gift of state.gifts) delete gift.given;
    await saveState(state);
    return sendJson(res, 200, state);
  }
  if (method === "POST" && url.pathname === "/api/images") return uploadImage(req, res);
  const imageMatch = /^\/api\/images\/([0-9a-f]{32})$/.exec(url.pathname);
  if (method === "GET" && imageMatch) {
    requireSupabase();
    const imageUrl = storageObjectUrl(imageMatch[1]);
    return res.writeHead(302, {
      Location: imageUrl.replace("/storage/v1/object/", "/storage/v1/object/public/"),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff"
    }).end();
  }
  if (method === "POST" && url.pathname === "/api/payments/checkout") return createCheckout(req, res);
  return sendJson(res, 404, { error: "Não encontrado." });
}

async function handler(req, res) {
  try {
    await handleApi(req, res);
  } catch (cause) {
    if (res.headersSent) {
      res.destroy(cause);
      return;
    }
    const status = cause.status || 500;
    if (status >= 500) console.error("Falha ao processar requisição:", cause);
    sendJson(res, status, { error: status >= 500 ? "Erro interno do servidor." : cause.message });
  }
}

module.exports = { handler };
