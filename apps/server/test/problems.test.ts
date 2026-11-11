// The problem page: who can open which problem when, and what it shows. Runs in a rolled-back
// transaction with the real bank hidden, against tests written to a temp DATA_DIR.
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import session from "express-session";
import type pg from "pg";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createPool } from "@dailydsa/db";
import { writeTests } from "@dailydsa/judge";
import type { ProblemView, Role } from "@dailydsa/shared";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { addDays } from "../src/ist.js";
import { memoryMailer } from "../src/mailer.js";
import { createUser } from "../src/users.js";

const dataDir = await mkdtemp(path.join(os.tmpdir(), "dsa-problems-test-"));
const config = loadConfig({ NODE_ENV: "test", DATA_DIR: dataDir });
const pool = createPool(config.databaseUrl);
const dbUp = await pool.query("SELECT 1 FROM daily_schedule LIMIT 1").then(() => true, () => false);
afterAll(async () => {
  await pool.end();
  await rm(dataDir, { recursive: true, force: true });
});

const MON = "2030-01-07"; // a Monday

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
async function problem(
  db: pg.PoolClient,
  o: { kind?: "daily" | "track"; pool?: "weekday" | "weekend"; pattern?: string; checker?: boolean; spec?: object } = {},
) {
  const slug = `zz-problem-test-${Date.now()}-${++seq}`;
  const kind = o.kind ?? "daily";
  const hash = await writeTests(dataDir, slug, [
    { input: "3\n1 2 3\n", answer: "6\n" },
    { input: "1\n5\n", answer: "5\n" },
    { input: "2\n9 9\n", answer: "18\n" }, // hidden
  ]);
  const r = await db.query<{ id: number }>(
    `INSERT INTO problems (slug, title, kind, pool, pattern_slug, statement_md, input_spec, time_limits, memory_mb, output_mb,
                           checker_py, sample_count, test_count, tests_hash, validated_at)
     VALUES ($1, 'Sum it', $2, $3, $4, 'Add the numbers.', $5, '{"cpp":500,"java":700,"py":900}', 256, 64, $6, 2, 3, $7, now())
     RETURNING id`,
    [slug, kind, kind === "track" ? null : (o.pool ?? "weekday"), o.pattern ?? null, o.spec ? JSON.stringify(o.spec) : null,
     o.checker ? "print('ok')" : null, hash],
  );
  return { id: r.rows[0]!.id, slug };
}

async function trackProblem(db: pg.PoolClient, pattern: string, position: number, hints: number) {
  const p = await problem(db, { kind: "track", pattern });
  const t = await db.query<{ id: number }>(
    `INSERT INTO tracks (pattern_slug, title) VALUES ($1, $1)
     ON CONFLICT (pattern_slug) DO UPDATE SET title = tracks.title RETURNING id`,
    [pattern],
  );
  await db.query("DELETE FROM track_problems WHERE track_id = $1 AND position = $2", [t.rows[0]!.id, position]);
  await db.query("INSERT INTO track_problems (track_id, position, problem_id) VALUES ($1, $2, $3)", [t.rows[0]!.id, position, p.id]);
  for (let l = 1; l <= hints; l++) await db.query("INSERT INTO problem_hints (problem_id, level, body_md) VALUES ($1, $2, 'h')", [p.id, l]);
  return { ...p, trackId: t.rows[0]!.id };
}

async function signIn(db: pg.PoolClient, clock: { t: Date }, role: Role = "solver") {
  const app = createApp({
    config, pool: db as unknown as pg.Pool, sessionStore: new session.MemoryStore(), mailer: memoryMailer(), now: () => clock.t,
  });
  const email = `p${Date.now()}-${++seq}@problems-test.local`;
  const user = await createUser(db, { email, name: "P", password: "whatever123", role });
  const agent = request.agent(app);
  expect((await agent.post("/api/auth/login").send({ email, password: "whatever123" })).status).toBe(200);
  return { app, agent, user };
}

const at = (day: string) => new Date(`${day}T00:00:00+05:30`);

