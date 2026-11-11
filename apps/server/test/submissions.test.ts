// Run/Submit: the queue API (needs Postgres) and the worker judging real code (needs go-judge too).
// Runs in a rolled-back transaction with the real bank and queue hidden, against tests in a temp DATA_DIR.
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import session from "express-session";
import type pg from "pg";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createPool } from "@dailydsa/db";
import { GoJudge, writeTests } from "@dailydsa/judge";
import type { ProblemView, Role, SubmissionView } from "@dailydsa/shared";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { memoryMailer } from "../src/mailer.js";
import { judgeNext, requeueRunning } from "../src/submissions.js";
import { createUser } from "../src/users.js";

const dataDir = await mkdtemp(path.join(os.tmpdir(), "dsa-submissions-test-"));
const config = loadConfig({ NODE_ENV: "test", DATA_DIR: dataDir });
const pool = createPool(config.databaseUrl);
const dbUp = await pool.query("SELECT 1 FROM submissions LIMIT 1").then(() => true, () => false);
const gj = new GoJudge(config.judgeUrl);
const judgeUp = await fetch(`${gj.url}/version`).then((r) => r.ok, () => false);
afterAll(async () => {
  await pool.end();
  await rm(dataDir, { recursive: true, force: true });
});

const DAY = "2030-01-08";
const at = (day: string) => new Date(`${day}T00:00:00+05:30`);

async function sandbox(fn: (db: pg.PoolClient) => Promise<void>) {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    await db.query("UPDATE problems SET active = false");
    await db.query("DELETE FROM daily_schedule");
    await db.query("DELETE FROM track_weeks");
    await db.query("UPDATE submissions SET status = 'done' WHERE status <> 'done'"); // hide the real queue
    await fn(db);
  } finally {
    await db.query("ROLLBACK");
    db.release();
  }
}

let seq = 0;
/** "Sum the n numbers": 2 samples + 1 hidden test. `released` = it is the daily on DAY. */
async function problem(db: pg.PoolClient, o: { released?: boolean; testsHash?: string } = {}) {
  const slug = `zz-sub-test-${Date.now()}-${++seq}`;
  const hash = await writeTests(dataDir, slug, [
    { input: "3\n1 2 3\n", answer: "6\n" },
    { input: "1\n5\n", answer: "5\n" },
    { input: "2\n9 9\n", answer: "18\n" }, // hidden
  ]);
  const r = await db.query<{ id: number }>(
    `INSERT INTO problems (slug, title, kind, pool, statement_md, time_limits, memory_mb, output_mb, sample_count, test_count, tests_hash, validated_at)
     VALUES ($1, 'Sum it', 'daily', 'weekday', 'Add.', '{"cpp":1000,"java":2000,"py":1000}', 256, 1, 2, 3, $2, now()) RETURNING id`,
    [slug, o.testsHash ?? hash],
  );
  const id = r.rows[0]!.id;
  if (o.released ?? true) await db.query("INSERT INTO daily_schedule (day, problem_id) VALUES ($1, $2)", [DAY, id]);
  return { id, slug };
}

async function signIn(db: pg.PoolClient, clock: { t: Date }, role: Role = "solver") {
  const app = createApp({
    config, pool: db as unknown as pg.Pool, sessionStore: new session.MemoryStore(), mailer: memoryMailer(), now: () => clock.t,
  });
  const email = `s${Date.now()}-${++seq}@submissions-test.local`;
  const user = await createUser(db, { email, name: "S", password: "whatever123", role });
  const agent = request.agent(app);
  expect((await agent.post("/api/auth/login").send({ email, password: "whatever123" })).status).toBe(200);
  return { app, agent, user };
}

const CPP_OK = `#include <bits/stdc++.h>
int main(){long long n,s=0,x;std::cin>>n;while(n--){std::cin>>x;s+=x;}std::cout<<s<<"\\n";}`;
const CPP_WRONG_ON_HIDDEN = `#include <bits/stdc++.h>
int main(){long long n,s=0,x;std::cin>>n;while(n--){std::cin>>x;s+=x;}std::cout<<(s==18?17:s)<<"\\n";}`;
const PY_OK = "n = int(input())\nprint(sum(map(int, input().split())))\n";

