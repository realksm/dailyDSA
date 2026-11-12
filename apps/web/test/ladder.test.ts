import { describe, expect, it } from "vitest";
import type { LadderStep, SolveStatus, TrackSummary } from "@dailydsa/shared";
import { ladderNext, trackAction } from "../src/ladder";

// Week of Mon 2026-11-09; Thursday = 2026-11-12, so rungs 1–4 are open and 5 opens Friday.
const THU = "2026-11-12";
const SAT = "2026-11-14";

function track(statuses: SolveStatus[], { openUpTo = 4, hasLesson = true } = {}): TrackSummary {
  const ladder: LadderStep[] = statuses.map((status, i) => {
    const position = i + 1;
    const open = position <= openUpTo;
    return {
      position, open, opensOn: open ? null : `2026-11-${String(8 + position).padStart(2, "0")}`,
      problem: open ? { slug: `p${position}`, title: `Problem ${position}` } : null,
      status, hints: 3, hintsUsed: 0,
    };
  });
  return {
    pattern: { slug: "two-pointers", name: "Two pointers" }, title: "Two Pointers",
    weeks: ["2026-11-09"], runningWeek: "2026-11-09", released: true, hasLesson, spotIt: [],
    ladder, solved: statuses.filter((s) => s === "solved").length,
  };
}

describe("ladderNext", () => {
  it("prefers today's rung, then the first open unsolved one", () => {
    expect(ladderNext(track(["solved", "new", "new", "new", "new"]), THU)?.step.position).toBe(4);
    expect(ladderNext(track(["solved", "new", "new", "solved", "new"]), THU)?.step.position).toBe(2);
    expect(ladderNext(track(["solved", "new", "new", "new", "new"], { openUpTo: 5 }), SAT)?.step.position).toBe(2);
  });
});

describe("trackAction", () => {
  it("sends you to the lesson before anything is tried", () => {
    const a = trackAction(track(["new", "new", "new", "new", "new"]), THU);
    expect(a).toMatchObject({ kind: "lesson", label: "Read the lesson", to: "/tracks/two-pointers" });
    expect(a.next?.position).toBe(4);
  });

  it("starts the ladder when there is no lesson", () => {
    expect(trackAction(track(["new", "new", "new", "new", "new"], { hasLesson: false }), THU))
      .toMatchObject({ kind: "rung", label: "Start: Ladder 4 · Problem 4", to: "/p/p4" });
  });

  it("continues on the next rung once started", () => {
    const a = trackAction(track(["solved", "attempted", "solved", "solved", "new"]), THU);
    expect(a).toMatchObject({ kind: "rung", label: "Continue: Ladder 2 · Problem 2", to: "/p/p2" });
    expect(a.next?.position).toBe(2);
  });

  it("is caught up when every open rung is solved", () => {
    const a = trackAction(track(["solved", "solved", "solved", "solved", "new"]), THU);
    expect(a.kind).toBe("caught-up");
    expect(a.label).toMatch(/^Caught up · Ladder 5 opens /);
    expect(a.next).toBeNull();
  });

  it("is done at 5/5", () => {
    expect(trackAction(track(["solved", "solved", "solved", "solved", "solved"], { openUpTo: 5 }), SAT))
      .toEqual({ kind: "done", label: "Ladder done", next: null });
  });
});
