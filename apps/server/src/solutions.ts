// The Solutions tab (PLAN §4): opens on solving, or early with the "Show solutions" button after a
// real attempt. Shows the setter's reference code on top, then everyone's accepted code.
import type pg from "pg";
import type { AcceptedSolution, Lang, OfficialSolution, Role, Solutions } from "@dailydsa/shared";
import { openToSolvers, seesAllProblems } from "./problems.js";

type Db = pg.Pool | pg.PoolClient;

/**
 * The problem's id and whether the caller's Solutions tab is open (solved or unlocked), or
 * undefined if the problem isn't open to them (→ 404, like the problem page).
 */
export async function solutionsAccess(
  db: Db,
  o: { slug: string; user: { id: number; role: Role }; today: string },
): Promise<{ id: number; open: boolean } | undefined> {
  const r = await db.query<{ id: number; open: boolean }>(
    `SELECT p.id, (up.solved_at IS NOT NULL OR up.solutions_unlocked_at IS NOT NULL) IS TRUE AS open
       FROM problems p
       LEFT JOIN user_problems up ON up.problem_id = p.id AND up.user_id = $3
      WHERE p.slug = $1 AND ($4 OR ${openToSolvers("$2")})`,
    [o.slug, o.today, o.user.id, seesAllProblems(o.user.role)],
  );
  return r.rows[0];
}

export type UnlockResult = "unlocked" | "already_open" | "no_attempt";

/**
 * The "Show solutions" button. Only after a real attempt (first_attempt_at, i.e. a non-CE Submit)
 * and only once; solving later then counts as "solved after viewing solutions". The time is the
 * database clock, the same clock as the submissions' created_at it is compared with.
 */
export async function unlockSolutions(db: Db, userId: number, problemId: number): Promise<UnlockResult> {
  const u = await db.query(
    `UPDATE user_problems SET solutions_unlocked_at = now()
      WHERE user_id = $1 AND problem_id = $2
        AND first_attempt_at IS NOT NULL AND solved_at IS NULL AND solutions_unlocked_at IS NULL`,
    [userId, problemId],
  );
  if (u.rowCount) return "unlocked";
  // Read after the UPDATE, so a racing second click (or a solve) is seen as already open.
  const r = await db.query<{ open: boolean }>(
    `SELECT solved_at IS NOT NULL OR solutions_unlocked_at IS NOT NULL AS open
       FROM user_problems WHERE user_id = $1 AND problem_id = $2`,
    [userId, problemId],
  );
  return r.rows[0]?.open ? "already_open" : "no_attempt";
}

/**
 * Reference code plus accepted code from everyone: per author and language only their latest
 * accepted Submit (resubmitting the same code doesn't flood the list). Newest first, keyset paging
 * on the submission id.
 */
export async function listSolutions(
  db: Db,
  o: { problemId: number; userId: number; lang?: Lang; before?: number; limit: number },
): Promise<Solutions> {
  const official = await db.query<OfficialSolution>(
    `SELECT lang, code FROM problem_solutions
      WHERE problem_id = $1 AND ($2::text IS NULL OR lang = $2)
      ORDER BY array_position(ARRAY['cpp','java','py'], lang)`,
    [o.problemId, o.lang ?? null],
  );
  const r = await db.query<{
    id: string; user_id: number; name: string; lang: Lang; code: string;
    max_cpu_ms: number | null; max_memory_kb: number | null; created_at: Date;
  }>(
    `SELECT x.* FROM (
       SELECT DISTINCT ON (s.user_id, s.lang) s.id, s.user_id, u.name, s.lang, s.code, s.max_cpu_ms, s.max_memory_kb, s.created_at
         FROM submissions s JOIN users u ON u.id = s.user_id
        WHERE s.problem_id = $1 AND s.kind = 'submit' AND s.verdict = 'AC' AND ($2::text IS NULL OR s.lang = $2)
        ORDER BY s.user_id, s.lang, s.id DESC) x
      WHERE $3::bigint IS NULL OR x.id < $3
      ORDER BY x.id DESC
      LIMIT $4`,
    [o.problemId, o.lang ?? null, o.before ?? null, o.limit + 1],
  );
  const rows = r.rows.slice(0, o.limit);
  const accepted: AcceptedSolution[] = rows.map((x) => ({
    id: Number(x.id),
    author: x.name,
    mine: x.user_id === o.userId,
    lang: x.lang,
    code: x.code,
    maxCpuMs: x.max_cpu_ms,
    maxMemoryKb: x.max_memory_kb,
    createdAt: x.created_at.toISOString(),
  }));
  return {
    official: official.rows,
    accepted,
    nextBefore: r.rows.length > o.limit ? accepted[accepted.length - 1]!.id : null,
  };
}
