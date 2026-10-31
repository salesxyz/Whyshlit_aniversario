"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");

/** Armazenamento em arquivo JSON, para desenvolvimento local. Não use em produção. */
function createFileStore({ dataDir, defaultState }) {
  const stateFile = path.join(dataDir, "state.json");
  const messagesFile = path.join(dataDir, "messages.jsonl");

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

  async function addMessage(message) {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.appendFile(messagesFile, JSON.stringify(message) + "\n", { encoding: "utf8", mode: 0o600 });
  }

  async function listMessages(limit) {
    let content;
    try {
      content = await fs.readFile(messagesFile, "utf8");
    } catch (cause) {
      if (cause.code === "ENOENT") return [];
      throw cause;
    }
    return content.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line)).reverse().slice(0, limit);
  }

  return { kind: "file", load, save, addMessage, listMessages };
}

module.exports = { createFileStore };
