// Cabeçalho: nome, data, mensagem e contagem regressiva.

import { h } from "../lib/dom.js";
import { birthdayCountdown, formatDate, parseDate } from "../lib/format.js";

let countdownTimer;

export function hero(state) {
  clearInterval(countdownTimer);
  countdownTimer = null;
  const countdown = birthdayCountdown(state.date);
  let count = null;
  if (countdown) {
    const big = h("strong", { class: "big" });
    const caption = h("span");
    const updateCountdown = () => {
      const current = birthdayCountdown(state.date);
      if (!current) return;
      big.textContent = current.isToday ? "Hoje" : String(current.days);
      caption.textContent = current.isToday
        ? "é dia de festa"
        : (current.days === 1 ? "dia" : "dias") + " · " +
          String(current.hours).padStart(2, "0") + "h " +
          String(current.minutes).padStart(2, "0") + "min para o aniversário";
    };
    updateCountdown();
    count = h("div", { class: "count" }, big, caption);
    countdownTimer = setInterval(() => {
      if (!count.isConnected) {
        clearInterval(countdownTimer);
        countdownTimer = null;
        return;
      }
      updateCountdown();
    }, 60000);
  }
  return h("header", { class: "hero" },
    h("div", { class: "hero-main" },
      h("p", { class: "eyebrow", text: "1.8 do Victor - Momento de celebração e lembrança" }),
      h("h1", null, " Dezoitou do ", h("span", { class: "who", text: state.honoree || "Aniversariante" })),
      state.date && parseDate(state.date) ? h("p", { class: "when", text: formatDate(state.date) }) : null,
      state.message ? h("p", { class: "msg", text: state.message }) : null),
    count);
}
