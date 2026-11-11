// Admin page data (PLAN §1, §2, §5): users, invite codes, the problem bank, the daily schedule
// with pins, and which track runs which week. Routes and guards are in routes/admin.ts.
import type pg from "pg";
import type {
  AdminUser, InviteCode, InviteState, Pool, ProblemKind, Role, ScheduleDay, StaffProblem, StaffTrack, TrackWeek,
} from "@dailydsa/shared";
import { isWeekend } from "./ist.js";

type Db = pg.Pool | pg.PoolClient;
const iso = (d: Date | null) => (d ? d.toISOString() : null);
const pattern = (slug: string | null, name: string | null) => (slug && name ? { slug, name } : null);

// ───────────── users ─────────────

export async function adminUsers(db: Db, id?: number): Promise<AdminUser[]> {
  const r = await db.query<{
    id: number; email: string; name: string; role: Role; disabled: boolean; invite_code: string | null; created_at: Date;
    solved: number; last_submission_at: Date | null;
  }>(
    `SELECT u.id, u.email::text AS email, u.name, u.role, u.disabled, u.invite_code, u.created_at,
            (SELECT count(*)::int FROM user_problems up WHERE up.user_id = u.id AND up.solved_at IS NOT NULL) AS solved,
            (SELECT max(s.created_at) FROM submissions s WHERE s.user_id = u.id) AS last_submission_at
       FROM users u
      WHERE $1::int IS NULL OR u.id = $1
      ORDER BY u.id`,
    [id ?? null],
  );
  return r.rows.map((x) => ({
    id: x.id, email: x.email, name: x.name, role: x.role, disabled: x.disabled, inviteCode: x.invite_code,
    createdAt: x.created_at.toISOString(), solved: x.solved, lastSubmissionAt: iso(x.last_submission_at),
  }));
}

/** Returns false if there is no such user. */
export async function updateUser(db: Db, id: number, o: { role?: Role; disabled?: boolean }): Promise<boolean> {
  const r = await db.query("UPDATE users SET role = coalesce($2, role), disabled = coalesce($3, disabled) WHERE id = $1", [
    id, o.role ?? null, o.disabled ?? null,
  ]);
  return r.rowCount === 1;
}

// ───────────── invite codes ─────────────

/** Expiry is judged by the database clock, the same one signup uses. */
export async function invites(db: Db, code?: string): Promise<InviteCode[]> {
  const r = await db.query<{
    code: string; role: Role; max_uses: number; uses: number; expires_at: Date | null; disabled: boolean; expired: boolean;
    created_at: Date; creator_id: number | null; creator_name: string | null;
  }>(
    `SELECT i.code, i.role, i.max_uses, i.uses, i.expires_at, i.disabled, i.created_at,
            i.expires_at IS NOT NULL AND i.expires_at <= now() AS expired,
            u.id AS creator_id, u.name AS creator_name
       FROM invite_codes i LEFT JOIN users u ON u.id = i.created_by
      WHERE $1::text IS NULL OR i.code = $1
      ORDER BY i.created_at DESC, i.code`,
    [code ?? null],
  );
  return r.rows.map((x) => {
    const state: InviteState = x.disabled ? "disabled" : x.expired ? "expired" : x.uses >= x.max_uses ? "used_up" : "active";
    return {
      code: x.code, role: x.role, maxUses: x.max_uses, uses: x.uses, expiresAt: iso(x.expires_at), disabled: x.disabled, state,
      createdBy: x.creator_id !== null && x.creator_name !== null ? { id: x.creator_id, name: x.creator_name } : null,
      createdAt: x.created_at.toISOString(),
    };
  });
}

export type InviteUpdate = { disabled?: boolean; maxUses?: number; expiresAt?: Date | null };

