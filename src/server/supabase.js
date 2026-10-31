"use strict";

const { HttpError } = require("./http");

const REQUEST_TIMEOUT_MS = 10000;

/** Cliente mínimo da API REST e do Storage do Supabase (usa a chave service_role, só no servidor). */
function createSupabase(config) {
  const { url, serviceKey, bucket, enabled } = config.supabase;

  function assertConfigured() {
    if (!enabled) {
      throw new HttpError(503, "Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no servidor.");
    }
    try {
      const parsed = new URL(url);
      const local = ["localhost", "127.0.0.1"].includes(parsed.hostname);
      if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && local)) {
        throw new Error("URL não segura.");
      }
    } catch {
      throw new HttpError(503, "SUPABASE_URL inválida. Use HTTPS (ou HTTP apenas para localhost).");
    }
  }

  async function request(route, { headers, ...options } = {}) {
    assertConfigured();
    const response = await fetch(url + route, {
      ...options,
      headers: {
        apikey: serviceKey,
        Authorization: "Bearer " + serviceKey,
        Accept: "application/json",
        ...(headers || {})
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    if (!response.ok) {
      throw new Error("Falha na requisição ao Supabase (HTTP " + response.status + ").");
    }
    return response;
  }

  /** Grava ou atualiza uma linha da tabela via REST (upsert por id). */
  async function upsertRow(table, row, resolution) {
    await request("/rest/v1/" + table + "?on_conflict=id", {
      method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "resolution=" + resolution + ",return=minimal" },
      body: JSON.stringify(row)
    });
  }

  async function insertRow(table, row) {
    await request("/rest/v1/" + table, {
      method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(row)
    });
  }

  async function selectRows(query) {
    const response = await request("/rest/v1/" + query);
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error("Resposta inválida do Supabase.");
    return rows;
  }

  async function uploadObject(name, body, contentType) {
    const response = await request("/storage/v1/object/" + encodeURIComponent(bucket) + "/" + name, {
      method: "POST",
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "x-upsert": "false"
      },
      body
    });
    await response.arrayBuffer();
  }

  function publicObjectUrl(name) {
    return url + "/storage/v1/object/public/" + encodeURIComponent(bucket) + "/" + name;
  }

  return { assertConfigured, upsertRow, insertRow, selectRows, uploadObject, publicObjectUrl };
}

module.exports = { createSupabase };
