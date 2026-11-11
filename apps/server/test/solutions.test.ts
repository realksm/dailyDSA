// The Solutions tab: the Show solutions button, who can read solutions, what the list holds, and
// the pattern's track link. Runs in a rolled-back transaction with the real bank hidden.
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import session from "express-session";
import type pg from "pg";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createPool } from "@dailydsa/db";
import { writeTests } from "@dailydsa/judge";
import type { Role, Solutions } from "@dailydsa/shared";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { addDays } from "../src/ist.js";
import { memoryMailer } from "../src/mailer.js";
import { createUser } from "../src/users.js";

const dataDir = await mkdtemp(path.join(os.tmpdir(), "dsa-solutions-test-"));
const config = loadConfig({ NODE_ENV: "test", DATA_DIR: dataDir });
const pool = createPool(config.databaseUrl);
const dbUp = await pool.query("SELECT 1 FROM daily_schedule LIMIT 1").then(() => true, () => false);
afterAll(async () => {
  await pool.end();
  await rm(dataDir, { recursive: true, force: true });
});

const MON = "2030-01-07"; // a Monday
const at = (day: string) => new Date(`${day}T00:00:00+05:30`);

async function sandbox(fn: (db: pg.PoolClient) => Promise<void>) {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    await db.query("UPDATE problems SET active = false");
    await db.query("DELETE FROM daily_schedule");
    await db.query("DELETE FROM track_weeks");
    await fn(db);
  } finally {
    await db.query("ROLLBACK");
    db.release();
  }
}

let seq = 0;
/** A weekend daily problem (pattern two-pointers) shown on MON, with reference code in all 3 languages. */
async function problem(db: pg.PoolClient, o: { day?: string } = {}) {
  const slug = `zz-solutions-test-${Date.now()}-${++seq}`;
  const hash = await writeTests(dataDir, slug, [{ input: "1\n", answer: "1\n" }]);
  const r = await db.query<{ id: number }>(
    `INSERT INTO problems (slug, title, kind, pool, pattern_slug, statement_md, time_limits, sample_count, test_count, tests_hash, validated_at)
     VALUES ($1, 'Echo', 'daily', 'weekend', 'two-pointers', 'Echo it.', '{"cpp":500,"java":700,"py":900}', 1, 1, $2, now())
     RETURNING id`,
    [slug, hash],
  );
  const id = r.rows[0]!.id;
  for (const lang of ["py", "cpp", "java"]) {
    await db.query("INSERT INTO problem_solutions (problem_id, lang, code) VALUES ($1, $2, $3)", [id, lang, `ref ${lang}`]);
  }
  await db.query("INSERT INTO daily_schedule (day, problem_id) VALUES ($1, $2)", [o.day ?? MON, id]);
  return { id, slug };
}

async function signIn(db: pg.PoolClient, clock: { t: Date }, o: { role?: Role; name?: string } = {}) {
  const app = createApp({
    config, pool: db as unknown as pg.Pool, sessionStore: new session.MemoryStore(), mailer: memoryMailer(), now: () => clock.t,
  });
  const email = `s${Date.now()}-${++seq}@solutions-test.local`;
  const user = await createUser(db, { email, name: o.name ?? "S", password: "whatever123", role: o.role ?? "solver" });
  const agent = request.agent(app);
  expect((await agent.post("/api/auth/login").send({ email, password: "whatever123" })).status).toBe(200);
  return { app, agent, user };
}

/** A finished Submit, as the worker would store it (progress is set separately). */
async function submission(db: pg.PoolClient, userId: number, problemId: number, lang: string, verdict: string, code: string) {
  const r = await db.query<{ id: string }>(
    `INSERT INTO submissions (user_id, problem_id, lang, code, kind, status, verdict, max_cpu_ms, max_memory_kb, finished_at)
     VALUES ($1, $2, $3, $4, 'submit', 'done', $5, 12, 3400, now()) RETURNING id`,
    [userId, problemId, lang, code, verdict],
  );
  return Number(r.rows[0]!.id);
}

