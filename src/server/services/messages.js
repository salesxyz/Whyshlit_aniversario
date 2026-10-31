"use strict";

const { HttpError, readJson } = require("../http");

const MAX_MESSAGE_LENGTH = 1000;
const MAX_NAME_LENGTH = 60;
const INBOX_LIMIT = 100;

function createMessageService({ store }) {
  async function submit(req) {
    const body = await readJson(req, 8192);
    const senderName = body && typeof body.name === "string" ? body.name.trim() : "";
    const message = body && typeof body.message === "string" ? body.message.trim() : "";
    if (senderName.length > MAX_NAME_LENGTH) {
      throw new HttpError(400, "O nome deve ter até " + MAX_NAME_LENGTH + " caracteres.");
    }
    if (!message || message.length > MAX_MESSAGE_LENGTH) {
      throw new HttpError(400, "Escreva uma mensagem de até " + MAX_MESSAGE_LENGTH + " caracteres.");
    }

    await store.addMessage({ sender_name: senderName, message, created_at: new Date().toISOString() });
    return { sent: true };
  }

  async function list() {
    return store.listMessages(INBOX_LIMIT);
  }

  return { submit, list };
}

module.exports = { createMessageService };
