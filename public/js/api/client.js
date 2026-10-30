// Chamadas ao servidor. Todas devolvem o JSON da resposta ou lançam ApiError com mensagem em português.

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const JSON_HEADERS = { "Content-Type": "application/json" };

async function request(path, options, fallbackMessage) {
  let response;
  try {
    response = await fetch(path, options);
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor.", 0);
  }
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok) throw new ApiError((body && body.error) || fallbackMessage, response.status);
  return body;
}

/**
 * Descobre se há um servidor com API.
 * Devolve { backend: false } (site estático), { backend: true, status } ou { backend: true, error }.
 */
export async function detectBackend() {
  if (location.protocol === "file:") return { backend: false };
  let response;
  try {
    response = await fetch("/api/status");
  } catch {
    return { backend: false };
  }
  if (response.status === 404) return { backend: false };
  if (!response.ok) return { backend: true, error: "O servidor não conseguiu verificar a sessão administrativa." };
  try {
    const status = await response.json();
    return status && status.backend === true ? { backend: true, status } : { backend: false };
  } catch {
    return { backend: false };
  }
}

export const api = {
  state: () => request("/api/state", undefined, "Não foi possível carregar a lista do servidor."),

  defaultState: () => request("default-state.json", undefined, "Não foi possível carregar a lista inicial."),

  login: (password) =>
    request("/api/admin/login", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ password }) },
      "Não foi possível entrar."),

  logout: () => request("/api/admin/logout", { method: "POST" }, "Não foi possível sair."),

  saveState: (state) =>
    request("/api/admin/state", { method: "PUT", headers: JSON_HEADERS, body: JSON.stringify(state) },
      "Não foi possível salvar."),

  uploadImage: (blob) =>
    request("/api/images", { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: blob },
      "Não foi possível enviar a imagem."),

  checkout: (giftId, amount) =>
    request("/api/payments/checkout",
      { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ giftId, amount }) },
      "Não foi possível iniciar o pagamento.")
};
