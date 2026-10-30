"use strict";

// Entrada da API na Vercel: todas as rotas /api/* passam por aqui.
const { loadConfig } = require("../src/server/config");
const { createApi } = require("../src/server");

module.exports = createApi(loadConfig());
module.exports.config = { api: { bodyParser: false } };
