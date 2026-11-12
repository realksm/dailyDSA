// Browser storage is a convenience only (unsent drafts, last language, layout); everything works without it.
import type { Lang } from "@dailydsa/shared";

export const store = {
  get(k: string): string | null {
    try { return localStorage.getItem(k); } catch { return null; }
  },
  /** False when the browser refused (storage off, quota full). */
  set(k: string, v: string | null): boolean {
    try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); return true; } catch { return false; }
  },
};

/** The unsent code of one problem in one language (the problem page's editor). */
export const draftKey = (slug: string, lang: Lang) => `dsa.draft.${slug}.${lang}`;
