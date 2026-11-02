// Título da aba e tema (claro, escuro ou automático) definidos nas configurações do site.

export function applySiteSettings(state, themeOverride = null) {
  const theme = ["light", "dark"].includes(themeOverride)
    ? themeOverride
    : ["light", "dark", "system"].includes(state.theme) ? state.theme : "system";
  if (theme === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", theme);
  document.title = String(state.siteTitle || "Whylist");
}
