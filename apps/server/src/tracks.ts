// Weekly pattern tracks (PLAN §2): the Tracks library, the lesson page with its ladder, progress
// per track, and progressive hints on track problems. Admin lesson editing is in admin.ts.
import type pg from "pg";
import { lessonSpotIt, type LadderStep, type Role, type SolveStatus, type TrackSummary, type TrackView } from "@dailydsa/shared";
import { seesAllProblems } from "./problems.js";

type Db = pg.Pool | pg.PoolClient;

interface TrackRow {
  id: number;
  title: string;
  pattern_slug: string;
  pattern_name: string;
  sort_order: number;
  has_lesson: boolean;
  lesson_md: string | null;
  updated_at: Date;
  weeks: string[];
}

interface StepRow {
  track_id: number;
  position: number;
  slug: string;
  title: string;
  open: boolean;
  opens_on: string | null;
  solved_at: Date | null;
  first_attempt_at: Date | null;
  submit_count: number | null;
  hints_used: number | null;
  hint_count: number;
}

const status = (x: { solved_at: Date | null; first_attempt_at: Date | null; submit_count: number | null }): SolveStatus =>
  x.solved_at ? "solved" : x.first_attempt_at || (x.submit_count ?? 0) > 0 ? "attempted" : "new";

/**
 * Tracks as `user` sees them on IST day `today` (one, if `pattern` is given). Solvers only see a
 * track once one of its weeks has started; staff see every track. A ladder step is open by the
 * same rule as the problem page (`openToSolvers`): its ladder day of some week the track runs has
 * come. Locked steps hide the problem from solvers.
 */
async function loadTracks(
  db: Db,
  o: { user: { id: number; role: Role }; today: string; pattern?: string },
): Promise<(TrackSummary & { lessonMd: string; lessonUpdatedAt: string; sortOrder: number })[]> {
  const staff = seesAllProblems(o.user.role);
  const t = await db.query<TrackRow>(
    `SELECT t.id, t.title, pt.slug AS pattern_slug, pt.name AS pattern_name, pt.sort_order,
            t.lesson_md <> '' AS has_lesson, t.lesson_md, t.updated_at,
            coalesce((SELECT array_agg(w.week_start::text ORDER BY w.week_start) FROM track_weeks w WHERE w.track_id = t.id), '{}') AS weeks
       FROM tracks t JOIN patterns pt ON pt.slug = t.pattern_slug
      WHERE ($1::text IS NULL OR t.pattern_slug = $1)
        AND ($3 OR EXISTS (SELECT 1 FROM track_weeks w WHERE w.track_id = t.id AND w.week_start <= $2::date))`,
    [o.pattern ?? null, o.today, staff],
  );
  if (t.rowCount === 0) return [];

  const s = await db.query<StepRow>(
    `SELECT tp.track_id, tp.position, p.slug, p.title,
            EXISTS (SELECT 1 FROM track_weeks w WHERE w.track_id = tp.track_id AND w.week_start + (tp.position - 1) <= $2::date) AS open,
            (SELECT min(w.week_start + (tp.position - 1)) FROM track_weeks w
              WHERE w.track_id = tp.track_id AND w.week_start + (tp.position - 1) > $2::date)::text AS opens_on,
            up.solved_at, up.first_attempt_at, up.submit_count, up.hints_used,
            (SELECT count(*)::int FROM problem_hints h WHERE h.problem_id = p.id) AS hint_count
       FROM track_problems tp
       JOIN problems p ON p.id = tp.problem_id
       LEFT JOIN user_problems up ON up.problem_id = p.id AND up.user_id = $3
      WHERE tp.track_id = ANY($1::int[])
      ORDER BY tp.track_id, tp.position`,
    [t.rows.map((x) => x.id), o.today, o.user.id],
  );

  return t.rows.map((x) => {
    const ladder: LadderStep[] = s.rows
      .filter((y) => y.track_id === x.id)
      .map((y) => ({
        position: y.position,
        open: y.open,
        opensOn: y.open ? null : y.opens_on,
        problem: y.open || staff ? { slug: y.slug, title: y.title } : null,
        status: status(y),
        hints: y.hint_count,
        hintsUsed: y.hints_used ?? 0,
      }));
    // The week containing today: its Monday is in (today − 7, today].
    const running = x.weeks.filter((w) => w <= o.today && daysBetween(w, o.today) < 7).at(-1) ?? null;
    return {
      pattern: { slug: x.pattern_slug, name: x.pattern_name },
      title: x.title,
      weeks: x.weeks,
      runningWeek: running,
      released: x.weeks.some((w) => w <= o.today),
      hasLesson: x.has_lesson,
      spotIt: lessonSpotIt(x.lesson_md ?? ""),
      ladder,
      solved: ladder.filter((y) => y.status === "solved").length,
      lessonMd: x.lesson_md ?? "",
      lessonUpdatedAt: x.updated_at.toISOString(),
      sortOrder: x.sort_order,
    };
  });
}

