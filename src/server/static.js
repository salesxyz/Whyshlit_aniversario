"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const { SECURITY_HEADERS } = require("./http");

const MIME_TYPES = Object.freeze({
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8"
});

/** Resolve a URL para um arquivo dentro de `publicDir`, ou null se for inválida ou fora da pasta. */
function resolvePublicFile(publicDir, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  if (relative.split("/").some((part) => part.startsWith("."))) return null;
  const file = path.resolve(publicDir, relative);
  return file.startsWith(publicDir + path.sep) ? file : null;
}

/** Servidor de arquivos estáticos da pasta `public/` (usado no desenvolvimento local). */
function createStaticHandler(publicDir) {
  return async function serveStatic(req, res) {
    const url = new URL(req.url, "http://localhost");
    const file = req.method === "GET" || req.method === "HEAD" ? resolvePublicFile(publicDir, url.pathname) : null;
    const type = file && MIME_TYPES[path.extname(file).toLowerCase()];
    if (!file || !type) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", ...SECURITY_HEADERS });
      res.end("Não encontrado.");
      return;
    }
    try {
      const contents = await fs.readFile(file);
      res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-cache", ...SECURITY_HEADERS });
      res.end(req.method === "HEAD" ? undefined : contents);
    } catch (cause) {
      if (cause.code === "ENOENT" || cause.code === "EISDIR") {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", ...SECURITY_HEADERS });
        res.end("Não encontrado.");
        return;
      }
      console.error("Falha ao servir " + url.pathname + ":", cause);
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8", ...SECURITY_HEADERS });
      res.end("Falha ao carregar o site.");
    }
  };
}

module.exports = { createStaticHandler, resolvePublicFile };
