"use strict";

/** Erro com código HTTP; as mensagens são mostradas ao usuário quando o status é < 500. */
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

const SECURITY_HEADERS = Object.freeze({
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY"
});

function sendJson(res, status, data, headers) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...SECURITY_HEADERS,
    ...(headers || {})
  });
  res.end(JSON.stringify(data));
}

async function readBody(req, limitBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limitBytes) throw new HttpError(413, "Corpo da requisição muito grande.");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJson(req, limitBytes) {
  const body = await readBody(req, limitBytes);
  try {
    return JSON.parse(body.toString("utf8"));
  } catch {
    throw new HttpError(400, "JSON inválido.");
  }
}

function readCookie(req, name) {
  for (const part of String(req.headers.cookie || "").split(";")) {
    const separator = part.indexOf("=");
    if (separator >= 0 && part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim();
    }
  }
  return "";
}

/** Aceita somente requisições cuja origem é o próprio site (proteção contra CSRF). */
function isSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin || !req.headers.host) return false;
  try {
    const parsed = new URL(origin);
    const forwarded = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
    const protocol = forwarded || (req.socket && req.socket.encrypted ? "https" : "http");
    return parsed.host === req.headers.host && parsed.protocol === protocol + ":";
  } catch {
    return false;
  }
}

/** Endereço do cliente. Atrás de proxy (Vercel) usa o cabeçalho que a plataforma define. */
function clientAddress(req, trustProxy) {
  if (trustProxy) {
    const real = String(req.headers["x-real-ip"] || "").trim();
    if (real) return real;
    const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    if (forwarded) return forwarded;
  }
  return (req.socket && req.socket.remoteAddress) || "unknown";
}

module.exports = {
  HttpError,
  SECURITY_HEADERS,
  sendJson,
  readBody,
  readJson,
  readCookie,
  isSameOrigin,
  clientAddress
};
