"use strict";

const SELECT_STATE = "whylist_state?id=eq.1&select=state";
const SELECT_MESSAGES = "whylist_messages?select=id,sender_name,message,created_at&order=created_at.desc&limit=";

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

  async function addMessage(message) {
    await supabase.insertRow("whylist_messages", message);
  }

  async function listMessages(limit) {
    return supabase.selectRows(SELECT_MESSAGES + limit);
  }

  return { kind: "supabase", load, save, addMessage, listMessages };
}

module.exports = { createSupabaseStore };