/** "missing" = no such code; "below_uses" = maxUses would drop under the uses already counted. */
export async function updateInvite(db: Db, code: string, o: InviteUpdate): Promise<"ok" | "missing" | "below_uses"> {
  // One statement, so a signup counting a use in between can't slip under the new max.
  const r = await db.query(
    `UPDATE invite_codes SET
        disabled   = coalesce($2, disabled),
        max_uses   = coalesce($3::int, max_uses),
        expires_at = CASE WHEN $4::boolean THEN $5::timestamptz ELSE expires_at END
      WHERE code = $1 AND ($3::int IS NULL OR $3::int >= uses)`,
    [code, o.disabled ?? null, o.maxUses ?? null, o.expiresAt !== undefined, o.expiresAt ?? null],
  );
  if (r.rowCount === 1) return "ok";
  const exists = await db.query("SELECT 1 FROM invite_codes WHERE code = $1", [code]);
  return exists.rowCount === 0 ? "missing" : "below_uses";
}

/** Only never-used codes can be deleted (users.invite_code remembers the rest); disable those instead. */
export async function deleteInvite(db: Db, code: string): Promise<"ok" | "missing" | "used"> {
  const r = await db.query<{ uses: number }>("SELECT uses FROM invite_codes WHERE code = $1", [code]);
  const row = r.rows[0];
  if (!row) return "missing";
  if (row.uses > 0) return "used";
  const d = await db.query("DELETE FROM invite_codes WHERE code = $1 AND uses = 0", [code]);
  return d.rowCount === 1 ? "ok" : "used"; // a signup used it in between
}

// ───────────── problems ─────────────

export async function staffProblems(db: Db, today: string): Promise<StaffProblem[]> {
  const r = await db.query<{
    slug: string; title: string; kind: ProblemKind; pool: Pool | null; active: boolean; pattern_slug: string | null;
    pattern_name: string | null; position: number | null; times_shown: number; last_shown: string | null;
    next_pinned: string | null; solved_by: number; validated_at: Date;
  }>(
    `SELECT p.slug, p.title, p.kind, p.pool, p.active, pt.slug AS pattern_slug, pt.name AS pattern_name, tp.position,
            (SELECT count(*)::int FROM daily_schedule d WHERE d.problem_id = p.id AND d.day <= $1::date) AS times_shown,
            (SELECT max(d.day) FROM daily_schedule d WHERE d.problem_id = p.id AND d.day <= $1::date) AS last_shown,
            (SELECT min(d.day) FROM daily_schedule d WHERE d.problem_id = p.id AND d.day > $1::date) AS next_pinned,
            (SELECT count(*)::int FROM user_problems up WHERE up.problem_id = p.id AND up.solved_at IS NOT NULL) AS solved_by,
            p.validated_at
       FROM problems p
       LEFT JOIN patterns pt ON pt.slug = p.pattern_slug
       LEFT JOIN track_problems tp ON tp.problem_id = p.id
      ORDER BY p.kind, p.pool NULLS LAST, pt.sort_order NULLS FIRST, tp.position NULLS FIRST, p.slug`,
    [today],
  );
  return r.rows.map((x) => ({
    slug: x.slug, title: x.title, kind: x.kind, pool: x.pool, pattern: pattern(x.pattern_slug, x.pattern_name), active: x.active,
    track: x.position !== null ? { position: x.position } : null,
    timesShown: x.times_shown, lastShownOn: x.last_shown, nextPinnedOn: x.next_pinned, solvedBy: x.solved_by,
    validatedAt: x.validated_at.toISOString(),
  }));
}

// ───────────── daily schedule + pins ─────────────

export async function scheduleDays(db: Db, from: string, to: string): Promise<ScheduleDay[]> {
  const r = await db.query<{
    day: string; slug: string; title: string; pool: Pool | null; pattern_slug: string | null; pattern_name: string | null;
    pinned_by: number | null; pinned_by_name: string | null;
  }>(
    `SELECT d.day, p.slug, p.title, p.pool, pt.slug AS pattern_slug, pt.name AS pattern_name,
            d.pinned_by, u.name AS pinned_by_name
       FROM daily_schedule d
       JOIN problems p ON p.id = d.problem_id
       LEFT JOIN patterns pt ON pt.slug = p.pattern_slug
       LEFT JOIN users u ON u.id = d.pinned_by
      WHERE d.day BETWEEN $1 AND $2
      ORDER BY d.day`,
    [from, to],
  );
  return r.rows.map((x) => ({
    day: x.day,
    weekend: isWeekend(x.day),
    problem: { slug: x.slug, title: x.title, pool: x.pool, pattern: pattern(x.pattern_slug, x.pattern_name) },
    pinnedBy: x.pinned_by !== null && x.pinned_by_name !== null ? { id: x.pinned_by, name: x.pinned_by_name } : null,
  }));
}

