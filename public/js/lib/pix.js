// Pix: chave, "copia e cola" (BR Code) e leitura de um código existente. Sem dependência do navegador.

function tlv(id, value) {
  return id + ("0" + value.length).slice(-2) + value;
}

/** CRC16/CCITT-FALSE, exigido ao final do BR Code. */
export function crc16(text) {
  let crc = 0xffff;
  for (let i = 0; i < text.length; i++) {
    crc ^= text.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return ("000" + crc.toString(16).toUpperCase()).slice(-4);
}

/** Texto aceito no BR Code: sem acento, só letras, números e espaço, em maiúsculas. */
export function toPixText(text, max) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .slice(0, max)
    .trim();
}

const RANDOM_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Valida e normaliza a chave conforme o tipo. Devolve { ok, value } ou { ok: false, msg }. */
export function normalizeKey(type, raw) {
  const v = String(raw || "").trim();
  if (!v) return { ok: false, msg: "Informe a chave Pix." };

  if (type === "cpf" || type === "cnpj") {
    const digits = v.replace(/\D/g, "");
    const size = type === "cpf" ? 11 : 14;
    if (digits.length !== size) {
      return { ok: false, msg: (type === "cpf" ? "O CPF" : "O CNPJ") + " precisa ter " + size + " números." };
    }
    return { ok: true, value: digits };
  }
  if (type === "phone") {
    const cleaned = v.replace(/[^\d+]/g, "");
    const digits = cleaned.replace(/\D/g, "");
    let out;
    if (cleaned.startsWith("+")) out = "+" + digits;
    else if (digits.length >= 12 && digits.startsWith("55")) out = "+" + digits;
    else out = "+55" + digits;
    if (!/^\+55\d{10,11}$/.test(out)) {
      return { ok: false, msg: "Use o celular com DDD, por exemplo (61) 99999-0000." };
    }
    return { ok: true, value: out };
  }
  if (type === "email") {
    const email = v.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 77) return { ok: false, msg: "E-mail inválido." };
    return { ok: true, value: email };
  }
  const random = v.toLowerCase();
  if (!RANDOM_KEY.test(random)) return { ok: false, msg: "A chave aleatória tem o formato 8-4-4-4-12 caracteres." };
  return { ok: true, value: random };
}

/** Dados prontos para gerar o código: { ok, key, name, city } ou { ok: false, msg }. */
export function pixConfig(pix, honoree) {
  const p = pix || {};
  const key = normalizeKey(p.type || "cpf", p.key);
  if (!key.ok) return { ok: false, msg: key.msg };
  const name = toPixText(p.name || honoree, 25);
  if (!name) return { ok: false, msg: "Informe o nome do recebedor." };
  return { ok: true, key: key.value, name, city: toPixText(p.city, 15) || "BRASIL" };
}

/** Monta o Pix copia e cola. Com valor 0 (ou omitido), quem paga escolhe o valor. */
export function buildPix(config, amount = 0) {
  const account = tlv("00", "BR.GOV.BCB.PIX") + tlv("01", config.key);
  let s = tlv("00", "01") + tlv("01", "11") + tlv("26", account) + tlv("52", "0000") + tlv("53", "986");
  if (amount > 0) s += tlv("54", amount.toFixed(2));
  s += tlv("58", "BR") + tlv("59", config.name) + tlv("60", config.city) + tlv("62", tlv("05", "***")) + "6304";
  return s + crc16(s);
}

function parseTlv(s) {
  const out = {};
  let i = 0;
  while (i < s.length) {
    if (i + 4 > s.length) return null;
    const length = parseInt(s.substr(i + 2, 2), 10);
    if (Number.isNaN(length) || i + 4 + length > s.length) return null;
    out[s.substr(i, 2)] = s.substr(i + 4, length);
    i += 4 + length;
  }
  return out;
}

function detectKeyType(key) {
  if (key.includes("@")) return "email";
  if (/^\+\d{10,15}$/.test(key)) return "phone";
  if (RANDOM_KEY.test(key.toLowerCase())) return "random";
  if (/^\d{14}$/.test(key)) return "cnpj";
  if (/^\d{11}$/.test(key)) return "cpf";
  return null;
}

/** Lê um Pix copia e cola e extrai tipo, chave, nome e cidade. */
export function readPix(text) {
  const t = String(text || "").replace(/[\r\n]+/g, "").trim();
  if (!t.startsWith("000201")) return { ok: false, msg: "Isso não parece um código Pix. Ele começa com 000201." };
  if (t.length < 12 || crc16(t.slice(0, -4)) !== t.slice(-4).toUpperCase()) {
    return { ok: false, msg: "O código Pix está incompleto ou foi alterado. Copie o código inteiro de novo." };
  }
  const top = parseTlv(t.slice(0, -8));
  if (!top) return { ok: false, msg: "Não consegui ler esse código Pix." };

  let account = null;
  for (let id = 26; id <= 51 && !account; id++) {
    const sub = top[("0" + id).slice(-2)] && parseTlv(top[("0" + id).slice(-2)]);
    if (sub && /^br\.gov\.bcb\.pix$/i.test(sub["00"] || "")) account = sub;
  }
  if (!account) return { ok: false, msg: "Não encontrei uma chave Pix neste código." };
  if (!account["01"]) {
    return {
      ok: false,
      msg: account["25"]
        ? "Este QR code é de uma cobrança, sem chave dentro. Use o QR code da sua chave Pix no app do banco."
        : "Não encontrei uma chave Pix neste código."
    };
  }
  const key = account["01"];
  const type = detectKeyType(key);
  if (!type) return { ok: false, msg: "Não reconheci o tipo dessa chave Pix." };
  return {
    ok: true,
    type,
    key: type === "email" || type === "random" ? key.toLowerCase() : key,
    name: top["59"] || "",
    city: top["60"] || ""
  };
}
