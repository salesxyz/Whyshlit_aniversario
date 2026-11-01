// Formatação e conversão de valores digitados: dinheiro, datas, links.

import { MAX_PRICE } from "../config.js";

export const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Converte "1.234,56" em 1234.56. Devolve null se estiver vazio e NaN se for inválido. */
export function parseBRL(text) {
  let s = String(text || "").replace(/[^\d.,]/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}

export function isValidPrice(value) {
  return value === null || (!Number.isNaN(value) && value >= 0 && value <= MAX_PRICE);
}

export function priceToInput(price) {
  return price > 0 ? String(price).replace(".", ",") : "";
}

/** Normaliza um link. Devolve "" se vazio, null se inválido, ou a URL completa (http/https). */
export function safeUrl(value) {
  let v = String(value || "").trim();
  if (!v) return "";
  if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) v = "https://" + v;
  try {
    const url = new URL(v);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

export function parseDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
  return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
}

/** Dias até o próximo aniversário (0 = hoje). Null se a data não foi informada. */
export function daysLeft(s, now = new Date()) {
  const p = parseDate(s);
  if (!p) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(today.getFullYear(), p.m - 1, p.d);
  if (next < today) next = new Date(today.getFullYear() + 1, p.m - 1, p.d);
  return Math.round((next - today) / 864e5);
}

/** Tempo até o início do próximo aniversário, em dias, horas e minutos. */
export function birthdayCountdown(s, now = new Date()) {
  const p = parseDate(s);
  if (!p) return null;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(today.getFullYear(), p.m - 1, p.d);
  const isToday = next.getTime() === today.getTime();
  if (next < today) next = new Date(today.getFullYear() + 1, p.m - 1, p.d);
  if (isToday) return { days: 0, hours: 0, minutes: 0, isToday: true };

  const totalMinutes = Math.floor((next - now) / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const remainingMinutes = totalMinutes % 1440;
  return {
    days,
    hours: Math.floor(remainingMinutes / 60),
    minutes: remainingMinutes % 60,
    isToday: false
  };
}

export function formatDate(s) {
  const p = parseDate(s);
  return new Date(p.y, p.m - 1, p.d).toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
}

export function newGiftId() {
  return "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
