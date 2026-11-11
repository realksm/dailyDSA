// The history page and the own-submissions list. Runs in a rolled-back transaction with the real
// bank and queue hidden; submissions and progress rows are written directly (no judging needed).
import session from "express-session";
import type pg from "pg";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createPool } from "@dailydsa/db";
import type { History, HistoryEntry, SubmissionList } from "@dailydsa/shared";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { addDays } from "../src/ist.js";
import { memoryMailer } from "../src/mailer.js";
import { createUser } from "../src/users.js";

const config = loadConfig({ NODE_ENV: "test" });
const pool = createPool(config.databaseUrl);
const dbUp = await pool.query("SELECT 1 FROM submissions LIMIT 1").then(() => true, () => false);
afterAll(() => pool.end());

const MON = "2030-01-07";
const at = (day: string, time = "00:00:00") => new Date(`${day}T${time}+05:30`);

async function sandbox(fn: (db: pg.PoolClient) => Promise<void>) {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    await db.query("UPDATE problems SET active = false");
    await db.query("DELETE FROM daily_schedule");
    await db.query("DELETE FROM track_weeks");
    await db.query("UPDATE submissions SET status = 'done' WHERE status <> 'done'");
    await fn(db);
  } finally {
    await db.query("ROLLBACK");
    db.release();
  }
}

let seq = 0;
async function problem(db: pg.PoolClient, o: { kind?: "daily" | "track"; pool?: "weekday" | "weekend"; pattern?: string } = {}) {
  const kind = o.kind ?? "daily";
  const slug = `zz-history-test-${Date.now()}-${++seq}`;
  const r = await db.query<{ id: number }>(
    `INSERT INTO problems (slug, title, kind, pool, pattern_slug, statement_md, time_limits, test_count, tests_hash, validated_at)
     VALUES ($1, $1, $2, $3, $4, '', '{}', 1, 'x', now()) RETURNING id`,
    [slug, kind, kind === "track" ? null : (o.pool ?? "weekday"), o.pattern ?? null],
  );
  return { id: r.rows[0]!.id, slug };
}

async function signIn(db: pg.PoolClient, clock: { t: Date }) {
  const app = createApp({
    config, pool: db as unknown as pg.Pool, sessionStore: new session.MemoryStore(), mailer: memoryMailer(), now: () => clock.t,
  });
  const email = `h${Date.now()}-${++seq}@history-test.local`;
  const user = await createUser(db, { email, name: "H", password: "whatever123", role: "solver" });
  const agent = request.agent(app);
  expect((await agent.post("/api/auth/login").send({ email, password: "whatever123" })).status).toBe(200);
  return { app, agent, user };
}

async function submission(
  db: pg.PoolClient,
  o: { userId: number; problemId: number; kind?: "run" | "submit"; verdict?: string; at: Date; lang?: string },
) {
  const r = await db.query<{ id: string }>(
    `INSERT INTO submissions (user_id, problem_id, lang, code, kind, status, verdict, max_cpu_ms, max_memory_kb, created_at, finished_at)
     VALUES ($1, $2, $3, 'secret code', $4, 'done', $5, 12, 3400, $6, $6) RETURNING id`,
    [o.userId, o.problemId, o.lang ?? "cpp", o.kind ?? "submit", o.verdict ?? "WA", o.at],
  );
  return Number(r.rows[0]!.id);
}

