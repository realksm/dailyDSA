import type { Role } from "./problem.js";

/** Error body of every non-2xx /api response. `details` lists per-field problems for `invalid_request`. */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: { path: string; message: string }[];
  };
}

/** GET /api/me, and the body of a successful signup/login. */
export interface Me {
  id: number;
  email: string;
  name: string;
  role: Role;
}

/** How far the signed-in user got with a problem. */
export type SolveStatus = "solved" | "attempted" | "new";

/** One day of the daily problem as the signed-in user sees it. Days are IST dates, YYYY-MM-DD. */
export interface DailyEntry {
  day: string;
  weekend: boolean;
  problem: { slug: string; title: string };
  status: SolveStatus;
  /** ISO timestamp of the user's first accepted submit. */
  solvedAt: string | null;
  /** Only once the user solved the problem or unlocked its solutions; otherwise hidden. */
  pattern: { slug: string; name: string } | null;
  /** Set when the problem was already the daily on an earlier day: show it as review. */
  review: { lastShownOn: string } | null;
}

/** GET /api/daily/today */
export interface DailyToday extends DailyEntry {
  /** ISO timestamp of the next IST midnight, for a countdown. */
  nextRolloverAt: string;
}

/** GET /api/daily?before=&limit= — newest first; pass `nextBefore` as `before` for the next page. */
export interface DailyArchive {
  days: DailyEntry[];
  nextBefore: string | null;
}
