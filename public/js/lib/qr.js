// QR code: desenho (biblioteca qrcode-generator) e leitura (jsQR). Ambas vêm de CDN em index.html.

import { svgElement } from "./dom.js";
import { imageToPixels } from "./images.js";

/** Desenha o QR code como SVG, ou devolve null se a biblioteca não carregou. */
export function qrSvg(text) {
  if (typeof globalThis.qrcode !== "function") return null;
  try {
    const qr = globalThis.qrcode(0, "M");
    qr.addData(text);
    qr.make();
    const count = qr.getModuleCount();
    const margin = 4;
    const size = count + margin * 2;
    let path = "";
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (qr.isDark(row, col)) path += "M" + (col + margin) + " " + (row + margin) + "h1v1h-1z";
      }
    }
    const svg = svgElement("svg", {
      viewBox: "0 0 " + size + " " + size,
      role: "img",
      "aria-label": "QR code Pix",
      "shape-rendering": "crispEdges"
    });
    svg.append(
      svgElement("rect", { width: size, height: size, fill: "#ffffff" }),
      svgElement("path", { d: path, fill: "#000000" })
    );
    return svg;
  } catch {
    return null;
  }
}

/** Lê o texto de um QR code numa imagem. Rejeita com Error("lib" | "noqr" | "img"). */
export async function decodeQr(file) {
  if (typeof globalThis.jsQR !== "function") throw new Error("lib");
  const { data, width, height } = await imageToPixels(file);
  const result = globalThis.jsQR(data, width, height, { inversionAttempts: "attemptBoth" });
  if (!result || !result.data) throw new Error("noqr");
  return result.data;
}
