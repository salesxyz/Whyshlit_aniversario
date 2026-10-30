"use strict";

const crypto = require("node:crypto");
const { HttpError, readBody } = require("../http");

const MAX_IMAGE_BYTES = 1024 * 1024;

function isJpeg(buffer) {
  const n = buffer.length;
  return n >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[n - 2] === 0xff && buffer[n - 1] === 0xd9;
}

/** Imagens dos presentes: JPEG de até 1 MB guardado no bucket público do Supabase. */
function createImageService({ supabase }) {
  async function upload(req) {
    supabase.assertConfigured();
    const mime = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
    if (mime !== "image/jpeg") throw new HttpError(415, "Envie uma imagem JPEG.");
    const image = await readBody(req, MAX_IMAGE_BYTES);
    if (!isJpeg(image)) throw new HttpError(400, "O arquivo enviado não é um JPEG válido.");
    const id = crypto.randomBytes(16).toString("hex");
    await supabase.uploadObject(id + ".jpg", image, "image/jpeg");
    return { id };
  }

  function publicUrl(id) {
    supabase.assertConfigured();
    return supabase.publicObjectUrl(id + ".jpg");
  }

  return { upload, publicUrl };
}

module.exports = { createImageService, MAX_IMAGE_BYTES };
