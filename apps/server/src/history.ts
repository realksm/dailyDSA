// The history page (PLAN §2, §4): every problem the user has touched and how it went —
// solved, solved after viewing solutions, solved with hints — plus their own submission list.
import type pg from "pg";
import type {
  HistoryEntry, Lang, ProblemKind, SubmissionKind, SubmissionList, SubmissionStatus, Verdict,
} from "@dailydsa/shared";

type Db = pg.Pool | pg.PoolClient;

interface HistoryRow {
  slug: string;
  title: string;
  kind: ProblemKind;
  pattern_slug: string | null;
  pattern_name: string | null;
  position: number | null;
  first_attempt_at: Date | null;
  solved_at: Date | null;
  solved_verdict_lang: Lang | null;
  solutions_unlocked_at: Date | null;
  hints_used: number;
  first_hint_at: Date | null;
  submit_count: number;
  run_count: number;
  last_at: Date | null;
  daily_days: string[];
  note: string | null;
}

const iso = (d: Date | null) => (d ? d.toISOString() : null);

/**
 * Problems `userId` ran, submitted, unlocked or took a hint on, most recent activity first.
 * Status matches the problem page; the pattern follows the same reveal rule.
 */
export async function history(db: Db, o: { userId: number; today: string }): Promise<HistoryEntry[]> {
  const r = await db.query<HistoryRow>(
    `WITH touched AS (
       SELECT problem_id, max(created_at) AS last_at, count(*) FILTER (WHERE kind = 'run')::int AS runs
         FROM submissions WHERE user_id = $1 GROUP BY problem_id)
     SELECT p.slug, p.title, p.kind, pt.slug AS pattern_slug, pt.name AS pattern_name, tp.position,
            up.first_attempt_at, up.solved_at, up.solved_verdict_lang, up.solutions_unlocked_at,
            coalesce(up.hints_used, 0) AS hints_used, up.first_hint_at, coalesce(up.submit_count, 0) AS submit_count,
            coalesce(t.runs, 0) AS run_count, up.note,
            greatest(t.last_at, up.solutions_unlocked_at, up.last_hint_at) AS last_at,
            coalesce((SELECT array_agg(d.day::text ORDER BY d.day) FROM daily_schedule d
                       WHERE d.problem_id = p.id AND d.day <= $2::date), '{}') AS daily_days
       FROM problems p
       LEFT JOIN touched t ON t.problem_id = p.id
       LEFT JOIN user_problems up ON up.problem_id = p.id AND up.user_id = $1
       LEFT JOIN patterns pt ON pt.slug = p.pattern_slug
       LEFT JOIN track_problems tp ON tp.problem_id = p.id
      WHERE t.problem_id IS NOT NULL OR up.user_id IS NOT NULL
      ORDER BY last_at DESC NULLS LAST, p.id`,
    [o.userId, o.today],
  );
  return r.rows.map((x) => {
    const unlocked = x.solved_at !== null || x.solutions_unlocked_at !== null;
    const showPattern = x.kind === "track" || unlocked;
    return {
      problem: { slug: x.slug, title: x.title, kind: x.kind },
      status: x.solved_at ? "solved" : x.first_attempt_at || x.submit_count > 0 ? "attempted" : "new",
      submitCount: x.submit_count,
      runCount: x.run_count,
      firstAttemptAt: iso(x.first_attempt_at),
      solvedAt: iso(x.solved_at),
      solvedLang: x.solved_verdict_lang,
      solutionsUnlockedAt: iso(x.solutions_unlocked_at),
      // The button sets solutions_unlocked_at, solving never does (submissions.ts finish()).
      solvedAfterSolutions: x.solved_at !== null && x.solutions_unlocked_at !== null && x.solutions_unlocked_at < x.solved_at,
      hintsUsed: x.hints_used,
      solvedWithHints: x.solved_at !== null && x.first_hint_at !== null && x.first_hint_at < x.solved_at,
      pattern: showPattern && x.pattern_slug && x.pattern_name ? { slug: x.pattern_slug, name: x.pattern_name } : null,
      track: x.kind === "track" && x.position !== null ? { position: x.position } : null,
      dailyDays: x.daily_days,
      lastActivityAt: iso(x.last_at),
      note: x.note,
    };
  });
}

/** The user's own submissions, newest first, keyset-paged by id. */
export async function listSubmissions(
  db: Db,
  o: { userId: number; slug?: string; kind?: SubmissionKind; before?: number; limit: number },
): Promise<SubmissionList> {
  const params: unknown[] = [o.userId];
  const cond = ["s.user_id = $1"];
  if (o.slug !== undefined) cond.push(`p.slug = $${params.push(o.slug)}`);
  if (o.kind !== undefined) cond.push(`s.kind = $${params.push(o.kind)}`);
  if (o.before !== undefined) cond.push(`s.id < $${params.push(o.before)}`);
  const r = await db.query<{
    id: string; slug: string; title: string; kind: SubmissionKind; lang: Lang; status: SubmissionStatus; verdict: Verdict | null;
    max_cpu_ms: number | null; max_memory_kb: number | null; created_at: Date; finished_at: Date | null;
  }>(
    `SELECT s.id, p.slug, p.title, s.kind, s.lang, s.status, s.verdict, s.max_cpu_ms, s.max_memory_kb, s.created_at, s.finished_at
       FROM submissions s JOIN problems p ON p.id = s.problem_id
      WHERE ${cond.join(" AND ")}
      ORDER BY s.id DESC
      LIMIT $${params.push(o.limit + 1)}`,
    params,
  );
  const rows = r.rows.slice(0, o.limit);
  const submissions = rows.map((x) => ({
    id: Number(x.id),
    problem: { slug: x.slug, title: x.title },
    kind: x.kind,
    lang: x.lang,
    status: x.status,
    verdict: x.verdict,
    maxCpuMs: x.max_cpu_ms,
    maxMemoryKb: x.max_memory_kb,
    createdAt: x.created_at.toISOString(),
    finishedAt: iso(x.finished_at),
  }));
  return { submissions, nextBefore: r.rows.length > o.limit ? submissions[submissions.length - 1]!.id : null };
}
