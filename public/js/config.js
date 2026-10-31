// Constantes compartilhadas pelo frontend.

export const MAX_PRICE = 999999.99;
export const MIN_CONTRIBUTION = 50;
export const CONTRIBUTION_ID = "__whylist_contribution__";
export const LOCAL_STORAGE_KEY = "whylist-state-v1";

export const PIX_TYPES = [
  ["cpf", "CPF"],
  ["cnpj", "CNPJ"],
  ["phone", "Celular"],
  ["email", "E-mail"],
  ["random", "Chave aleatória"]
];

export const PIX_KEY_EXAMPLES = {
  cpf: "000.000.000-00",
  cnpj: "00.000.000/0000-00",
  phone: "(61) 99999-0000",
  email: "voce@exemplo.com.br",
  random: "123e4567-e89b-12d3-a456-426614174000"
};

export const THEMES = [
  ["system", "Automático (sistema)"],
  ["light", "Claro"],
  ["dark", "Escuro"]
];
