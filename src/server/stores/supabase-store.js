"use strict";

const SELECT_STATE = "whylist_state?id=eq.1&select=state";

/** Armazenamento da lista na tabela `whylist_state` do Supabase (uma única linha, id = 1). */
function createSupabaseStore({ supabase, defaultState }) {
  async function readRow() {
    const rows = await supabase.selectRows(SELECT_STATE);
    return rows.length ? rows[0].state : null;
  }

  async function load() {
    const existing = await readRow();
    if (existing) return existing;

    // Primeiro acesso: grava a lista inicial sem sobrescrever uma gravação concorrente.
    await supabase.upsertRow("whylist_state", { id: 1, state: defaultState }, "ignore-duplicates");
    const initialized = await readRow();
    if (!initialized) throw new Error("Não foi possível inicializar o estado no Supabase.");
    return initialized;
  }

  async function save(state) {
    await supabase.upsertRow(
      "whylist_state",
      { id: 1, state, updated_at: new Date().toISOString() },
      "merge-duplicates"
    );
  }

  return { kind: "supabase", load, save };
}

module.exports = { createSupabaseStore };
