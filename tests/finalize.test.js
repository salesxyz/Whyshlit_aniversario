"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const loadFinalize = () => import("../public/js/state/finalize.js");

function draft(overrides) {
  return {
    siteTitle: " Whylist ",
    theme: "azul",
    honoree: " Ana ",
    date: "2026-12-25",
    message: "",
    pix: { type: "cpf", key: "123.456.789-09", name: "", city: "" },
    gifts: [{ id: "g1", name: " Fone ", price: 10, note: " nota ", link: "exemplo.com", given: true, _pt: "1.200,50" }],
    ...overrides
  };
}

test("finalizeDraft limpa textos, converte o preço digitado e remove campos antigos", async () => {
  const { finalizeDraft } = await loadFinalize();
  const { data, error } = finalizeDraft(draft());
  assert.equal(error, undefined);
  assert.equal(data.siteTitle, "Whylist");
  assert.equal(data.theme, "system");
  assert.equal(data.honoree, "Ana");
  const gift = data.gifts[0];
  assert.equal(gift.name, "Fone");
  assert.equal(gift.price, 1200.5);
  assert.equal(gift.link, "https://exemplo.com/");
  assert.equal(gift.note, "nota");
  assert.equal("given" in gift, false);
  assert.equal("_pt" in gift, false);
});

test("finalizeDraft aponta o campo com problema", async () => {
  const { finalizeDraft } = await loadFinalize();
  assert.deepEqual(finalizeDraft(draft({ pix: { type: "cpf", key: "123", name: "", city: "" } })).focus, "#f-key");
  const noName = draft();
  noName.gifts[0].name = "  ";
  assert.equal(finalizeDraft(noName).focus, "#n-g1");
  const badLink = draft();
  badLink.gifts[0].link = "javascript:alert(1)";
  assert.equal(finalizeDraft(badLink).focus, "#l-g1");
  const badPrice = draft();
  badPrice.gifts[0]._pt = "abc,";
  assert.equal(finalizeDraft(badPrice).focus, "#p-g1");
});

test("finalizeDraft não altera o rascunho original", async () => {
  const { finalizeDraft } = await loadFinalize();
  const original = draft();
  finalizeDraft(original);
  assert.equal(original.gifts[0]._pt, "1.200,50");
  assert.equal(original.honoree, " Ana ");
});
