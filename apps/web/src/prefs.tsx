// Account preferences (Account page): default language, editor font size, theme. Saved on the server
// (/api/me/settings) so they follow the member; a copy in localStorage lets the first paint use them
// before the request returns. Signed-in pages only; elsewhere usePrefs() gives the defaults.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LANGS, type MeSettings } from "@dailydsa/shared";
import { api } from "./api";
import { store } from "./store";
import { readTheme, saveTheme, type ThemePref } from "./theme";

export type Prefs = Pick<MeSettings, "defaultLang" | "editorFontSize"> & { theme: ThemePref };
export const DEFAULT_FONT = 14;

const KEY = "dsa.prefs";

function cached(): Prefs {
  const base: Prefs = { defaultLang: null, editorFontSize: null, theme: readTheme() };
  try {
    const j = JSON.parse(store.get(KEY) ?? "null") as Partial<Prefs> | null;
    if (!j) return base;
    return {
      defaultLang: (LANGS as readonly string[]).includes(j.defaultLang ?? "") ? j.defaultLang! : null,
      editorFontSize: typeof j.editorFontSize === "number" ? j.editorFontSize : null,
      theme: base.theme,
    };
  } catch {
    return base;
  }
}

type Ctx = { prefs: Prefs; save: (p: Partial<Prefs>) => Promise<void> };
const PrefsCtx = createContext<Ctx>({ prefs: { defaultLang: null, editorFontSize: null, theme: "auto" }, save: async () => {} });

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(cached);
  const cur = useRef(prefs);
  const keep = (p: Prefs) => {
    cur.current = p;
    setPrefs(p);
    saveTheme(p.theme);
    store.set(KEY, JSON.stringify({ defaultLang: p.defaultLang, editorFontSize: p.editorFontSize }));
  };
  // The server's copy wins (another browser may have changed it). An older server without the
  // fields leaves the local choices alone.
  useEffect(() => {
    let live = true;
    api.settings().then((s) => {
      if (!live || !("theme" in s)) return;
      const local = cur.current.theme;
      keep({ defaultLang: s.defaultLang, editorFontSize: s.editorFontSize, theme: s.theme ?? local });
      // Never chosen on the server yet: this browser's choice (from before themes were saved) goes up.
      if (s.theme === null && local !== "auto") api.saveSettings({ theme: local }).catch(() => {});
    }, () => {});
    return () => { live = false; };
  }, []);
  // Applied at once (theme, editor); the request follows. A failed save keeps the local choice and throws.
  const save = useCallback(async (p: Partial<Prefs>) => {
    keep({ ...cur.current, ...p });
    await api.saveSettings(p);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const value = useMemo(() => ({ prefs, save }), [prefs, save]);
  return <PrefsCtx.Provider value={value}>{children}</PrefsCtx.Provider>;
}

export const usePrefs = () => useContext(PrefsCtx);
