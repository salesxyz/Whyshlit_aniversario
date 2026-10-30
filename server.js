"use strict";

// Servidor local: serve a pasta public/ e a API. Na Vercel, quem atende é api/[...path].js.
const http = require("node:http");
const { loadConfig, startupProblem } = require("./src/server/config");
const { createApi } = require("./src/server");
const { createStaticHandler } = require("./src/server/static");

const config = loadConfig();
const problem = startupProblem(config);
if (problem) {
  console.error(problem);
  process.exit(1);
}

const api = createApi(config);
const serveStatic = createStaticHandler(config.publicDir);

http.createServer((req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  return pathname.startsWith("/api/") ? api(req, res) : serveStatic(req, res);
}).listen(config.port, config.host, () => {
  console.log("Whylist disponível em http://localhost:" + config.port);
});
