"use strict";

const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { handler: handleApi } = require("./lib/api");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8"
};

async function sendStatic(res, filename) {
  try {
    const contents = await fs.readFile(path.join(ROOT, filename));
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[path.extname(filename)],
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY"
    });
    res.end(contents);
  } catch (cause) {
    console.error("Falha ao servir " + filename + ":", cause);
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Falha ao carregar o site.");
  }
}

function handle(req, res) {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname.startsWith("/api/")) return handleApi(req, res);
  if (req.method === "GET" && url.pathname === "/") return sendStatic(res, "index.html");
  if (req.method === "GET" && ["/app.js", "/style.css"].includes(url.pathname)) {
    return sendStatic(res, url.pathname.slice(1));
  }
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Não encontrado.");
}

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  console.error("PORT inválida.");
  process.exit(1);
}
if ((process.env.ADMIN_PASSWORD || "").length < 12) {
  console.error("Configure ADMIN_PASSWORD com pelo menos 12 caracteres antes de iniciar.");
  process.exit(1);
}

http.createServer(handle).listen(PORT, HOST, () => {
  console.log("Whylist disponível em http://localhost:" + PORT);
});
