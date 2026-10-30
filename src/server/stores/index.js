"use strict";

const { createFileStore } = require("./file-store");
const { createSupabaseStore } = require("./supabase-store");

/**
 * Escolhe onde a lista fica guardada: Supabase quando configurado; arquivo local caso contrário.
 * Na Vercel o disco é temporário, então o Supabase passa a ser obrigatório.
 */
function createStateStore({ config, supabase, defaultState }) {
  const inner = config.supabase.enabled
    ? createSupabaseStore({ supabase, defaultState })
    : createFileStore({ dataDir: config.dataDir, defaultState });

  function guard() {
    if (config.isVercel && !config.supabase.enabled) supabase.assertConfigured();
  }

  return {
    kind: inner.kind,
    async load() {
      guard();
      return inner.load();
    },
    async save(state) {
      guard();
      return inner.save(state);
    }
  };
}

module.exports = { createStateStore };