describe.skipIf(!dbUp)("Run/Submit queue API", () => {
  it("queues Run/Submit for released problems only, one at a time, at most every 5 s", () =>
    sandbox(async (db) => {
      const clock = { t: at(DAY) };
      const { app, agent } = await signIn(db, clock);
      const p = await problem(db);
      const hidden = await problem(db, { released: false });

      expect((await request(app).post(`/api/problems/${p.slug}/run`).send({ lang: "cpp", code: CPP_OK })).status).toBe(401);
      expect((await agent.post(`/api/problems/${hidden.slug}/submit`).send({ lang: "cpp", code: CPP_OK })).status).toBe(404);
      const bad = await agent.post(`/api/problems/${p.slug}/submit`).send({ lang: "rust", code: "" });
      expect(bad.status).toBe(400);
      expect(bad.body.error.details.map((d: { path: string }) => d.path).sort()).toEqual(["code", "lang"]);

      const run = await agent.post(`/api/problems/${p.slug}/run`).send({ lang: "py", code: PY_OK, customInput: "2\n1 1\n" });
      expect(run.status).toBe(202);
      expect(run.body).toEqual({ id: expect.any(Number), status: "queued" });
      const view = (await agent.get(`/api/submissions/${run.body.id}`)).body as SubmissionView;
      expect(view).toMatchObject({
        id: run.body.id, problem: { slug: p.slug, title: "Sum it" }, kind: "run", lang: "py", code: PY_OK,
        status: "queued", queuePosition: 1, verdict: null, result: null, finishedAt: null,
      });

      // Still queued → busy, even after the 5 s.
      clock.t = new Date(clock.t.getTime() + 6000);
      expect((await agent.post(`/api/problems/${p.slug}/submit`).send({ lang: "cpp", code: CPP_OK })).body.error.code).toBe("busy");

      // Judged → the next one is fine, but not twice within 5 s.
      await db.query("UPDATE submissions SET status = 'done', verdict = 'AC' WHERE id = $1", [run.body.id]);
      expect((await agent.post(`/api/problems/${p.slug}/submit`).send({ lang: "cpp", code: CPP_OK })).status).toBe(202);
      await db.query("UPDATE submissions SET status = 'done' WHERE status <> 'done'");
      const fast = await agent.post(`/api/problems/${p.slug}/submit`).send({ lang: "cpp", code: CPP_OK });
      expect([fast.status, fast.body.error.code]).toEqual([429, "rate_limited"]);
      clock.t = new Date(clock.t.getTime() + 5000);
      expect((await agent.post(`/api/problems/${p.slug}/submit`).send({ lang: "cpp", code: "// v2" })).status).toBe(202);

      // The editor reopens with the latest code per language.
      expect(((await agent.get(`/api/problems/${p.slug}`)).body as ProblemView).lastCode).toEqual({ cpp: "// v2", py: PY_OK });
    }));

  it("shows a submission only to its owner and to admins", () =>
    sandbox(async (db) => {
      const clock = { t: at(DAY) };
      const owner = await signIn(db, clock);
      const p = await problem(db);
      const { body } = await owner.agent.post(`/api/problems/${p.slug}/submit`).send({ lang: "cpp", code: CPP_OK });
      expect((await (await signIn(db, clock)).agent.get(`/api/submissions/${body.id}`)).status).toBe(404);
      expect((await (await signIn(db, clock, "setter")).agent.get(`/api/submissions/${body.id}`)).status).toBe(404);
      expect((await (await signIn(db, clock, "admin")).agent.get(`/api/submissions/${body.id}`)).status).toBe(200);
      expect((await owner.agent.get("/api/submissions/abc")).body.error.code).toBe("invalid_request");
    }));

  it("sends interrupted submissions back to the queue", () =>
    sandbox(async (db) => {
      const clock = { t: at(DAY) };
      const { agent } = await signIn(db, clock);
      const p = await problem(db);
      const { body } = await agent.post(`/api/problems/${p.slug}/submit`).send({ lang: "cpp", code: CPP_OK });
      await db.query("UPDATE submissions SET status = 'running' WHERE id = $1", [body.id]);
      expect(await requeueRunning(db)).toBe(1);
      expect((await agent.get(`/api/submissions/${body.id}`)).body.status).toBe("queued");
    }));

  it("puts the submission back when go-judge is unreachable", () =>
    sandbox(async (db) => {
      const clock = { t: at(DAY) };
      const { agent } = await signIn(db, clock);
      const p = await problem(db);
      const { body } = await agent.post(`/api/problems/${p.slug}/submit`).send({ lang: "py", code: PY_OK });
      const log = { info: () => {}, error: () => {} };
      expect(await judgeNext(db, { gj: new GoJudge("http://127.0.0.1:1"), dataDir, log })).toBe("unavailable");
      expect((await agent.get(`/api/submissions/${body.id}`)).body).toMatchObject({ status: "queued", verdict: null });
    }));
});

