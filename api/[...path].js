"use strict";

const { handler } = require("../lib/api");

module.exports = handler;
module.exports.config = { api: { bodyParser: false } };
