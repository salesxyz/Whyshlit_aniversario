"use strict";

const ICONS = new Set(["gift", "tech", "kitchen", "home", "book", "style", "trip", "food", "cash"]);
const PIX_TYPES = new Set(["cpf", "cnpj", "phone", "email", "random"]);
const THEMES = new Set(["system", "light", "dark"]);
const IMAGE_ID = /^[0-9a-f]{32}$/;
const GIFT_ID = /^[A-Za-z0-9_-]{1,100}$/;
/** Identificador reservado para a contribuição de valor livre (não é um presente da lista). */
const CONTRIBUTION_ID = "__whylist_contribution__";
const MAX_GIFTS = 200;
const MAX_PRICE = 999999.99;

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validString(value, maxLength, optional) {
  return (optional && value === undefined) || (typeof value === "string" && value.length <= maxLength);
}

function validDate(value) {
  if (!value) return true;
  const date = new Date(value + "T00:00:00Z");
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateSite(state) {
  if (!validString(state.siteTitle, 60, true) || !validString(state.theme, 10, true) ||
      !validString(state.honoree, 40, false) || !validString(state.date, 10, false) ||
      !validString(state.message, 280, false)) return "Revise os campos de configuração do site.";
  if (state.theme !== undefined && !THEMES.has(state.theme)) return "Tema inválido.";
  if (!validDate(state.date)) return "Data inválida.";
  return "";
}

function validatePix(pix) {
  if (!isPlainObject(pix) || !PIX_TYPES.has(pix.type) || !validString(pix.key, 200, false) ||
      !validString(pix.name, 25, false) || !validString(pix.city, 15, false)) {
    return "Configuração do Pix inválida.";
  }
  return "";
}

function validateImage(img) {
  if (img === undefined) return "";
  const ok = isPlainObject(img) &&
    ((img.t === "icon" && ICONS.has(img.k)) || (img.t === "asset" && IMAGE_ID.test(String(img.id))));
  return ok ? "" : "Imagem de presente inválida.";
}

function validateGift(gift) {
  if (!isPlainObject(gift) || !validString(gift.id, 100, false) || !GIFT_ID.test(gift.id) ||
      gift.id === CONTRIBUTION_ID || !validString(gift.name, 80, false) || !gift.name.trim() ||
      !validString(gift.note, 140, true) || !validString(gift.link, 2048, true) ||
      typeof gift.price !== "number" || !Number.isFinite(gift.price) ||
      gift.price < 0 || gift.price > MAX_PRICE) {
    return "Revise os dados dos presentes.";
  }
  if (gift.link) {
    try {
      if (!["http:", "https:"].includes(new URL(gift.link).protocol)) return "Os links precisam usar HTTP ou HTTPS.";
    } catch {
      return "Há um link inválido na lista.";
    }
  }
  return validateImage(gift.img);
}

/** Devolve uma mensagem de erro em português, ou "" quando a configuração é válida. */
function validateState(state) {
  if (!isPlainObject(state)) return "Configuração inválida.";
  const siteError = validateSite(state);
  if (siteError) return siteError;
  const pixError = validatePix(state.pix);
  if (pixError) return pixError;
  if (!Array.isArray(state.gifts) || state.gifts.length > MAX_GIFTS) {
    return "A lista pode ter no máximo " + MAX_GIFTS + " presentes.";
  }
  const ids = new Set();
  for (const gift of state.gifts) {
    const giftError = validateGift(gift);
    if (giftError) return giftError;
    if (ids.has(gift.id)) return "Cada presente precisa ter um identificador único.";
    ids.add(gift.id);
  }
  return "";
}

module.exports = { validateState, CONTRIBUTION_ID, IMAGE_ID, MAX_PRICE };
