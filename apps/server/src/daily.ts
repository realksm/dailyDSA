// The daily problem (PLAN §1): one stored pick per IST date, made lazily on the first request
// of the day and by a timer at IST midnight, never recomputed.
import type pg from "pg";
import type { DailyEntry } from "@dailydsa/shared";
import { isWeekend, istDate, nextIstMidnight, weekStart } from "./ist.js";

type Db = pg.Pool | pg.PoolClient;

/** Where a pick came from; logged at rollover, handy in tests. */
export type PickRule = "weekday" | "week-track" | "ran-tracks" | "weekday-fallback";

/**
 * Chooses (but does not store) the problem for `day`: the eligible problem shown least recently
 * — never-shown first, ties random. "Shown" counts every daily_schedule row, future pins too,
 * so a problem pinned ahead isn't also picked just before its pinned date.
 *
 * - Mon–Fri: the weekday pool.
 * - Sat/Sun: weekend problems of that week's track pattern; if no track is scheduled (or it has
 *   no weekend problems) weekend problems whose pattern already ran as a track in an earlier
 *   week, so an upcoming track's problems are never used up; failing that, the weekday pool.
 */
export async function chooseDailyProblem(db: Db, day: string): Promise<{ problemId: number; rule: PickRule } | undefined> {
  const pick = async (where: string, params: unknown[]) => {
    const r = await db.query<{ id: number }>(
      `SELECT p.id FROM problems p
         LEFT JOIN (SELECT problem_id, max(day) AS last FROM daily_schedule GROUP BY problem_id) s ON s.problem_id = p.id
        WHERE p.active AND p.kind = 'daily' AND ${where}
        ORDER BY s.last ASC NULLS FIRST, random()
        LIMIT 1`,
      params,
    );
    return r.rows[0]?.id;
  };
  const found = (problemId: number | undefined, rule: PickRule) => (problemId === undefined ? undefined : { problemId, rule });

  if (!isWeekend(day)) return found(await pick("p.pool = 'weekday'", []), "weekday");

  const monday = weekStart(day);
  const track = await db.query<{ pattern_slug: string }>(
    "SELECT t.pattern_slug FROM track_weeks w JOIN tracks t ON t.id = w.track_id WHERE w.week_start = $1",
    [monday],
  );
  const pattern = track.rows[0]?.pattern_slug;
  return (
    (pattern !== undefined ? found(await pick("p.pool = 'weekend' AND p.pattern_slug = $1", [pattern]), "week-track") : undefined) ??
    found(
      await pick(
        `p.pool = 'weekend' AND p.pattern_slug IN (
           SELECT t.pattern_slug FROM track_weeks w JOIN tracks t ON t.id = w.track_id WHERE w.week_start < $1)`,
        [monday],
      ),
      "ran-tracks",
    ) ??
    found(await pick("p.pool = 'weekday'", []), "weekday-fallback")
  );
}

export interface DailyPick {
  day: string;
  problemId: number;
  /** Set when this call made the pick (not when it already existed). */
  rule?: PickRule;
}

/**
 * Returns the stored pick for `day`, making it first if there is none. Safe to race: the insert
 * is ON CONFLICT DO NOTHING and everyone reads back the row that won. Undefined only when no
 * problem is eligible at all (empty bank).
 */
export async function ensureDailyPick(db: Db, day: string): Promise<DailyPick | undefined> {
  const existing = await db.query<{ problem_id: number }>("SELECT problem_id FROM daily_schedule WHERE day = $1", [day]);
  if (existing.rows[0]) return { day, problemId: existing.rows[0].problem_id };

  const choice = await chooseDailyProblem(db, day);
  if (!choice) return undefined;
  const ins = await db.query(
    "INSERT INTO daily_schedule (day, problem_id) VALUES ($1, $2) ON CONFLICT (day) DO NOTHING",
    [day, choice.problemId],
  );
  if (ins.rowCount === 1) return { day, problemId: choice.problemId, rule: choice.rule };
  const won = await db.query<{ problem_id: number }>("SELECT problem_id FROM daily_schedule WHERE day = $1", [day]);
  return { day, problemId: won.rows[0]!.problem_id };
}

/** Backfill horizon: a gap longer than this (a year of downtime) is not filled. */
export const MAX_CATCH_UP_DAYS = 366;

/**
 * Makes sure every day from the first scheduled day through `today` has a pick, oldest first,
 * so the archive has no holes after the server was down (each missed day gets the pick its
 * own rules would have made, e.g. the track of that week). Returns the picks it made.
 */
