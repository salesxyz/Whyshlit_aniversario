"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { validateState, CONTRIBUTION_ID } = require("../src/server/validation");

function valid() {
  return {
    siteTitle: "Whylist",
    theme: "system",
    honoree: "Ana",
    date: "2026-12-25",
    message: "",
    pix: { type: "cpf", key: "12345678909", name: "Ana", city: "Brasilia" },
    gifts: [
      { id: "g1", name: "Fone", price: 10, note: "", link: "https://exemplo.com", img: { t: "icon", k: "tech" } },
      { id: "g2", name: "Livro", price: 0 }
    ]
  };
}

test("aceita uma lista válida", () => {
  assert.equal(validateState(valid()), "");
});

test("rejeita estados que não são objetos", () => {
  for (const value of [null, [], "x", 1]) assert.equal(validateState(value), "Configuração inválida.");
});

test("valida site, data e tema", () => {
  assert.equal(validateState({ ...valid(), theme: "azul" }), "Tema inválido.");
  assert.equal(validateState({ ...valid(), date: "2026-02-31" }), "Data inválida.");
  assert.equal(validateState({ ...valid(), honoree: "x".repeat(41) }), "Revise os campos de configuração do site.");
  assert.equal(validateState({ ...valid(), date: "" }), "");
});

test("valida o Pix", () => {
  assert.equal(validateState({ ...valid(), pix: { ...valid().pix, type: "outro" } }), "Configuração do Pix inválida.");
  assert.equal(validateState({ ...valid(), pix: { ...valid().pix, name: "x".repeat(26) } }), "Configuração do Pix inválida.");
});

test("valida os presentes", () => {
  const withGift = (gift) => ({ ...valid(), gifts: [{ id: "g1", name: "A", price: 1, ...gift }] });
  assert.equal(validateState(withGift({ id: CONTRIBUTION_ID })), "Revise os dados dos presentes.");
  assert.equal(validateState(withGift({ id: "tem espaço" })), "Revise os dados dos presentes.");
  assert.equal(validateState(withGift({ name: "   " })), "Revise os dados dos presentes.");
  assert.equal(validateState(withGift({ price: -1 })), "Revise os dados dos presentes.");
  assert.equal(validateState(withGift({ price: 1000000 })), "Revise os dados dos presentes.");
  assert.equal(validateState(withGift({ link: "javascript:alert(1)" })), "Os links precisam usar HTTP ou HTTPS.");
  assert.equal(validateState(withGift({ link: "nao é url" })), "Há um link inválido na lista.");
  assert.equal(validateState(withGift({ img: { t: "icon", k: "foguete" } })), "Imagem de presente inválida.");
  assert.equal(validateState(withGift({ img: { t: "asset", id: "abc" } })), "Imagem de presente inválida.");
  assert.equal(validateState(withGift({ img: { t: "asset", id: "a".repeat(32) } })), "");
});

test("rejeita ids repetidos e listas grandes demais", () => {
  const repeated = valid();
  repeated.gifts[1].id = "g1";
  assert.equal(validateState(repeated), "Cada presente precisa ter um identificador único.");
  const many = valid();
  many.gifts = Array.from({ length: 201 }, (_, i) => ({ id: "g" + i, name: "x", price: 0 }));
  assert.match(validateState(many), /no máximo 200/);
});
