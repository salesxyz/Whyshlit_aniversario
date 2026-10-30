"use strict";

const crypto = require("node:crypto");
const { HttpError, readCookie, readJson, clientAddress } = require("./http");

const COOKIE_NAME = "whylist_session";

function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

/**
 * Sessão administrativa por cookie assinado (HMAC). Não guarda nada em memória do servidor,
 * então funciona em funções serverless. Só o limite de tentativas de login fica em memória.
 */
function createAuth(config) {
  const attempts = new Map();

  function sign(payload) {
    return crypto.createHmac("sha256", config.sessionSecret).update(payload).digest("base64url");
  }

  function cookie(value, maxAge) {
    return COOKIE_NAME + "=" + value + "; Path=/; HttpOnly; SameSite=Strict; Max-Age=" + maxAge +
      (config.secureCookies ? "; Secure" : "");
  }

  function isPasswordConfigured() {
    return config.adminPassword.length >= config.adminPasswordMinLength;
  }

  function isAdmin(req) {
    const [payload, signature, extra] = readCookie(req, COOKIE_NAME).split(".");
    if (!payload || !signature || extra) return false;
    if (!safeEqual(signature, sign(payload))) return false;
    try {
      const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
      return Number.isInteger(session.exp) && session.exp > Math.floor(Date.now() / 1000);
    } catch {
      return false;
    }
  }

  function requireAdmin(req, message) {
    if (!isAdmin(req)) throw new HttpError(401, message);
  }

  /** Valida a senha e devolve o cabeçalho Set-Cookie da nova sessão. */
  async function login(req) {
    if (!isPasswordConfigured()) {
      throw new HttpError(503, "Configure ADMIN_PASSWORD com pelo menos " + config.adminPasswordMinLength + " caracteres.");
    }
    const address = clientAddress(req, config.trustProxy);
    const now = Date.now();
    let entry = attempts.get(address);
    if (!entry || entry.resetAt <= now) entry = { count: 0, resetAt: now + config.loginWindowMs };
    if (entry.count >= config.loginLimit) {
      const error = new HttpError(429, "Muitas tentativas. Aguarde antes de tentar novamente.");
      error.headers = { "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)) };
      throw error;
    }
    const body = await readJson(req, 4096);
    if (!safeEqual(String((body && body.password) || ""), config.adminPassword)) {
      entry.count++;
      attempts.set(address, entry);
      throw new HttpError(401, "Senha incorreta.");
    }
    attempts.delete(address);
    const payload = Buffer.from(JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + config.sessionMaxAgeSeconds
    })).toString("base64url");
    return cookie(payload + "." + sign(payload), config.sessionMaxAgeSeconds);
  }

  function logoutCookie() {
    return cookie("", 0);
  }

  return { isAdmin, requireAdmin, isPasswordConfigured, login, logoutCookie };
}

module.exports = { createAuth };