describe.skipIf(!dbUp)("GET /api/history", () => {
  it("lists every touched problem with how it went, newest activity first", () =>
    sandbox(async (db) => {
      const clock = { t: at(addDays(MON, 3)) };
      const { app, agent, user } = await signIn(db, clock);
      const other = await signIn(db, clock);
      expect((await request(app).get("/api/history")).status).toBe(401);
      expect((await agent.get("/api/history")).body).toEqual({ problems: [] });

      const ranOnly = await problem(db, { pattern: "prefix-sums" });
      const afterSolutions = await problem(db, { pool: "weekend", pattern: "two-pointers" });
      const solved = await problem(db, { pattern: "dp-1d" });
      const track = await problem(db, { kind: "track", pattern: "sliding-window" });
      const untouched = await problem(db);
      const t = await db.query<{ id: number }>("INSERT INTO tracks (pattern_slug, title) VALUES ('sliding-window', 'SW') ON CONFLICT (pattern_slug) DO UPDATE SET title = tracks.title RETURNING id");
      await db.query("DELETE FROM track_problems WHERE track_id = $1 AND position = 2", [t.rows[0]!.id]);
      await db.query("INSERT INTO track_problems (track_id, position, problem_id) VALUES ($1, 2, $2)", [t.rows[0]!.id, track.id]);
      await db.query("INSERT INTO daily_schedule (day, problem_id) VALUES ($1, $2), ($3, $2), ($4, $2)", [
        MON, solved.id, addDays(MON, 2), addDays(MON, 9), // the future pin isn't listed
      ]);

      await submission(db, { userId: user.id, problemId: ranOnly.id, kind: "run", verdict: "AC", at: at(MON, "10:00:00") });
      await submission(db, { userId: user.id, problemId: ranOnly.id, kind: "run", verdict: "WA", at: at(MON, "10:05:00") });

      await submission(db, { userId: user.id, problemId: solved.id, verdict: "AC", lang: "py", at: at(MON, "11:00:00") });
      await db.query("INSERT INTO user_problems (user_id, problem_id, first_attempt_at, solved_at, solved_verdict_lang, submit_count) VALUES ($1, $2, $3, $3, 'py', 1)",
        [user.id, solved.id, at(MON, "11:00:00")]);

      await submission(db, { userId: user.id, problemId: afterSolutions.id, verdict: "WA", at: at(MON, "12:00:00") });
      await submission(db, { userId: user.id, problemId: afterSolutions.id, verdict: "AC", lang: "java", at: at(MON, "13:00:00") });
      await db.query(
        `INSERT INTO user_problems (user_id, problem_id, first_attempt_at, solutions_unlocked_at, solved_at, solved_verdict_lang, submit_count)
         VALUES ($1, $2, $3, $4, $5, 'java', 2)`,
        [user.id, afterSolutions.id, at(MON, "12:00:00"), at(MON, "12:30:00"), at(MON, "13:00:00")],
      );

      await submission(db, { userId: user.id, problemId: track.id, verdict: "CE", at: at(MON, "09:00:00") });
      await db.query("INSERT INTO user_problems (user_id, problem_id, hints_used, submit_count) VALUES ($1, $2, 2, 1)", [user.id, track.id]);

      // Someone else's activity never shows up.
      await submission(db, { userId: other.user.id, problemId: untouched.id, at: at(MON, "14:00:00") });

      const res = await agent.get("/api/history");
      expect(res.status).toBe(200);
      const h = res.body as History;
      expect(h.problems.map((e) => e.problem.slug)).toEqual([afterSolutions.slug, solved.slug, ranOnly.slug, track.slug]);
      const by = (slug: string) => h.problems.find((e) => e.problem.slug === slug)!;
      expect(by(ranOnly.slug)).toMatchObject<Partial<HistoryEntry>>({
        status: "new", runCount: 2, submitCount: 0, solvedAt: null, pattern: null, solvedAfterSolutions: false,
        lastActivityAt: at(MON, "10:05:00").toISOString(),
      });
      expect(by(solved.slug)).toMatchObject({
        problem: { kind: "daily" }, status: "solved", solvedLang: "py", solvedAfterSolutions: false,
        pattern: { slug: "dp-1d", name: "Simple 1D DP" }, dailyDays: [MON, addDays(MON, 2)], track: null,
      });
      expect(by(afterSolutions.slug)).toMatchObject({
        status: "solved", submitCount: 2, solvedLang: "java", solvedAfterSolutions: true,
        solutionsUnlockedAt: at(MON, "12:30:00").toISOString(), firstAttemptAt: at(MON, "12:00:00").toISOString(),
        pattern: { slug: "two-pointers" },
      });
      expect(by(track.slug)).toMatchObject({
        problem: { kind: "track" }, status: "attempted", hintsUsed: 2, firstAttemptAt: null,
        pattern: { slug: "sliding-window" }, track: { position: 2 },
      });

      // Unlocking alone (no submit) is activity too, and reveals a daily pattern.
      const unlockedOnly = await problem(db, { pattern: "bfs-dfs" });
      await db.query("INSERT INTO user_problems (user_id, problem_id, solutions_unlocked_at) VALUES ($1, $2, $3)", [user.id, unlockedOnly.id, at(addDays(MON, 1))]);
      const first = ((await agent.get("/api/history")).body as History).problems[0]!;
      expect(first).toMatchObject({ problem: { slug: unlockedOnly.slug }, status: "new", pattern: { slug: "bfs-dfs" } });
    }));
});

describe.skipIf(!dbUp)("GET /api/submissions", () => {
  it("pages through the caller's own submissions, filtered by problem and kind", () =>
    sandbox(async (db) => {
      const clock = { t: at(MON) };
      const { app, agent, user } = await signIn(db, clock);
      const other = await signIn(db, clock);
      const a = await problem(db);
      const b = await problem(db);
      const ids: number[] = [];
      for (let i = 0; i < 5; i++) {
        ids.push(await submission(db, { userId: user.id, problemId: i < 3 ? a.id : b.id, kind: i === 1 ? "run" : "submit", at: at(MON, `10:0${i}:00`) }));
      }
      await submission(db, { userId: other.user.id, problemId: a.id, at: at(MON, "11:00:00") });

      expect((await request(app).get("/api/submissions")).status).toBe(401);
      const all = (await agent.get("/api/submissions")).body as SubmissionList;
      expect(all.submissions.map((s) => s.id)).toEqual([...ids].reverse());
      expect(all.nextBefore).toBeNull();
      expect(all.submissions[0]).toEqual({
        id: ids[4], problem: { slug: b.slug, title: b.slug }, kind: "submit", lang: "cpp", status: "done", verdict: "WA",
        maxCpuMs: 12, maxMemoryKb: 3400, createdAt: at(MON, "10:04:00").toISOString(), finishedAt: at(MON, "10:04:00").toISOString(),
      });
      expect(JSON.stringify(all)).not.toContain("secret code");

      const p1 = (await agent.get("/api/submissions?limit=2")).body as SubmissionList;
      expect(p1.submissions.map((s) => s.id)).toEqual([ids[4], ids[3]]);
      expect(p1.nextBefore).toBe(ids[3]);
      const p2 = (await agent.get(`/api/submissions?limit=2&before=${p1.nextBefore}`)).body as SubmissionList;
      expect(p2.submissions.map((s) => s.id)).toEqual([ids[2], ids[1]]);
      const p3 = (await agent.get(`/api/submissions?limit=2&before=${p2.nextBefore}`)).body as SubmissionList;
      expect(p3).toEqual({ submissions: [expect.objectContaining({ id: ids[0] })], nextBefore: null });

      const onA = (await agent.get(`/api/submissions?problem=${a.slug}&kind=submit`)).body as SubmissionList;
      expect(onA.submissions.map((s) => s.id)).toEqual([ids[2], ids[0]]);
      expect((await agent.get("/api/submissions?kind=bogus")).body.error.code).toBe("invalid_request");
      expect((await agent.get("/api/submissions?limit=0")).body.error.code).toBe("invalid_request");
    }));
});
