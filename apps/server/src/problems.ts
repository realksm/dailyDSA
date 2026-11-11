// The problem page (PLAN §1–§3): statement, samples, editor templates, limits and the caller's status.
import type pg from "pg";
import { readSamples, type StoredTest } from "@dailydsa/judge";
import { LANGS, editorTemplate, type InputSpec, type Lang, type ProblemKind, type ProblemView, type Role, type TimeLimits } from "@dailydsa/shared";

type Db = pg.Pool | pg.PoolClient;

/** Setters and admins see every problem (to check it before it goes out). */
export const seesAllProblems = (role: Role) => role === "admin" || role === "setter";

/**
 * SQL condition: problem `p` is open to solvers on IST day `$day`. A daily problem once it was
 * the daily on a day up to today (so future pins stay secret); a track problem once its ladder day
 * (Monday + position − 1) of any week its track ran has come. Retired problems stay open: the
 * archive and history still link to them.
 */
export const openToSolvers = (day: string) => `(
  EXISTS (SELECT 1 FROM daily_schedule d WHERE d.problem_id = p.id AND d.day <= ${day}::date)
  OR EXISTS (SELECT 1 FROM track_problems tp JOIN track_weeks w ON w.track_id = tp.track_id
              WHERE tp.problem_id = p.id AND w.week_start + (tp.position - 1) <= ${day}::date))`;

interface Row {
  id: number;
  slug: string;
  title: string;
  kind: ProblemKind;
  statement_md: string;
  input_spec: InputSpec | null;
  time_limits: TimeLimits;
  memory_mb: number;
  output_mb: number;
  has_checker: boolean;
  sample_count: number;
  tests_hash: string;
  pattern_slug: string | null;
  pattern_name: string | null;
  first_attempt_at: Date | null;
  solved_at: Date | null;
  solutions_unlocked_at: Date | null;
  submit_count: number | null;
  hints_used: number | null;
  position: number | null;
  hint_count: number;
  daily_days: string[];
}

/** Samples never change for a tests hash, so they are read from disk once per hash. */
const sampleCache = new Map<string, Promise<StoredTest[]>>();
function samples(dataDir: string, slug: string, hash: string, count: number): Promise<StoredTest[]> {
  const key = `${dataDir}\0${slug}\0${hash}\0${count}`;
  let p = sampleCache.get(key);
  if (!p) {
    p = readSamples(dataDir, slug, hash, count);
    p.catch(() => sampleCache.delete(key)); // don't cache a missing file; retry after a fix
    sampleCache.set(key, p);
  }
  return p;
}

/**
 * The problem as `user` sees it on IST day `today`, or undefined if it doesn't exist or isn't open
 * to them yet (the route answers 404 for both, so unreleased slugs can't be probed).
 */
export async function problemView(
  db: Db,
  o: { slug: string; user: { id: number; role: Role }; today: string; dataDir: string },
): Promise<ProblemView | undefined> {
  const r = await db.query<Row>(
    `SELECT p.id, p.slug, p.title, p.kind, p.statement_md, p.input_spec, p.time_limits, p.memory_mb, p.output_mb,
            p.checker_py IS NOT NULL AS has_checker, p.sample_count, p.tests_hash,
            pt.slug AS pattern_slug, pt.name AS pattern_name,
            up.first_attempt_at, up.solved_at, up.solutions_unlocked_at, up.submit_count, up.hints_used,
            tp.position,
            (SELECT count(*)::int FROM problem_hints h WHERE h.problem_id = p.id) AS hint_count,
            coalesce((SELECT array_agg(d.day::text ORDER BY d.day) FROM daily_schedule d
                       WHERE d.problem_id = p.id AND d.day <= $2::date), '{}') AS daily_days
       FROM problems p
       LEFT JOIN patterns pt ON pt.slug = p.pattern_slug
       LEFT JOIN user_problems up ON up.problem_id = p.id AND up.user_id = $3
       LEFT JOIN track_problems tp ON tp.problem_id = p.id
      WHERE p.slug = $1 AND ($4 OR ${openToSolvers("$2")})`,
    [o.slug, o.today, o.user.id, seesAllProblems(o.user.role)],
  );
  const x = r.rows[0];
  if (!x) return undefined;

  const tests = await samples(o.dataDir, x.slug, x.tests_hash, x.sample_count);
  const spec = x.input_spec ?? undefined;
  const unlocked = x.solved_at !== null || x.solutions_unlocked_at !== null;
  const showPattern = x.kind === "track" || unlocked;
  return {
    slug: x.slug,
    title: x.title,
    kind: x.kind,
    statementMd: x.statement_md,
    samples: tests.map((t) => ({ input: t.input, output: t.answer })),
    anyValidAnswer: x.has_checker,
    templates: Object.fromEntries(LANGS.map((l) => [l, editorTemplate(l, spec)])) as Record<Lang, string>,
    limits: { timeMs: x.time_limits, memoryMb: x.memory_mb, outputMb: x.output_mb },
    status: x.solved_at ? "solved" : x.first_attempt_at || (x.submit_count ?? 0) > 0 ? "attempted" : "new",
    solvedAt: x.solved_at ? x.solved_at.toISOString() : null,
    solutionsUnlocked: unlocked,
    canUnlockSolutions: !unlocked && x.first_attempt_at !== null,
    pattern: showPattern && x.pattern_slug && x.pattern_name ? { slug: x.pattern_slug, name: x.pattern_name } : null,
    track: x.kind === "track" && x.position !== null ? { position: x.position, hints: x.hint_count, hintsUsed: x.hints_used ?? 0 } : null,
    dailyDays: x.daily_days,
  };
}