describe.skipIf(!dbUp)("GET /api/problems/:slug", () => {
  it("opens a daily problem from its day on, with samples, templates and limits", () =>
    sandbox(async (db) => {
      const clock = { t: at(MON) };
      const { app, agent, user } = await signIn(db, clock);
      const p = await problem(db, { pool: "weekend", pattern: "two-pointers", checker: true,
        spec: { vars: [{ name: "n", type: "int" }, { name: "a", type: "int[]", length: "n" }], returns: "long" } });

      expect((await request(app).get(`/api/problems/${p.slug}`)).status).toBe(401);
      expect((await agent.get(`/api/problems/${p.slug}`)).status).toBe(404); // never shown
      await db.query("INSERT INTO daily_schedule (day, problem_id) VALUES ($1, $2)", [addDays(MON, 5), p.id]); // a pin on Saturday
      expect((await agent.get(`/api/problems/${p.slug}`)).status).toBe(404); // not yet
      expect((await agent.get("/api/problems/zz-nope")).body.error.code).toBe("not_found");
      expect((await agent.get("/api/problems/Bad_Slug")).body.error.code).toBe("invalid_request");

      clock.t = at(addDays(MON, 5));
      const res = await agent.get(`/api/problems/${p.slug}`);
      expect(res.status).toBe(200);
      const v = res.body as ProblemView;
      expect(v).toMatchObject({
        slug: p.slug, title: "Sum it", kind: "daily", statementMd: "Add the numbers.",
        samples: [{ input: "3\n1 2 3\n", output: "6\n" }, { input: "1\n5\n", output: "5\n" }],
        anyValidAnswer: true,
        limits: { timeMs: { cpp: 500, java: 700, py: 900 }, memoryMb: 256, outputMb: 64 },
        status: "new", solvedAt: null, solutionsUnlocked: false, canUnlockSolutions: false,
        pattern: null, // hidden until solved or unlocked, even on the track's weekend
        track: null, dailyDays: [addDays(MON, 5)],
      });
      expect(v.templates.cpp).toContain("solve(");
      expect(v.templates.java).toContain("solve(");
      expect(v.templates.py).toContain("def solve(");

      // A real attempt offers the Show solutions button; solving reveals the pattern.
      await db.query("INSERT INTO user_problems (user_id, problem_id, first_attempt_at, submit_count) VALUES ($1, $2, now(), 1)", [user.id, p.id]);
      expect((await agent.get(`/api/problems/${p.slug}`)).body).toMatchObject({ status: "attempted", canUnlockSolutions: true, pattern: null });
      await db.query("UPDATE user_problems SET solved_at = now() WHERE user_id = $1 AND problem_id = $2", [user.id, p.id]);
      expect((await agent.get(`/api/problems/${p.slug}`)).body).toMatchObject({
        status: "solved", solutionsUnlocked: true, canUnlockSolutions: false, pattern: { slug: "two-pointers", name: "Two pointers" },
      });

      // Retired problems stay open from the archive.
      await db.query("UPDATE problems SET active = false WHERE id = $1", [p.id]);
      expect((await agent.get(`/api/problems/${p.slug}`)).status).toBe(200);
    }));

  it("unlocking solutions without solving also reveals the pattern", () =>
    sandbox(async (db) => {
      const clock = { t: at(MON) };
      const { agent, user } = await signIn(db, clock);
      const p = await problem(db, { pool: "weekend", pattern: "two-pointers" });
      await db.query("INSERT INTO daily_schedule (day, problem_id) VALUES ($1, $2)", [MON, p.id]);
      await db.query(
        "INSERT INTO user_problems (user_id, problem_id, first_attempt_at, solutions_unlocked_at, submit_count) VALUES ($1, $2, now(), now(), 1)",
        [user.id, p.id],
      );
      expect((await agent.get(`/api/problems/${p.slug}`)).body).toMatchObject({
        status: "attempted", solutionsUnlocked: true, canUnlockSolutions: false, pattern: { slug: "two-pointers" }, anyValidAnswer: false,
      });
    }));

  it("opens a track problem on its ladder day and keeps it open after the week", () =>
    sandbox(async (db) => {
      const clock = { t: at(MON) };
      const { agent } = await signIn(db, clock);
      const p = await trackProblem(db, "sliding-window", 3, 2);
      expect((await agent.get(`/api/problems/${p.slug}`)).status).toBe(404); // track not scheduled
      await db.query("INSERT INTO track_weeks (week_start, track_id) VALUES ($1, $2)", [MON, p.trackId]);
      clock.t = at(addDays(MON, 1)); // Tuesday: position 3 opens Wednesday
      expect((await agent.get(`/api/problems/${p.slug}`)).status).toBe(404);
      clock.t = new Date(at(addDays(MON, 2)).getTime() - 1); // one ms before Wednesday IST
      expect((await agent.get(`/api/problems/${p.slug}`)).status).toBe(404);
      clock.t = at(addDays(MON, 2));
      expect((await agent.get(`/api/problems/${p.slug}`)).body).toMatchObject({
        kind: "track", pattern: { slug: "sliding-window", name: "Sliding window" }, track: { position: 3, hints: 2, hintsUsed: 0 }, dailyDays: [],
      });
      clock.t = at(addDays(MON, 40));
      expect((await agent.get(`/api/problems/${p.slug}`)).status).toBe(200);
    }));

  it("lets setters and admins open problems before they're released", () =>
    sandbox(async (db) => {
      const clock = { t: at(MON) };
      const p = await problem(db);
      const t = await trackProblem(db, "dp-1d", 5, 0);
      for (const role of ["setter", "admin"] as const) {
        const { agent } = await signIn(db, clock, role);
        expect((await agent.get(`/api/problems/${p.slug}`)).status).toBe(200);
        expect((await agent.get(`/api/problems/${t.slug}`)).body.track).toEqual({ position: 5, hints: 0, hintsUsed: 0, revealed: [] });
      }
    }));
});
