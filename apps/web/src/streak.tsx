// The streak chip in the top bar: a lime square and the number of days, on every signed-in page.
// Loaded from GET /api/me/streak; asked again after an Accepted (Problem page), at IST midnight,
// and when the tab comes back into view (solved on another device).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { MeStreak } from "@dailydsa/shared";
import { api } from "./api";
import { Link } from "./router";

interface StreakState {
  streak: MeStreak | null;
  /** Ask the server again (cheap). */
  refresh: () => void;
}

const StreakCtx = createContext<StreakState>({ streak: null, refresh: () => {} });

export function useStreak(): StreakState {
  return useContext(StreakCtx);
}

export function StreakProvider({ children }: { children: ReactNode }) {
  const [streak, setStreak] = useState<MeStreak | null>(null);
  const seq = useRef(0);
  const refresh = useCallback(() => {
    const n = ++seq.current;
    // A failure (e.g. an older server without the route) just leaves the chip as it was, or hidden.
    api.streak().then((s) => n === seq.current && setStreak(s), () => {});
  }, []);

  useEffect(refresh, [refresh]);

  // At IST midnight a streak can end (yesterday unsolved) or today's square empties.
  const rollover = streak?.nextRolloverAt;
  useEffect(() => {
    if (!rollover) return;
    const ms = Date.parse(rollover) - Date.now() + 2000; // the server picks ~2 s after midnight
    if (ms > 2 ** 31 - 1) return;
    const id = setTimeout(refresh, Math.max(ms, 0));
    return () => clearTimeout(id);
  }, [rollover, refresh]);

  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  const value = useMemo(() => ({ streak, refresh }), [streak, refresh]);
  return <StreakCtx.Provider value={value}>{children}</StreakCtx.Provider>;
}

/** What the chip says to screen readers and on hover. */
export function streakLabel(s: MeStreak): string {
  const n = `${s.days}-day streak`;
  if (s.todayDone) return `${n}, today's problem solved`;
  if (s.days > 0) return `${n}. Solve today's problem by midnight IST to keep it`;
  return "No streak yet. Solve today's problem to start one";
}

/** Lime square (filled once today's problem is solved) + the day count; links to Today. */
export function StreakChip() {
  const { streak } = useStreak();
  // Pop the square when the count goes up while the page is open (the Accepted moment), not on load.
  const prev = useRef<number | null>(null);
  const [pop, setPop] = useState(0);
  useEffect(() => {
    if (!streak) return;
    if (prev.current !== null && streak.days > prev.current) setPop((p) => p + 1);
    prev.current = streak.days;
  }, [streak]);

  if (!streak) return null;
  const state = streak.todayDone ? "done" : streak.days > 0 ? "open" : "none";
  const label = streakLabel(streak);
  return (
    <Link to="/" className="streak-chip" data-s={state} aria-label={label} title={label}>
      <span key={pop} className="streak-sq" data-pop={pop > 0 || undefined} aria-hidden />
      <span className="num">{streak.days}</span>
    </Link>
  );
}
