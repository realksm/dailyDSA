// Thin client for the server's /api. Every non-2xx answer becomes an ApiErr carrying the
// server's { error: { code, message, details } } body (packages/shared/src/api.ts).
import type {
  AdminUser, DailyArchive, DailyEntry, DailyToday, History, InviteCode, Lang, Me, PasswordResetByAdmin,
  ProblemView, Role, Schedule, Solutions, ScheduleDay, StaffProblem, StaffTrack, StaffTrackDetail, SubmissionKind, SubmissionList,
  SubmissionQueued, SubmissionView, TrackLibrary, TrackPatch, TrackView, TrackWeek,
} from "@dailydsa/shared";

export class ApiErr extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: { path: string; message: string }[] = [],
  ) {
    super(message);
  }
  /** The message for one form field, from an `invalid_request` answer. */
  field(name: string): string | undefined {
    return this.details.find((d) => d.path === name)?.message;
  }
}

/** Set by the auth provider: a 401 on a signed-in request means the session ended. */
let onSessionLost: (() => void) | undefined;
export function setSessionLostHandler(fn: (() => void) | undefined) {
  onSessionLost = fn;
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  // State-changing requests must be JSON (the server's CSRF guard), even with nothing to send.
  const json = method !== "GET" && method !== "DELETE";
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: "same-origin",
      headers: json ? { "Content-Type": "application/json" } : {},
      ...(json && { body: JSON.stringify(body ?? {}) }),
    });
  } catch {
    throw new ApiErr(0, "network", "Can't reach the server. Check your connection and try again.");
  }
  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const e = (data as { error?: { code?: string; message?: string; details?: { path: string; message: string }[] } } | null)?.error;
    const err = new ApiErr(res.status, e?.code ?? `http_${res.status}`, e?.message ?? `Request failed (${res.status}).`, e?.details);
    if (err.code === "unauthorized") onSessionLost?.();
    throw err;
  }
  return data as T;
}

const q = (params: Record<string, string | number | undefined>) => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") s.set(k, String(v));
  const str = s.toString();
  return str ? `?${str}` : "";
};
const enc = encodeURIComponent;

export const api = {
  // auth
  me: () => call<Me>("GET", "/me"),
  login: (email: string, password: string) => call<Me>("POST", "/auth/login", { email, password }),
  signup: (b: { email: string; name: string; password: string; inviteCode: string }) => call<Me>("POST", "/auth/signup", b),
  logout: () => call<{ ok: true }>("POST", "/auth/logout"),
  forgotPassword: (email: string) => call<{ ok: true }>("POST", "/auth/forgot-password", { email }),
  resetPassword: (token: string, password: string) => call<{ ok: true }>("POST", "/auth/reset-password", { token, password }),
  changePassword: (currentPassword: string, newPassword: string) =>
    call<{ ok: true }>("POST", "/me/password", { currentPassword, newPassword }),

  // daily
  today: () => call<DailyToday>("GET", "/daily/today"),
  archive: (before?: string, limit?: number) => call<DailyArchive>("GET", `/daily${q({ before, limit })}`),
  day: (day: string) => call<DailyEntry>("GET", `/daily/${enc(day)}`),

  // problems + judging
  problem: (slug: string) => call<ProblemView>("GET", `/problems/${enc(slug)}`),
  run: (slug: string, lang: Lang, code: string, customInput: string) =>
    call<SubmissionQueued>("POST", `/problems/${enc(slug)}/run`, { lang, code, customInput }),
  submit: (slug: string, lang: Lang, code: string) => call<SubmissionQueued>("POST", `/problems/${enc(slug)}/submit`, { lang, code }),
  unlockSolutions: (slug: string) => call<ProblemView>("POST", `/problems/${enc(slug)}/unlock-solutions`),
  solutions: (slug: string, p: { lang?: Lang | undefined; before?: number; limit?: number }) =>
    call<Solutions>("GET", `/problems/${enc(slug)}/solutions${q(p)}`),
  submission: (id: number) => call<SubmissionView>("GET", `/submissions/${id}`),
  submissions: (p: { problem?: string; kind?: SubmissionKind; before?: number; limit?: number }) =>
    call<SubmissionList>("GET", `/submissions${q(p)}`),
  history: () => call<History>("GET", "/history"),
  takeHint: (slug: string, level: number) => call<ProblemView>("POST", `/problems/${enc(slug)}/hints`, { level }),

  // tracks
  tracks: () => call<TrackLibrary>("GET", "/tracks"),
  track: (pattern: string) => call<TrackView>("GET", `/tracks/${enc(pattern)}`),

  // admin
  admin: {
    users: () => call<AdminUser[]>("GET", "/admin/users"),
    updateUser: (id: number, patch: { role?: Role; disabled?: boolean }) => call<AdminUser>("PATCH", `/admin/users/${id}`, patch),
    resetPassword: (id: number) => call<PasswordResetByAdmin>("POST", `/admin/users/${id}/reset-password`),
    invites: () => call<InviteCode[]>("GET", "/admin/invites"),
    createInvite: (b: { maxUses: number; role: Role; expiresAt?: string }) => call<InviteCode>("POST", "/admin/invites", b),
    updateInvite: (code: string, patch: { disabled?: boolean; maxUses?: number; expiresAt?: string | null }) =>
      call<InviteCode>("PATCH", `/admin/invites/${enc(code)}`, patch),
    deleteInvite: (code: string) => call<void>("DELETE", `/admin/invites/${enc(code)}`),
    problems: () => call<StaffProblem[]>("GET", "/admin/problems"),
    tracks: () => call<StaffTrack[]>("GET", "/admin/tracks"),
    track: (pattern: string) => call<StaffTrackDetail>("GET", `/admin/tracks/${enc(pattern)}`),
    updateTrack: (pattern: string, patch: TrackPatch) => call<StaffTrackDetail>("PATCH", `/admin/tracks/${enc(pattern)}`, patch),
    schedule: (from?: string, to?: string) => call<Schedule>("GET", `/admin/schedule${q({ from, to })}`),
    pin: (day: string, slug: string) => call<ScheduleDay>("PUT", `/admin/schedule/days/${enc(day)}`, { slug }),
    unpin: (day: string) => call<void>("DELETE", `/admin/schedule/days/${enc(day)}`),
    scheduleWeek: (monday: string, pattern: string) => call<TrackWeek>("PUT", `/admin/schedule/weeks/${enc(monday)}`, { pattern }),
    unscheduleWeek: (monday: string) => call<void>("DELETE", `/admin/schedule/weeks/${enc(monday)}`),
  },
};

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");
