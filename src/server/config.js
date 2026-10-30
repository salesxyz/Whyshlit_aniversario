"use strict";

const crypto = require("node:crypto");
const path = require("node:path");

const ROOT_DIR = path.resolve(__dirname, "..", "..");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");

/**
 * Lê as variáveis de ambiente uma única vez e devolve um objeto de configuração imutável.
 * Receber `env` como parâmetro permite testar o servidor com configurações diferentes.
 */
function loadConfig(env = process.env) {
  const adminPassword = env.ADMIN_PASSWORD || "";
  const supabaseUrl = (env.SUPABASE_URL || "").replace(/\/+$/, "");
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || "";
  const isVercel = Boolean(env.VERCEL);

  return Object.freeze({
    rootDir: ROOT_DIR,
    publicDir: PUBLIC_DIR,
    dataDir: path.resolve(env.WHYLIST_DATA_DIR || path.join(ROOT_DIR, "data")),
    port: Number(env.PORT || 3000),
    host: env.HOST || "0.0.0.0",
    isVercel,
    secureCookies: env.NODE_ENV === "production" || isVercel,
    trustProxy: isVercel || env.TRUST_PROXY === "1",
    adminPassword,
    adminPasswordMinLength: 12,
    sessionSecret: env.SESSION_SECRET ||
      crypto.createHash("sha256").update("whylist-session:" + adminPassword).digest("hex"),
    sessionMaxAgeSeconds: 8 * 60 * 60,
    loginWindowMs: 15 * 60 * 1000,
    loginLimit: 5,
    supabase: Object.freeze({
      enabled: Boolean(supabaseUrl && supabaseKey),
      url: supabaseUrl,
      serviceKey: supabaseKey,
      bucket: env.SUPABASE_STORAGE_BUCKET || "whylist-assets"
    }),
    stripeSecretKey: env.STRIPE_SECRET_KEY || ""
  });
}

/** Mensagem de erro de configuração que impede o servidor de iniciar, ou "" se estiver tudo certo. */
function startupProblem(config) {
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) return "PORT inválida.";
  if (config.adminPassword.length < config.adminPasswordMinLength) {
    return "Configure ADMIN_PASSWORD com pelo menos " + config.adminPasswordMinLength + " caracteres antes de iniciar.";
  }
  return "";
}

module.exports = { loadConfig, startupProblem };
