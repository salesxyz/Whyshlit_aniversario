// Ícones da interface e ícones de presente (escolhidos pelo administrador).

import { svgIcon } from "./dom.js";

const UI_ICONS = {
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  up: '<path d="M6 15l6-6 6 6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  eye: '<path d="M2 12s3.500-7 10-7 10 7 10 7-3.500 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  circle: '<circle cx="12" cy="12" r="8"/>'
};

export function icon(name) {
  return svgIcon(UI_ICONS[name]);
}

/** Ícones disponíveis para presentes: chave → [rótulo, paths]. As chaves também são validadas no servidor. */
export const GIFT_ICONS = {
  gift: ["Presente", '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12M12 8C10 4.500 6.500 5 7.500 7.500c.5 1.200 2.500 1 4.500.5zM12 8c2-3.500 5.500-3 4.500-.5-.5 1.200-2.500 1-4.500.5z"/>'],
  tech: ["Eletrônicos", '<path d="M4 16v-4a8 8 0 0 1 16 0v4"/><rect x="3" y="14" width="4" height="7" rx="1.500"/><rect x="17" y="14" width="4" height="7" rx="1.500"/>'],
  kitchen: ["Cozinha", '<path d="M4 10h16v7a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3zM2 12h2M20 12h2M9 6c0-1.500 1-1.500 1-3M14 6c0-1.500 1-1.500 1-3"/>'],
  home: ["Casa", '<path d="M3 19V7M3 15h18v4M21 15v-3a3 3 0 0 0-3-3h-8v6"/><circle cx="6.500" cy="11.500" r="1.500"/>'],
  book: ["Livros", '<path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2zM4 20a2 2 0 0 1 2-2h13"/>'],
  style: ["Roupas", '<path d="M8 3L3 6l2 4 3-1v12h8V9l3 1 2-4-5-3a4 4 0 0 1-8 0z"/>'],
  trip: ["Viagem", '<path d="M21 3L3 10l7 3 3 7zM10 13L21 3"/>'],
  food: ["Comida", '<path d="M7 3v7M4.500 3v4.500a2.500 2.500 0 0 0 5 0V3M7 10v11M17 21V3c-2.500 1-3 4-3 7 0 1.500 1 2 3 2"/>'],
  cash: ["Dinheiro", '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.500"/><path d="M6 12h.01M18 12h.01"/>']
};

export function giftIcon(key, size) {
  return svgIcon(GIFT_ICONS[key][1], { size, strokeWidth: 1.6 });
}
