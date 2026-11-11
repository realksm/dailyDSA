// Light / dark: follows the OS unless the person picked one (top bar toggle). The choice is a per-browser
// convenience in localStorage; the CSS tokens honour html[data-theme] (styles.css), and so does Monaco.
export type ThemePref = "auto" | "light" | "dark";

const KEY = "dsa.theme";

export function readTheme(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "auto";
  } catch {
    return "auto";
  }
}

export function applyTheme(t: ThemePref) {
  if (t === "auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
}

export function saveTheme(t: ThemePref) {
  applyTheme(t);
  try {
    if (t === "auto") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, t);
  } catch { /* private mode: the choice lasts until reload */ }
}