export type PinResult = "ok" | "missing" | "not_daily" | "retired";

/**
 * Pins `slug` to a future `day`, replacing any earlier pin there (only pins exist after today:
 * automatic picks are made on the day). The pinned problem keeps its place in the normal cycle.
 */
export async function pinDay(db: Db, o: { day: string; slug: string; userId: number }): Promise<PinResult> {
  const p = await db.query<{ id: number; kind: ProblemKind; active: boolean }>("SELECT id, kind, active FROM problems WHERE slug = $1", [o.slug]);
  const x = p.rows[0];
  if (!x) return "missing";
  if (x.kind !== "daily") return "not_daily"; // track problems never appear as the daily (PLAN §1)
  if (!x.active) return "retired";
  await db.query(
    `INSERT INTO daily_schedule (day, problem_id, pinned_by) VALUES ($1, $2, $3)
     ON CONFLICT (day) DO UPDATE SET problem_id = EXCLUDED.problem_id, pinned_by = EXCLUDED.pinned_by, created_at = now()`,
    [o.day, x.id, o.userId],
  );
  return "ok";
}

/** Removes the pin on a future day; the day then gets an automatic pick when it comes. */
export async function unpinDay(db: Db, day: string): Promise<boolean> {
  const r = await db.query("DELETE FROM daily_schedule WHERE day = $1 AND pinned_by IS NOT NULL", [day]);
  return r.rowCount === 1;
}

// ───────────── tracks + weeks ─────────────

const TRACK_SELECT = `SELECT t.id, t.title, pt.slug AS pattern_slug, pt.name AS pattern_name,
        (SELECT count(*)::int FROM track_problems tp WHERE tp.track_id = t.id) AS ladder
   FROM tracks t JOIN patterns pt ON pt.slug = t.pattern_slug`;
interface TrackRow { id: number; title: string; pattern_slug: string; pattern_name: string; ladder: number }
const toTrack = (x: TrackRow): StaffTrack => ({ id: x.id, title: x.title, pattern: { slug: x.pattern_slug, name: x.pattern_name }, ladder: x.ladder });

export async function staffTracks(db: Db): Promise<StaffTrack[]> {
  const r = await db.query<TrackRow>(`${TRACK_SELECT} ORDER BY pt.sort_order, pt.slug`);
  return r.rows.map(toTrack);
}

/** Weeks whose Monday..Sunday overlaps [from, to]. */
export async function trackWeeks(db: Db, from: string, to: string): Promise<TrackWeek[]> {
  const r = await db.query<TrackRow & { week_start: string }>(
    `SELECT w.week_start, x.* FROM track_weeks w JOIN (${TRACK_SELECT}) x ON x.id = w.track_id
      WHERE w.week_start BETWEEN $1::date - 6 AND $2::date
      ORDER BY w.week_start`,
    [from, to],
  );
  return r.rows.map((x) => ({ weekStart: x.week_start, track: toTrack(x) }));
}

/** Schedules the track of `patternSlug` for the week starting `weekStart`; undefined = no such track. */
export async function scheduleWeek(db: Db, weekStart: string, patternSlug: string): Promise<TrackWeek | undefined> {
  const t = await db.query<TrackRow>(`${TRACK_SELECT} WHERE t.pattern_slug = $1`, [patternSlug]);
  const track = t.rows[0];
  if (!track) return undefined;
  await db.query(
    "INSERT INTO track_weeks (week_start, track_id) VALUES ($1, $2) ON CONFLICT (week_start) DO UPDATE SET track_id = EXCLUDED.track_id",
    [weekStart, track.id],
  );
  return { weekStart, track: toTrack(track) };
}

export async function unscheduleWeek(db: Db, weekStart: string): Promise<boolean> {
  const r = await db.query("DELETE FROM track_weeks WHERE week_start = $1", [weekStart]);
  return r.rowCount === 1;
}
