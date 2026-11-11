// Run/Submit (PLAN §3, §6, §7): the `submissions` table is the judge queue. One worker claims the
// oldest queued row, judges it in go-judge under the shared judge lock, stores the verdict and,
// for Submit, updates the user's progress in user_problems.
import type pg from "pg";
import { withJudgeLock } from "@dailydsa/db";
import { GoJudge, JudgeUnavailableError, judge, readSamples, readTests, type JudgeRequest, type JudgeTest } from "@dailydsa/judge";
import type { JudgeResult, Lang, SubmissionKind, SubmissionStatus, SubmissionView, TimeLimits, Verdict } from "@dailydsa/shared";

type Db = pg.Pool | pg.PoolClient;
export interface Log {
  info: (m: string) => void;
  error: (e: unknown) => void;
}

/** Queued and running submissions of `userId` (the route allows one at a time). */
export async function inFlight(db: Db, userId: number): Promise<boolean> {
  const r = await db.query("SELECT 1 FROM submissions WHERE user_id = $1 AND status <> 'done' LIMIT 1", [userId]);
  return r.rowCount !== 0;
}

export async function enqueue(
  db: Db,
  s: { userId: number; problemId: number; kind: SubmissionKind; lang: Lang; code: string; customInput: string | null },
): Promise<number> {
  const r = await db.query<{ id: string }>(
    `INSERT INTO submissions (user_id, problem_id, kind, lang, code, custom_input) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [s.userId, s.problemId, s.kind, s.lang, s.code, s.customInput],
  );
  return Number(r.rows[0]!.id);
}

/** A submission as its owner sees it (admins see everyone's); undefined = 404. */
export async function submissionView(db: Db, id: number, viewer: { id: number; isAdmin: boolean }): Promise<SubmissionView | undefined> {
  const r = await db.query<{
    id: string; slug: string; title: string; kind: SubmissionKind; lang: Lang; code: string; status: SubmissionStatus;
    queue_position: number | null; verdict: Verdict | null; result: JudgeResult | null; created_at: Date; finished_at: Date | null;
  }>(
    `SELECT s.id, p.slug, p.title, s.kind, s.lang, s.code, s.status, s.verdict, s.result, s.created_at, s.finished_at,
            CASE WHEN s.status <> 'done' THEN
              (SELECT count(*)::int FROM submissions q WHERE q.status <> 'done' AND q.id <= s.id) END AS queue_position
       FROM submissions s JOIN problems p ON p.id = s.problem_id
      WHERE s.id = $1 AND (s.user_id = $2 OR $3)`,
    [id, viewer.id, viewer.isAdmin],
  );
  const x = r.rows[0];
  if (!x) return undefined;
  return {
    id: Number(x.id),
    problem: { slug: x.slug, title: x.title },
    kind: x.kind,
    lang: x.lang,
    code: x.code,
    status: x.status,
    queuePosition: x.queue_position,
    verdict: x.verdict,
    result: x.result,
    createdAt: x.created_at.toISOString(),
    finishedAt: x.finished_at ? x.finished_at.toISOString() : null,
  };
}

// ───────────── the worker ─────────────

interface Job {
  id: string;
  kind: SubmissionKind;
  lang: Lang;
  code: string;
  custom_input: string | null;
  slug: string;
  tests_hash: string;
  test_count: number;
  sample_count: number;
  time_limits: TimeLimits;
  memory_mb: number;
  output_mb: number;
  checker_py: string | null;
}

/** On boot: whatever was mid-judging when the process died goes back in the queue. */
export async function requeueRunning(db: Db): Promise<number> {
  const r = await db.query("UPDATE submissions SET status = 'queued' WHERE status = 'running'");
  return r.rowCount ?? 0;
}

async function claim(db: pg.PoolClient): Promise<Job | undefined> {
  const r = await db.query<Job>(
    `UPDATE submissions s SET status = 'running'
       FROM problems p
      WHERE p.id = s.problem_id
        AND s.id = (SELECT id FROM submissions WHERE status = 'queued' ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED)
     RETURNING s.id, s.kind, s.lang, s.code, s.custom_input, p.slug, p.tests_hash, p.test_count, p.sample_count,
               p.time_limits, p.memory_mb, p.output_mb, p.checker_py`,
  );
  return r.rows[0];
}

async function judgeRequest(job: Job, dataDir: string): Promise<{ req: JudgeRequest; customIndex: number | null }> {
  let tests: JudgeTest[];
  let customIndex: number | null = null;
  if (job.kind === "submit") {
    const all = await readTests(dataDir, job.slug, job.tests_hash, job.test_count);
    tests = all.map((t, i) => ({ input: t.input, answer: t.answer, visible: i < job.sample_count }));
  } else {
    const samples = await readSamples(dataDir, job.slug, job.tests_hash, job.sample_count);
    tests = samples.map((t) => ({ input: t.input, answer: t.answer, visible: true }));
    if (job.custom_input !== null) {
      customIndex = tests.length;
      tests.push({ input: job.custom_input, visible: true });
    }
  }
  const req: JudgeRequest = {
    lang: job.lang,
    code: job.code,
    tests,
    limits: { cpuMs: job.time_limits[job.lang], memoryMb: job.memory_mb, outputMb: job.output_mb },
    ...(job.checker_py !== null && { checker: job.checker_py }),
    stopOnFailure: job.kind === "submit", // Run shows every sample
  };
  return { req, customIndex };
}

/**
 * Stores the verdict and, for a Submit, the user's progress — one statement, so both or neither.
 * Times are the submission's, not the judging's: a Submit at 23:59 IST counts for that day.
 * CE is a submit but not a "real attempt" (no Show solutions button); IE is never the solver's
 * fault, so it leaves their progress alone.
 */
async function finish(db: pg.PoolClient, id: string, result: JudgeResult): Promise<void> {
  await db.query(
    `WITH s AS (
       UPDATE submissions SET status = 'done', verdict = $2, result = $3, max_cpu_ms = $4, max_memory_kb = $5, finished_at = now()
        WHERE id = $1
       RETURNING user_id, problem_id, kind, lang, verdict, created_at)
     INSERT INTO user_problems AS up (user_id, problem_id, submit_count, first_attempt_at, solved_at, solved_verdict_lang)
     SELECT user_id, problem_id, 1,
            CASE WHEN verdict <> 'CE' THEN created_at END,
            CASE WHEN verdict = 'AC' THEN created_at END,
            CASE WHEN verdict = 'AC' THEN lang END
       FROM s WHERE kind = 'submit' AND verdict <> 'IE'
     ON CONFLICT (user_id, problem_id) DO UPDATE SET
       submit_count        = up.submit_count + 1,
       first_attempt_at    = coalesce(up.first_attempt_at, EXCLUDED.first_attempt_at),
       solved_at           = coalesce(up.solved_at, EXCLUDED.solved_at),
       solved_verdict_lang = CASE WHEN up.solved_at IS NULL THEN EXCLUDED.solved_verdict_lang ELSE up.solved_verdict_lang END`,
    [id, result.verdict, JSON.stringify(result), result.maxCpuMs, result.maxMemoryKb],
  );
}

export type Tick = "idle" | "judged" | "unavailable";

/**
 * Judges the oldest queued submission, if any. Waits for the judge lock first (a running
 * `pnpm dsa validate` holds it), so a claimed row is never left waiting in `running`.
 * go-judge unreachable → the row goes back to `queued` and the caller backs off.
 */
export async function judgeNext(db: pg.PoolClient, o: { gj: GoJudge; dataDir: string; log: Log }): Promise<Tick> {
  return withJudgeLock(db, async () => {
    const job = await claim(db);
    if (!job) return "idle";
    let result: JudgeResult;
    try {
      const { req, customIndex } = await judgeRequest(job, o.dataDir);
      result = await judge(o.gj, req);
      if (customIndex !== null) for (const t of result.tests) if (t.index === customIndex) t.custom = true;
    } catch (e) {
      if (e instanceof JudgeUnavailableError) {
        await db.query("UPDATE submissions SET status = 'queued' WHERE id = $1", [job.id]);
        return "unavailable";
      }
      // Missing tests on disk, a go-judge 5xx, ...: our fault. Don't retry forever; tell the solver.
      o.log.error(new Error(`judging submission ${job.id} (${job.slug}) failed`, { cause: e }));
      result = { verdict: "IE", tests: [], maxCpuMs: 0, maxMemoryKb: 0 };
    }
    await finish(db, job.id, result);
    return "judged";
  });
}

export interface JudgeWorker {
  /** Something was queued: stop idling now instead of at the next poll. */
  kick(): void;
  /** Finishes the current submission, then stops. */
  stop(): Promise<void>;
}

export function startJudgeWorker(
  pool: pg.Pool,
  o: { gj: GoJudge; dataDir: string; log: Log; idleMs?: number; retryMs?: number },
): JudgeWorker {
  const idleMs = o.idleMs ?? 1000;
  const retryMs = o.retryMs ?? 5000;
  let stopped = false;
  let wake: (() => void) | undefined;
  const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
      const done = () => {
        clearTimeout(t);
        wake = undefined;
        resolve();
      };
      const t = setTimeout(done, ms);
      wake = done;
    });

  const loop = (async () => {
    let down = false;
    try {
      const n = await requeueRunning(pool);
      if (n) o.log.info(`judge: requeued ${n} unfinished submission(s)`);
    } catch (e) {
      o.log.error(e);
    }
    while (!stopped) {
      let tick: Tick;
      try {
        const client = await pool.connect();
        try {
          tick = await judgeNext(client, o);
          client.release();
        } catch (e) {
          client.release(e as Error); // the connection may still hold the lock: drop it
          throw e;
        }
      } catch (e) {
        o.log.error(e); // database trouble
        tick = "unavailable";
      }
      if (tick === "unavailable") {
        if (!down) o.log.error(`judge: go-judge at ${o.gj.url} or the database is unavailable; retrying every ${retryMs / 1000} s`);
        down = true;
        await sleep(retryMs);
      } else {
        if (down) o.log.info("judge: back up");
        down = false;
        if (tick === "idle") await sleep(idleMs);
      }
    }
  })();

  return {
    kick: () => wake?.(),
    stop: async () => {
      stopped = true;
      wake?.();
      await loop;
    },
  };
}
