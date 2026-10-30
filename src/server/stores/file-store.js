"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");

/** Armazenamento em arquivo JSON, para desenvolvimento local. Não use em produção. */
function createFileStore({ dataDir, defaultState }) {
  const stateFile = path.join(dataDir, "state.json");

  async function load() {
    try {
      return JSON.parse(await fs.readFile(stateFile, "utf8"));
    } catch (cause) {
      if (cause.code !== "ENOENT") throw cause;
      return structuredClone(defaultState);
    }
  }

  async function save(state) {
    await fs.mkdir(dataDir, { recursive: true });
    const tempFile = stateFile + "." + crypto.randomBytes(8).toString("hex") + ".tmp";
    try {
      await fs.writeFile(tempFile, JSON.stringify(state, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
      await fs.rename(tempFile, stateFile);
    } catch (cause) {
      try {
        await fs.unlink(tempFile);
      } catch (cleanupError) {
        if (cleanupError.code !== "ENOENT") console.error("Falha ao remover arquivo temporário:", cleanupError);
      }
      throw cause;
    }
  }

  return { kind: "file", load, save };
}

module.exports = { createFileStore };
