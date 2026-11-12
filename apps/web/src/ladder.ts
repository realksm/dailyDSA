// What to do next on a track's ladder. Today and the Tracks page both use this, so they always
// point at the same rung.
import type { LadderStep, TrackSummary } from "@dailydsa/shared";
import { fmtDay } from "./format";

/** 0 = Monday … 6 = Sunday, for an IST `YYYY-MM-DD`. */
export const dowOf = (day: string) => (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;

/** The ladder problem to do next: today's, else the first open one not solved yet. */
export function ladderNext(t: TrackSummary, today: string): { step: LadderStep; label: string } | null {
  const dow = dowOf(today);
  const todays = dow < 5 ? t.ladder.find((s) => s.position === dow + 1 && s.open && s.problem) : undefined;
  if (todays && todays.status !== "solved") return { step: todays, label: `Ladder ${todays.position}: ${todays.problem!.title}` };
  const next = t.ladder.find((s) => s.open && s.problem && s.status !== "solved");
  return next ? { step: next, label: `Catch up: ladder ${next.position}` } : null;
}

export type TrackAction =
  /** Nothing tried yet and there is a lesson: read it first. */
  | { kind: "lesson"; label: string; to: string; next: LadderStep | null }
  /** Go to the next rung (`next` is the rung to mark in the mini ladder). */
  | { kind: "rung"; label: string; to: string; next: LadderStep }
  /** Every open rung is solved; the next one is still locked. */
  | { kind: "caught-up"; label: string; next: null }
  | { kind: "done"; label: string; next: null };

/** The one action on this week's track card. */
export function trackAction(t: TrackSummary, today: string): TrackAction {
  if (t.ladder.length > 0 && t.solved >= t.ladder.length) return { kind: "done", label: "Ladder done", next: null };
  const n = ladderNext(t, today)?.step ?? null;
  const started = t.ladder.some((s) => s.status !== "new");
  if (!started && t.hasLesson) return { kind: "lesson", label: "Read the lesson", to: `/tracks/${t.pattern.slug}`, next: n };
  if (n?.problem) {
    const verb = started ? "Continue" : "Start";
    return { kind: "rung", label: `${verb}: Ladder ${n.position} · ${n.problem.title}`, to: `/p/${n.problem.slug}`, next: n };
  }
  const locked = t.ladder.find((s) => !s.open);
  const when = locked?.opensOn ? ` · Ladder ${locked.position} opens ${fmtDay(locked.opensOn)}` : "";
  return { kind: "caught-up", label: `Caught up${when}`, next: null };
}

