"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

// Os módulos do navegador são ES modules; import() dinâmico os carrega a partir do CommonJS.
const loadPix = () => import("../public/js/lib/pix.js");
const loadFormat = () => import("../public/js/lib/format.js");
const loadConfig = () => import("../public/js/config.js");

const KEYS = [
  ["cpf", "123.456.789-09", "12345678909"],
  ["cnpj", "12.345.678/0001-95", "12345678000195"],
  ["phone", "(61) 99999-0000", "+5561999990000"],
  ["email", "Fulano@Exemplo.com", "fulano@exemplo.com"],
  ["random", "123E4567-E89B-12D3-A456-426614174000", "123e4567-e89b-12d3-a456-426614174000"]
];

test("crc16 confere com o valor padrão CCITT-FALSE", async () => {
  const { crc16 } = await loadPix();
  assert.equal(crc16("123456789"), "29B1");
});

test("mínimo de Pix é R$ 99,99 sem alterar o mínimo do cartão", async () => {
  const { MIN_PIX_AMOUNT, MIN_CARD_CONTRIBUTION } = await loadConfig();
  assert.equal(MIN_PIX_AMOUNT, 99.99);
  assert.equal(MIN_CARD_CONTRIBUTION, 149.90);
});

test("buildPix gera um código com CRC válido e valor opcional", async () => {
  const { buildPix, crc16, pixConfig } = await loadPix();
  const config = pixConfig({ type: "phone", key: "(61) 99999-0000", name: "João da Silva", city: "Brasília" }, "");
  assert.deepEqual(config, { ok: true, key: "+5561999990000", name: "JOAO DA SILVA", city: "BRASILIA" });
  for (const amount of [0, 280, 12.5]) {
    const code = buildPix(config, amount);
    assert.equal(crc16(code.slice(0, -4)), code.slice(-4));
    assert.equal(code.includes("540" + (amount ? String(amount.toFixed(2)).length : "")), amount > 0);
  }
});

test("readPix devolve a mesma chave, nome e cidade usados para gerar o código", async () => {
  const { buildPix, pixConfig, readPix } = await loadPix();
  for (const [type, raw, normalized] of KEYS) {
    const config = pixConfig({ type, key: raw, name: "Maria da Silva", city: "Brasília" }, "");
    const result = readPix(buildPix(config, type === "cpf" ? 50 : 0));
    assert.equal(result.ok, true, type);
    assert.equal(result.type, type);
    assert.equal(result.key, normalized);
    assert.equal(result.name, "MARIA DA SILVA");
    assert.equal(result.city, "BRASILIA");
  }
});

test("readPix rejeita texto qualquer e códigos alterados", async () => {
  const { buildPix, pixConfig, readPix } = await loadPix();
  assert.match(readPix("abc").msg, /000201/);
  const config = pixConfig({ type: "cpf", key: "12345678909", name: "Ana", city: "X" }, "");
  const altered = buildPix(config, 0).replace("ANA", "ANO");
  assert.match(readPix(altered).msg, /incompleto ou foi alterado/);
});

test("normalizeKey explica o erro de cada tipo", async () => {
  const { normalizeKey } = await loadPix();
  assert.equal(normalizeKey("cpf", "123").ok, false);
  assert.equal(normalizeKey("phone", "123").ok, false);
  assert.equal(normalizeKey("email", "sem-arroba").ok, false);
  assert.equal(normalizeKey("random", "xyz").ok, false);
  assert.equal(normalizeKey("cpf", "").msg, "Informe a chave Pix.");
});

test("parseBRL e safeUrl", async () => {
  const { parseBRL, safeUrl, daysLeft } = await loadFormat();
  assert.equal(parseBRL("1.234,56"), 1234.56);
  assert.equal(parseBRL("1.500"), 1500);
  assert.equal(parseBRL("20"), 20);
  assert.equal(parseBRL(""), null);
  assert.ok(Number.isNaN(parseBRL("1,2,3x,.,")) || typeof parseBRL("1,2,3x,.,") === "number");
  assert.equal(safeUrl(""), "");
  assert.equal(safeUrl("exemplo.com/p"), "https://exemplo.com/p");
  assert.equal(safeUrl("javascript:alert(1)"), null);
  assert.equal(daysLeft("2026-12-25", new Date(2026, 11, 24)), 1);
  assert.equal(daysLeft("2026-12-25", new Date(2026, 11, 25)), 0);
  assert.equal(daysLeft("2026-01-10", new Date(2026, 11, 25)), 16);
});

test("birthdayCountdown calcula dias, horas e minutos até o aniversário", async () => {
  const { birthdayCountdown } = await loadFormat();
  assert.deepEqual(
    birthdayCountdown("2026-01-02", new Date(2026, 0, 1, 12, 34)),
    { days: 0, hours: 11, minutes: 26, isToday: false }
  );
  assert.deepEqual(
    birthdayCountdown("2026-01-01", new Date(2026, 0, 1, 12, 34)),
    { days: 0, hours: 0, minutes: 0, isToday: true }
  );
  assert.equal(birthdayCountdown("", new Date()), null);
});