/** Upserts the user's progress: "attempted" = a real (non-CE) Submit, "solved" = an accepted one. */
const progress = (db: pg.PoolClient, userId: number, problemId: number, what: "attempted" | "solved") =>
  db.query(
    `INSERT INTO user_problems (user_id, problem_id, submit_count, first_attempt_at, solved_at) VALUES ($1, $2, 1, now(), $3)
     ON CONFLICT (user_id, problem_id) DO UPDATE SET first_attempt_at = now(), solved_at = excluded.solved_at`,
    [userId, problemId, what === "solved" ? new Date() : null],
  );

describe.skipIf(!dbUp)("Solutions tab", () => {
  it("the button needs a real attempt, opens the tab once and marks a later solve", () =>
    sandbox(async (db) => {
      const clock = { t: at(MON) };
      const { agent, user } = await signIn(db, clock);
      const p = await problem(db);
      const unlock = () => agent.post(`/api/problems/${p.slug}/unlock-solutions`).send({});

      expect((await agent.get(`/api/problems/${p.slug}/solutions`)).body.error.code).toBe("solutions_locked");
      let res = await unlock(); // never submitted
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("no_attempt");
      await db.query("INSERT INTO user_problems (user_id, problem_id, submit_count) VALUES ($1, $2, 1)", [user.id, p.id]); // CE only
      expect((await unlock()).body.error.code).toBe("no_attempt");

      await progress(db, user.id, p.id, "attempted");
      res = await unlock();
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ solutionsUnlocked: true, canUnlockSolutions: false, pattern: { slug: "two-pointers", trackOpen: false } });
      const first = (await db.query("SELECT solutions_unlocked_at FROM user_problems WHERE user_id = $1", [user.id])).rows[0].solutions_unlocked_at;
      expect((await unlock()).status).toBe(200); // again: fine, time kept
      expect((await db.query("SELECT solutions_unlocked_at FROM user_problems WHERE user_id = $1", [user.id])).rows[0].solutions_unlocked_at)
        .toEqual(first);
      expect((await agent.get(`/api/problems/${p.slug}/solutions`)).status).toBe(200);

      // Solving afterwards counts as "solved after viewing solutions".
      await db.query("UPDATE user_problems SET solved_at = solutions_unlocked_at + interval '1 minute' WHERE user_id = $1", [user.id]);
      const h = (await agent.get("/api/history")).body.problems.find((e: { problem: { slug: string } }) => e.problem.slug === p.slug);
      expect(h).toMatchObject({ status: "solved", solvedAfterSolutions: true });
    }));

  it("solving opens the tab without the button; unlocking after solving changes nothing", () =>
    sandbox(async (db) => {
      const clock = { t: at(MON) };
      const { agent, user } = await signIn(db, clock);
      const p = await problem(db);
      await progress(db, user.id, p.id, "solved");
      expect((await agent.get(`/api/problems/${p.slug}/solutions`)).status).toBe(200);
      expect((await agent.post(`/api/problems/${p.slug}/unlock-solutions`).send({})).status).toBe(200);
      const row = (await db.query("SELECT solutions_unlocked_at FROM user_problems WHERE user_id = $1", [user.id])).rows[0];
      expect(row.solutions_unlocked_at).toBeNull(); // not "solved after viewing solutions"
    }));

  it("lists reference code on top and each author's latest accepted code per language, newest first", () =>
    sandbox(async (db) => {
      const clock = { t: at(MON) };
      const { agent, user } = await signIn(db, clock, { name: "Me" });
      const ana = (await signIn(db, clock, { name: "Ana" })).user;
      const bo = (await signIn(db, clock, { name: "Bo" })).user;
      const p = await problem(db);
      const other = await problem(db, { day: addDays(MON, -1) });
      await progress(db, user.id, p.id, "solved");

      await submission(db, ana.id, p.id, "cpp", "AC", "ana cpp 1");
      await submission(db, ana.id, p.id, "cpp", "WA", "ana cpp wrong");
      const ana2 = await submission(db, ana.id, p.id, "cpp", "AC", "ana cpp 2"); // replaces "ana cpp 1"
      const anaPy = await submission(db, ana.id, p.id, "py", "AC", "ana py");
      await submission(db, bo.id, p.id, "java", "TLE", "bo slow");
      await submission(db, bo.id, other.id, "java", "AC", "bo other problem");
      await db.query(
        "INSERT INTO submissions (user_id, problem_id, lang, code, kind, status, verdict) VALUES ($1, $2, 'py', 'run ok', 'run', 'done', 'AC')",
        [bo.id, p.id],
      ); // a Run is never a solution
      const mine = await submission(db, user.id, p.id, "py", "AC", "my py");

      let s = (await agent.get(`/api/problems/${p.slug}/solutions`)).body as Solutions;
      expect(s.official).toEqual([{ lang: "cpp", code: "ref cpp" }, { lang: "java", code: "ref java" }, { lang: "py", code: "ref py" }]);
      expect(s.accepted.map((a) => [a.id, a.author, a.lang, a.code, a.mine])).toEqual([
        [mine, "Me", "py", "my py", true],
        [anaPy, "Ana", "py", "ana py", false],
        [ana2, "Ana", "cpp", "ana cpp 2", false],
      ]);
      expect(s.accepted[0]).toMatchObject({ maxCpuMs: 12, maxMemoryKb: 3400 });
      expect(s.nextBefore).toBeNull();

      s = (await agent.get(`/api/problems/${p.slug}/solutions?lang=py&limit=1`)).body;
      expect(s.official).toEqual([{ lang: "py", code: "ref py" }]);
      expect(s.accepted.map((a) => a.id)).toEqual([mine]);
      expect(s.nextBefore).toBe(mine);
      s = (await agent.get(`/api/problems/${p.slug}/solutions?lang=py&limit=1&before=${mine}`)).body;
      expect(s.accepted.map((a) => a.id)).toEqual([anaPy]);
      s = (await agent.get(`/api/problems/${p.slug}/solutions?lang=py&limit=1&before=${anaPy}`)).body;
      expect(s).toMatchObject({ accepted: [], nextBefore: null });

      expect((await agent.get(`/api/problems/${p.slug}/solutions?lang=rust`)).body.error.code).toBe("invalid_request");
    }));

  it("is a 404 for problems that aren't open, even for solvers who touched them", () =>
    sandbox(async (db) => {
      const clock = { t: at(MON) };
      const { agent } = await signIn(db, clock);
      const p = await problem(db, { day: addDays(MON, 3) }); // pinned for Thursday
      expect((await agent.get(`/api/problems/${p.slug}/solutions`)).status).toBe(404);
      expect((await agent.post(`/api/problems/${p.slug}/unlock-solutions`).send({})).status).toBe(404);
      expect((await agent.get("/api/problems/zz-nope/solutions")).status).toBe(404);
      // Staff can open the page early but follow the same Solutions rules as everyone.
      const staff = (await signIn(db, clock, { role: "setter" })).agent;
      expect((await staff.get(`/api/problems/${p.slug}/solutions`)).body.error.code).toBe("solutions_locked");
    }));

  it("links the revealed pattern to its track only once the track has started", () =>
    sandbox(async (db) => {
      const clock = { t: at(MON) };
      const { agent, user } = await signIn(db, clock);
      const p = await problem(db);
      await progress(db, user.id, p.id, "solved");
      const t = await db.query<{ id: number }>(
        `INSERT INTO tracks (pattern_slug, title) VALUES ('two-pointers', 'Two pointers')
         ON CONFLICT (pattern_slug) DO UPDATE SET title = tracks.title RETURNING id`,
      );
      await db.query("INSERT INTO track_weeks (week_start, track_id) VALUES ($1, $2)", [addDays(MON, 7), t.rows[0]!.id]);
      expect((await agent.get(`/api/problems/${p.slug}`)).body.pattern).toEqual({ slug: "two-pointers", name: "Two pointers", trackOpen: false });
      clock.t = at(addDays(MON, 7));
      expect((await agent.get(`/api/problems/${p.slug}`)).body.pattern).toEqual({ slug: "two-pointers", name: "Two pointers", trackOpen: true });
    }));
});