describe.skipIf(!dbUp || !judgeUp)("judge worker", () => {
  const errors: unknown[] = [];
  const log = { info: () => {}, error: (e: unknown) => void errors.push(e) };
  const next = (db: pg.PoolClient) => judgeNext(db, { gj, dataDir, log });

  async function progress(db: pg.PoolClient, userId: number, problemId: number) {
    const r = await db.query(
      "SELECT submit_count, first_attempt_at, solved_at, solved_verdict_lang FROM user_problems WHERE user_id = $1 AND problem_id = $2",
      [userId, problemId],
    );
    return r.rows[0];
  }

  it("judges Submit: hidden failure reveals only that test; CE isn't an attempt; AC solves", () =>
    sandbox(async (db) => {
      const clock = { t: at(DAY) };
      const { agent, user } = await signIn(db, clock);
      const p = await problem(db);
      const submit = async (lang: string, code: string) => {
        clock.t = new Date(clock.t.getTime() + 5000);
        const { body } = await agent.post(`/api/problems/${p.slug}/submit`).send({ lang, code });
        expect(await next(db)).toBe("judged");
        return (await agent.get(`/api/submissions/${body.id}`)).body as SubmissionView;
      };

      const ce = await submit("cpp", "int main( {");
      expect(ce).toMatchObject({ status: "done", verdict: "CE", queuePosition: null, result: { verdict: "CE", tests: [] } });
      expect(ce.result!.compileLog).toMatch(/error/);
      expect(await progress(db, user.id, p.id)).toMatchObject({ submit_count: 1, first_attempt_at: null, solved_at: null });
      expect(((await agent.get(`/api/problems/${p.slug}`)).body as ProblemView)).toMatchObject({ status: "attempted", canUnlockSolutions: false });

      const wa = await submit("cpp", CPP_WRONG_ON_HIDDEN);
      expect(wa.verdict).toBe("WA");
      expect(wa.result!.tests.map((t) => t.verdict)).toEqual(["AC", "AC", "WA"]);
      expect(wa.result!.tests[2]).toMatchObject({ input: "2\n9 9\n", output: "17\n", expected: "18\n" });
      expect(await progress(db, user.id, p.id)).toMatchObject({ submit_count: 2, first_attempt_at: expect.any(Date), solved_at: null });
      expect(((await agent.get(`/api/problems/${p.slug}`)).body as ProblemView).canUnlockSolutions).toBe(true);

      const ac = await submit("cpp", CPP_OK);
      expect(ac.verdict).toBe("AC");
      expect(ac.result!.tests).toHaveLength(3);
      expect(ac.result!.tests[2]!.input).toBeUndefined(); // hidden and passed
      const after = await progress(db, user.id, p.id);
      expect(after).toMatchObject({ submit_count: 3, solved_verdict_lang: "cpp" });
      expect(after.solved_at.toISOString()).toBe(ac.createdAt); // the submit's time, not the judging's
      expect(((await agent.get(`/api/problems/${p.slug}`)).body as ProblemView)).toMatchObject({ status: "solved", solutionsUnlocked: true });

      // A later WA in another language doesn't unsolve it.
      await submit("py", "print(0)");
      expect(await progress(db, user.id, p.id)).toMatchObject({ submit_count: 4, solved_verdict_lang: "cpp", solved_at: after.solved_at });
      expect(await next(db)).toBe("idle");
    }));

  it("judges Run on every sample plus the custom input, without touching progress", () =>
    sandbox(async (db) => {
      const clock = { t: at(DAY) };
      const { agent, user } = await signIn(db, clock);
      const p = await problem(db);
      const { body } = await agent.post(`/api/problems/${p.slug}/run`).send({ lang: "py", code: "print(6)", customInput: "2\n1 1\n" });
      expect(await next(db)).toBe("judged");
      const v = (await agent.get(`/api/submissions/${body.id}`)).body as SubmissionView;
      expect(v.verdict).toBe("WA"); // sample 2 expects 5
      expect(v.result!.tests).toMatchObject([
        { verdict: "AC", input: "3\n1 2 3\n", expected: "6\n" },
        { verdict: "WA", output: "6\n", expected: "5\n" },
        { verdict: "AC", custom: true, input: "2\n1 1\n", output: "6\n" },
      ]);
      expect(v.result!.tests[2]!.expected).toBeUndefined();
      expect(await progress(db, user.id, p.id)).toBeUndefined();
    }));

  it("gives IE (and logs) when the tests are missing on disk", () =>
    sandbox(async (db) => {
      const clock = { t: at(DAY) };
      const { agent, user } = await signIn(db, clock);
      const p = await problem(db, { testsHash: "0000000000000000" });
      const { body } = await agent.post(`/api/problems/${p.slug}/submit`).send({ lang: "py", code: PY_OK });
      errors.length = 0;
      expect(await next(db)).toBe("judged");
      expect((await agent.get(`/api/submissions/${body.id}`)).body).toMatchObject({ status: "done", verdict: "IE" });
      expect(errors).toHaveLength(1);
      expect(await progress(db, user.id, p.id)).toBeUndefined();
    }));
});