const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

/** The Tracks library: running track first, then released ones by first week, then the rest (staff). */
export async function trackLibrary(db: Db, o: { user: { id: number; role: Role }; today: string }): Promise<TrackSummary[]> {
  const all = await loadTracks(db, o);
  const rank = (x: (typeof all)[number]) => (x.runningWeek ? 0 : x.released ? 1 : x.weeks.length ? 2 : 3);
  all.sort((a, b) => rank(a) - rank(b) || (a.weeks[0] ?? "").localeCompare(b.weeks[0] ?? "") || a.sortOrder - b.sortOrder);
  return all.map(({ lessonMd: _l, lessonUpdatedAt: _u, sortOrder: _s, ...rest }) => rest);
}

/** The lesson page, or undefined if there's no such track or it isn't released to this user yet. */
export async function trackView(
  db: Db,
  o: { user: { id: number; role: Role }; today: string; pattern: string },
): Promise<TrackView | undefined> {
  const [x] = await loadTracks(db, o);
  if (!x) return undefined;
  const { sortOrder: _s, ...rest } = x;
  return { ...rest, today: o.today };
}

export type HintResult = "ok" | "no_hints" | "no_such_hint" | "out_of_order";

/**
 * Takes hint `level` on a track problem: only the next one (hints are progressive), and taking
 * one already taken changes nothing, so a double click is harmless. The first and latest hint
 * times are stored for history ("solved with hints" = first hint before solving).
 */
export async function takeHint(db: Db, o: { userId: number; problemId: number; level: number }): Promise<HintResult> {
  const p = await db.query<{ kind: string; hint_count: number }>(
    `SELECT p.kind, (SELECT count(*)::int FROM problem_hints h WHERE h.problem_id = p.id) AS hint_count
       FROM problems p WHERE p.id = $1`,
    [o.problemId],
  );
  const x = p.rows[0];
  if (!x || x.kind !== "track" || x.hint_count === 0) return "no_hints";
  if (o.level > x.hint_count) return "no_such_hint";

  const set = `hints_used = user_problems.hints_used + 1, first_hint_at = coalesce(user_problems.first_hint_at, now()), last_hint_at = now()`;
  const u = await db.query(
    `UPDATE user_problems SET ${set} WHERE user_id = $1 AND problem_id = $2 AND hints_used = $3 - 1`,
    [o.userId, o.problemId, o.level],
  );
  if (u.rowCount) return "ok";
  if (o.level === 1) {
    const i = await db.query(
      `INSERT INTO user_problems (user_id, problem_id, hints_used, first_hint_at, last_hint_at)
       VALUES ($1, $2, 1, now(), now()) ON CONFLICT (user_id, problem_id) DO NOTHING`,
      [o.userId, o.problemId],
    );
    if (i.rowCount) return "ok";
  }
  // Read after the writes, so a racing second click is seen as already taken.
  const r = await db.query<{ hints_used: number }>("SELECT hints_used FROM user_problems WHERE user_id = $1 AND problem_id = $2", [
    o.userId, o.problemId,
  ]);
  return (r.rows[0]?.hints_used ?? 0) >= o.level ? "ok" : "out_of_order";
}