export async function catchUpDaily(db: Db, today: string): Promise<DailyPick[]> {
  const missing = await db.query<{ day: string }>(
    `SELECT g.day::date::text AS day
       FROM generate_series(
              greatest(coalesce((SELECT min(day) FROM daily_schedule WHERE day <= $1), $1::date), $1::date - $2::int),
              $1::date, interval '1 day') AS g(day)
      WHERE NOT EXISTS (SELECT 1 FROM daily_schedule d WHERE d.day = g.day::date)
      ORDER BY 1`,
    [today, MAX_CATCH_UP_DAYS],
  );
  const made: DailyPick[] = [];
  for (const { day } of missing.rows) {
    const p = await ensureDailyPick(db, day);
    if (!p) break; // empty bank: nothing to pick for any day
    if (p.rule) made.push(p);
  }
  return made;
}

interface EntryRow {
  day: string;
  slug: string;
  title: string;
  solved_at: Date | null;
  attempted: boolean;
  pattern_slug: string | null;
  pattern_name: string | null;
  last_shown: string | null;
}

/**
 * Daily entries as `userId` sees them, newest first, never after `today`. The pattern is only
 * included once the user solved the problem or unlocked its solutions (PLAN §1).
 */
export async function dailyEntries(
  db: Db,
  o: { userId: number; today: string; day?: string; before?: string; limit?: number },
): Promise<DailyEntry[]> {
  const params: unknown[] = [o.userId, o.today];
  const cond: string[] = ["d.day <= $2"];
  if (o.day !== undefined) cond.push(`d.day = $${params.push(o.day)}`);
  if (o.before !== undefined) cond.push(`d.day < $${params.push(o.before)}`);
  const limit = `LIMIT $${params.push(o.limit ?? 1000)}`;
  const r = await db.query<EntryRow>(
    `SELECT d.day, p.slug, p.title, up.solved_at,
            (up.first_attempt_at IS NOT NULL OR coalesce(up.submit_count, 0) > 0) AS attempted,
            pt.slug AS pattern_slug, pt.name AS pattern_name,
            (SELECT max(e.day) FROM daily_schedule e WHERE e.problem_id = d.problem_id AND e.day < d.day) AS last_shown
       FROM daily_schedule d
       JOIN problems p ON p.id = d.problem_id
       LEFT JOIN user_problems up ON up.problem_id = p.id AND up.user_id = $1
       LEFT JOIN patterns pt ON pt.slug = p.pattern_slug AND (up.solved_at IS NOT NULL OR up.solutions_unlocked_at IS NOT NULL)
      WHERE ${cond.join(" AND ")}
      ORDER BY d.day DESC
      ${limit}`,
    params,
  );
  return r.rows.map((x) => ({
    day: x.day,
    weekend: isWeekend(x.day),
    problem: { slug: x.slug, title: x.title },
    status: x.solved_at ? "solved" : x.attempted ? "attempted" : "new",
    solvedAt: x.solved_at ? x.solved_at.toISOString() : null,
    pattern: x.pattern_slug && x.pattern_name ? { slug: x.pattern_slug, name: x.pattern_name } : null,
    review: x.last_shown ? { lastShownOn: x.last_shown } : null,
  }));
}

/**
 * Catches up (fills missed days, then today) now and again just after every IST midnight, so the
 * pick doesn't wait for the first visitor. Returns a stop function.
 */
export function startDailyRollover(pool: pg.Pool, log: { info: (m: string) => void; error: (e: unknown) => void }, now: () => Date = () => new Date()): () => void {
  let timer: NodeJS.Timeout | undefined;
  let stopped = false;
  const run = async () => {
    const day = istDate(now());
    try {
      const made = await catchUpDaily(pool, day);
      for (const p of made) log.info(`daily ${p.day}: picked problem ${p.problemId} (${p.rule})`);
      if (made.length === 0 && !(await ensureDailyPick(pool, day))) log.info(`daily ${day}: no eligible problem`);
    } catch (e) {
      log.error(e);
    }
    if (stopped) return;
    // +2 s so a slightly fast timer can't fire on the old day; at most a day, well within setTimeout's range.
    const delay = Math.max(1000, nextIstMidnight(now()).getTime() - now().getTime() + 2000);
    timer = setTimeout(() => void run(), delay);
    timer.unref();
  };
  void run();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
