// Imagem de um presente: ícone pronto ou foto enviada (JPEG reduzido no navegador).

import { GIFT_ICONS } from "./icons.js";

const ASSET_ID = /^[0-9a-f]{32}$/;

/** Devolve a imagem do presente já validada ({t:"asset",id} ou {t:"icon",k}) ou null. */
export function imageOf(gift) {
  const img = gift && gift.img;
  if (!img) return null;
  if (img.t === "asset" && ASSET_ID.test(String(img.id))) return { t: "asset", id: img.id };
  if (img.t === "icon" && GIFT_ICONS[img.k]) return { t: "icon", k: img.k };
  return null;
}

export const imageUrl = (id) => "/api/images/" + id;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("img"));
    };
    image.src = url;
  });
}

function drawToCanvas(image, maxSide, options) {
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", options);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  return { canvas, ctx, width, height };
}

/** Reduz a imagem para no máximo 900 px e converte para JPEG (o servidor só aceita JPEG de até 1 MB). */
export async function shrinkImage(file) {
  const image = await loadImage(file);
  const { canvas } = drawToCanvas(image, 900);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("img"))), "image/jpeg", 0.82);
  });
}

/** Devolve os pixels da imagem (até 1400 px) para a leitura de QR code. */
export async function imageToPixels(file) {
  const image = await loadImage(file);
  const { ctx, width, height } = drawToCanvas(image, 1400, { willReadFrequently: true });
  return { data: ctx.getImageData(0, 0, width, height).data, width, height };
}
