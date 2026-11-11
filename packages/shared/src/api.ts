import type { Pool, ProblemKind, Role, TimeLimits } from "./problem.js";
import type { Lang } from "./lang.js";
import type { JudgeResult, Verdict } from "./verdict.js";

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

/** GET /api/problems/:slug — everything the problem page and editor need. */
export interface ProblemView {
  slug: string;
  title: string;
  kind: ProblemKind;
  statementMd: string;
  /** The first tests, shown on the page and used by Run. `output` is the reference answer. */
  samples: { input: string; output: string }[];
  /** A checker grades the output, so any valid answer is accepted, not only the one shown. */
  anyValidAnswer: boolean;
  /** Editor start code per language (input already read, solver writes solve()). */
  templates: Record<Lang, string>;
  limits: { timeMs: TimeLimits; memoryMb: number; outputMb: number };
  status: SolveStatus;
  solvedAt: string | null;
  solutionsUnlocked: boolean;
  /** "Show solutions" button: after a real (non-CE) attempt, until unlocked. */
  canUnlockSolutions: boolean;
  /** Track problems: always (the track is the pattern). Daily: only after solve/unlock. */
  pattern: { slug: string; name: string } | null;
  /** Track problems only: the ladder position and how many hints exist / were used. */
  track: { position: number; hints: number; hintsUsed: number } | null;
  /** IST days this problem was the daily (oldest first, never after today). */
  dailyDays: string[];
  /** The user's latest code per language (Run or Submit), so the editor reopens where they left off. */
  lastCode: Partial<Record<Lang, string>>;
}

export type SubmissionKind = "run" | "submit";
export type SubmissionStatus = "queued" | "running" | "done";

/** POST /api/problems/:slug/run — the samples, plus `customInput` as an extra test if non-empty. */
export interface RunRequest {
  lang: Lang;
  code: string;
  customInput?: string;
}

/** POST /api/problems/:slug/submit — every test, stopping at the first failure. */
export interface SubmitRequest {
  lang: Lang;
  code: string;
}

/** 202 answer to Run/Submit; poll GET /api/submissions/:id about once a second. */
export interface SubmissionQueued {
  id: number;
  status: "queued";
}

/** GET /api/submissions/:id */
export interface SubmissionView {
  id: number;
  problem: { slug: string; title: string };
  kind: SubmissionKind;
  lang: Lang;
  code: string;
  status: SubmissionStatus;
  /** While queued/running: 1 = being judged or next. */
  queuePosition: number | null;
  verdict: Verdict | null;
  /** Hidden tests only carry input/output when they are the first failure. */
  result: JudgeResult | null;
  createdAt: string;
  finishedAt: string | null;
}

/** One row of GET /api/submissions (no code; open GET /api/submissions/:id for that). */
export interface SubmissionSummary {
  id: number;
  problem: { slug: string; title: string };
  kind: SubmissionKind;
  lang: Lang;
  status: SubmissionStatus;
  verdict: Verdict | null;
  maxCpuMs: number | null;
  maxMemoryKb: number | null;
  createdAt: string;
  finishedAt: string | null;
}

/** GET /api/submissions?problem=&kind=&before=&limit= — the caller's own, newest first; pass `nextBefore` as `before`. */
export interface SubmissionList {
  submissions: SubmissionSummary[];
  nextBefore: number | null;
}

// ───────────── history ─────────────

/** A problem the signed-in user has touched: any Run/Submit, an unlock or a hint. */
export interface HistoryEntry {
  problem: { slug: string; title: string; kind: ProblemKind };
  status: SolveStatus;
  /** Judged submits (IE doesn't count). */
  submitCount: number;
  runCount: number;
  /** First real (non-CE) submit. */
  firstAttemptAt: string | null;
  solvedAt: string | null;
  /** Language of the first accepted submit. */
  solvedLang: Lang | null;
  /** When the Solutions tab was opened with the button (before solving). */
  solutionsUnlockedAt: string | null;
  /** "Solved after viewing solutions" (PLAN §4). */
  solvedAfterSolutions: boolean;
  hintsUsed: number;
  /** Track problems: always. Daily: only after solve/unlock. */
  pattern: { slug: string; name: string } | null;
  /** Track problems: the ladder position. */
  track: { position: number } | null;
  /** IST days this problem was the daily (oldest first, never after today). */
  dailyDays: string[];
  /** Latest Run/Submit or unlock. */
  lastActivityAt: string | null;
}

/** GET /api/history — most recent activity first. */
export interface History {
  problems: HistoryEntry[];
}

// ───────────── admin (/api/admin) ─────────────

/** GET /api/admin/users (admin). */
export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: Role;
  disabled: boolean;
  inviteCode: string | null;
  createdAt: string;
  solved: number;
  lastSubmissionAt: string | null;
}

/** POST /api/admin/users/:id/reset-password (admin): shown once, pass it on to the user. */
export interface PasswordResetByAdmin {
  password: string;
}

export type InviteState = "active" | "expired" | "used_up" | "disabled";

/** GET /api/admin/invites (admin). */
export interface InviteCode {
  code: string;
  role: Role;
  maxUses: number;
  uses: number;
  expiresAt: string | null;
  disabled: boolean;
  state: InviteState;
  createdBy: { id: number; name: string } | null;
  createdAt: string;
}

/** GET /api/admin/problems (admin, setter): the whole bank, for pinning and overview. */
export interface StaffProblem {
  slug: string;
  title: string;
  kind: ProblemKind;
  pool: Pool | null;
  pattern: { slug: string; name: string } | null;
  active: boolean;
  track: { position: number } | null;
  /** Daily: days shown up to today, the latest of them, and the next future pin. */
  timesShown: number;
  lastShownOn: string | null;
  nextPinnedOn: string | null;
  solvedBy: number;
  validatedAt: string;
}

/** A day of the daily schedule as staff see it (future pins included). */
export interface ScheduleDay {
  day: string;
  weekend: boolean;
  problem: { slug: string; title: string; pool: Pool | null; pattern: { slug: string; name: string } | null };
  /** Set by PUT /api/admin/schedule/days/:day; null = automatic pick. */
  pinnedBy: { id: number; name: string } | null;
}

/** A track as the admin schedules it. `ladder` = how many of its 5 problems exist. */
export interface StaffTrack {
  id: number;
  pattern: { slug: string; name: string };
  title: string;
  ladder: number;
}

export interface TrackWeek {
  /** Monday (IST). */
  weekStart: string;
  track: StaffTrack;
}

/** GET /api/admin/schedule?from=&to= (admin, setter). */
export interface Schedule {
  from: string;
  to: string;
  today: string;
  days: ScheduleDay[];
  /** Weeks overlapping [from, to]. */
  weeks: TrackWeek[];
}
