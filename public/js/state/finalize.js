// Valida e limpa o rascunho antes de salvar. Função pura: devolve { data } ou { error, focus }.

import { THEMES } from "../config.js";
import { isValidPrice, parseBRL, safeUrl } from "../lib/format.js";
import { imageOf } from "../lib/images.js";
import { pixConfig } from "../lib/pix.js";

export function finalizeDraft(draft) {
  const d = structuredClone(draft);
  d.honoree = String(d.honoree || "").trim();
  d.message = String(d.message || "").trim();
  d.siteTitle = String(d.siteTitle || "Whylist").trim() || "Whylist";
  if (!THEMES.some(([value]) => value === d.theme)) d.theme = "system";
  d.pix.key = String(d.pix.key || "").trim();
  d.pix.name = String(d.pix.name || "").trim();
  d.pix.city = String(d.pix.city || "").trim();

  if (d.pix.key) {
    const config = pixConfig(d.pix, d.honoree);
    if (!config.ok) return { error: config.msg, focus: "#f-key" };
  }

  for (const gift of d.gifts) {
    gift.name = String(gift.name || "").trim();
    if (!gift.name) return { error: "Todo presente precisa de um nome.", focus: "#n-" + gift.id };

    if (gift._pt !== undefined) {
      const price = parseBRL(gift._pt);
      if (!isValidPrice(price)) return { error: "Valor inválido em " + gift.name + ".", focus: "#p-" + gift.id };
      gift.price = price || 0;
      delete gift._pt;
    }

    const link = safeUrl(gift.link);
    if (link === null) return { error: "Link inválido em " + gift.name + ".", focus: "#l-" + gift.id };
    gift.link = link;
    gift.note = String(gift.note || "").trim();
    delete gift.given;
    if (gift.img && !imageOf(gift)) delete gift.img;
  }
  return { data: d };
}
