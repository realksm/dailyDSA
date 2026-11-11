// Tracks (PLAN §2): the library, the lesson page and its ladder, progress, hints and lesson editing.
// Runs in a rolled-back transaction with the real bank, tracks and weeks hidden.
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import session from "express-session";
import type pg from "pg";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createPool } from "@dailydsa/db";
import { writeTests } from "@dailydsa/judge";
import type { History, ProblemView, Role, StaffTrack, TrackLibrary, TrackView } from "@dailydsa/shared";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { addDays } from "../src/ist.js";
import { memoryMailer } from "../src/mailer.js";
import { createUser } from "../src/users.js";

const dataDir = await mkdtemp(path.join(os.tmpdir(), "dsa-tracks-test-"));
const config = loadConfig({ NODE_ENV: "test", DATA_DIR: dataDir });
const pool = createPool(config.databaseUrl);
const dbUp = await pool.query("SELECT first_hint_at FROM user_problems LIMIT 1").then(() => true, () => false);
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
    await db.query("DELETE FROM track_problems");
    await db.query("DELETE FROM tracks");
    await fn(db);
  } finally {
    await db.query("ROLLBACK");
    db.release();
  }
}

let seq = 0;
let testsHash: string | undefined;
async function problem(db: pg.PoolClient, o: { kind: "daily" | "track"; pattern?: string; title?: string }) {
  const slug = `zz-tracks-test-${Date.now()}-${++seq}`;
  testsHash = await writeTests(dataDir, slug, [{ input: "1\n", answer: "1\n" }]);
  const r = await db.query<{ id: number }>(
    `INSERT INTO problems (slug, title, kind, pool, pattern_slug, statement_md, time_limits, sample_count, test_count, tests_hash, validated_at)
     VALUES ($1, $2, $3, $4, $5, 'x', '{"cpp":500,"java":500,"py":500}', 1, 1, $6, now()) RETURNING id`,
    [slug, o.title ?? slug, o.kind, o.kind === "track" ? null : "weekday", o.pattern ?? null, testsHash],
  );
  return { id: r.rows[0]!.id, slug };
}

async function track(db: pg.PoolClient, pattern: string, ladder: { hints?: string[] }[]) {
  const t = await db.query<{ id: number }>("INSERT INTO tracks (pattern_slug, title) VALUES ($1, $1) RETURNING id", [pattern]);
  const id = t.rows[0]!.id;
  const problems = [];
  for (const [i, step] of ladder.entries()) {
    const p = await problem(db, { kind: "track", pattern, title: `Step ${i + 1}` });
    await db.query("INSERT INTO track_problems (track_id, position, problem_id) VALUES ($1, $2, $3)", [id, i + 1, p.id]);
    for (const [l, body] of (step.hints ?? []).entries()) {
      await db.query("INSERT INTO problem_hints (problem_id, level, body_md) VALUES ($1, $2, $3)", [p.id, l + 1, body]);
    }
    problems.push(p);
  }
  return { id, problems };
}

const week = (db: pg.PoolClient, monday: string, trackId: number) =>
  db.query("INSERT INTO track_weeks (week_start, track_id) VALUES ($1, $2)", [monday, trackId]);

function harness(db: pg.PoolClient, clock: { t: Date }) {
  const app = createApp({
    config, pool: db as unknown as pg.Pool, sessionStore: new session.MemoryStore(), mailer: memoryMailer(), now: () => clock.t,
  });
  const signIn = async (role: Role = "solver") => {
    const email = `t${Date.now()}-${++seq}@tracks-test.local`;
    const user = await createUser(db, { email, name: `${role} ${seq}`, password: "whatever123", role });
    const agent = request.agent(app);
    expect((await agent.post("/api/auth/login").send({ email, password: "whatever123" })).status).toBe(200);
    return { agent, user };
  };
  return { app, signIn };
}

describe.skipIf(!dbUp)("tracks", () => {
  it("shows a track from its first week on, opening one ladder problem a day", () =>
    sandbox(async (db) => {
      const clock = { t: at(addDays(MON, 1)) }; // Tuesday
      const { app, signIn } = harness(db, clock);
      const { agent, user } = await signIn();
      const t = await track(db, "sliding-window", [{}, { hints: ["a", "b"] }, {}]);
      const lib = async () => (await agent.get("/api/tracks")).body as TrackLibrary;

      expect((await request(app).get("/api/tracks")).status).toBe(401);
      expect(await lib()).toEqual({ today: addDays(MON, 1), tracks: [] }); // not scheduled: hidden
      expect((await agent.get("/api/tracks/sliding-window")).status).toBe(404);
      expect((await agent.get("/api/tracks/Bad_Slug")).body.error.code).toBe("invalid_request");

      await week(db, addDays(MON, 7), t.id); // only next week: still hidden
      expect((await lib()).tracks).toEqual([]);

      await week(db, MON, t.id);
      const [x] = (await lib()).tracks;
      expect(x).toEqual({
        pattern: { slug: "sliding-window", name: "Sliding window" }, title: "sliding-window",
        weeks: [MON, addDays(MON, 7)], runningWeek: MON, released: true, hasLesson: false, solved: 0,
        ladder: [
          { position: 1, open: true, opensOn: null, problem: { slug: t.problems[0]!.slug, title: "Step 1" }, status: "new", hints: 0, hintsUsed: 0 },
          { position: 2, open: true, opensOn: null, problem: { slug: t.problems[1]!.slug, title: "Step 2" }, status: "new", hints: 2, hintsUsed: 0 },
          { position: 3, open: false, opensOn: addDays(MON, 2), problem: null, status: "new", hints: 0, hintsUsed: 0 },
        ],
      });

      // Progress: "1/3 solved"; attempted counts as attempted.
      await db.query("INSERT INTO user_problems (user_id, problem_id, solved_at, first_attempt_at, submit_count) VALUES ($1, $2, now(), now(), 1)", [user.id, t.problems[0]!.id]);
      await db.query("INSERT INTO user_problems (user_id, problem_id, first_attempt_at, submit_count) VALUES ($1, $2, now(), 1)", [user.id, t.problems[1]!.id]);
      const y = (await lib()).tracks[0]!;
      expect(y.solved).toBe(1);
      expect(y.ladder.map((s) => s.status)).toEqual(["solved", "attempted", "new"]);

      // The lesson page carries the lesson; after the week everything stays open.
      await db.query("UPDATE tracks SET lesson_md = '## How to spot it' WHERE id = $1", [t.id]);
      clock.t = at(addDays(MON, 30));
      const v = (await agent.get("/api/tracks/sliding-window")).body as TrackView;
      expect(v).toMatchObject({ lessonMd: "## How to spot it", hasLesson: true, runningWeek: null, today: addDays(MON, 30), solved: 1 });
      expect(v.ladder.every((s) => s.open && s.problem)).toBe(true);

      // A rerun week is the running week while it lasts.
      clock.t = at(addDays(MON, 13)); // Sunday of the second week
      expect((await lib()).tracks[0]!.runningWeek).toBe(addDays(MON, 7));
    }));

  it("orders the library and shows staff every track, released or not", () =>
    sandbox(async (db) => {
      const clock = { t: at(addDays(MON, 7)) };
      const { signIn } = harness(db, clock);
      const solver = await signIn();
      const setter = await signIn("setter");
      const old = await track(db, "two-pointers", [{}]);
      const now = await track(db, "prefix-sums", [{}, {}]);
      const soon = await track(db, "dp-1d", [{}]);
      await track(db, "heaps-top-k", [{}]); // never scheduled
      await week(db, MON, old.id);
      await week(db, addDays(MON, 7), now.id);
      await week(db, addDays(MON, 14), soon.id);

      const names = async (a: typeof solver) => ((await a.agent.get("/api/tracks")).body as TrackLibrary).tracks.map((t) => t.pattern.slug);
      expect(await names(solver)).toEqual(["prefix-sums", "two-pointers"]);
      expect(await names(setter)).toEqual(["prefix-sums", "two-pointers", "dp-1d", "heaps-top-k"]);

      // Staff see locked problems (to check them), still marked as locked.
      const lib = (await setter.agent.get("/api/tracks")).body as TrackLibrary;
      expect(lib.tracks.find((t) => t.pattern.slug === "dp-1d")).toMatchObject({
        released: false, runningWeek: null, ladder: [{ position: 1, open: false, opensOn: addDays(MON, 14), problem: { slug: soon.problems[0]!.slug } }],
      });
      expect((await setter.agent.get("/api/tracks/heaps-top-k")).status).toBe(200);
      expect((await solver.agent.get("/api/tracks/heaps-top-k")).status).toBe(404);
    }));

  it("gives hints in order, records them and counts them in history", () =>
    sandbox(async (db) => {
      const clock = { t: at(MON) };
      const { signIn } = harness(db, clock);
      const { agent, user } = await signIn();
      const t = await track(db, "two-pointers", [{ hints: ["h1", "h2", "h3"] }, { hints: ["only"] }, {}]);
      await week(db, MON, t.id);
      const [p1, p2, p3] = t.problems as [{ slug: string; id: number }, { slug: string; id: number }, { slug: string; id: number }];
      const hint = (slug: string, level: unknown) => agent.post(`/api/problems/${slug}/hints`).send({ level });

      expect((await agent.get(`/api/problems/${p1.slug}`)).body.track).toEqual({ position: 1, hints: 3, hintsUsed: 0, revealed: [] });
      expect((await hint(p1.slug, 2)).body.error.code).toBe("hint_order");
      expect((await hint(p1.slug, 0)).body.error.code).toBe("invalid_request");
      expect((await hint(p1.slug, 4)).body.error.code).toBe("invalid_request");
      const first = await hint(p1.slug, 1);
      expect(first.status).toBe(200);
      expect((first.body as ProblemView).track).toEqual({ position: 1, hints: 3, hintsUsed: 1, revealed: ["h1"] });
      expect(((await hint(p1.slug, 1)).body as ProblemView).track!.hintsUsed).toBe(1); // double click: no-op
      expect(((await hint(p1.slug, 2)).body as ProblemView).track!.revealed).toEqual(["h1", "h2"]);

      expect((await agent.post(`/api/problems/${p2.slug}/hints`).send({ level: 2 })).status).toBe(404); // opens Tuesday
      clock.t = at(addDays(MON, 2)); // Wednesday: #2 and #3 are open
      expect((await hint(p2.slug, 2)).body.error.code).toBe("no_such_hint");
      expect((await hint(p3.slug, 1)).body.error.code).toBe("no_hints");

      const daily = await problem(db, { kind: "daily" });
      await db.query("INSERT INTO daily_schedule (day, problem_id) VALUES ($1, $2)", [MON, daily.id]);
      expect((await hint(daily.slug, 1)).body.error.code).toBe("no_hints");

      // Hints show on the ladder; "solved with hints" only when a hint came before the solve.
      expect(((await agent.get("/api/tracks/two-pointers")).body as TrackView).ladder.map((s) => s.hintsUsed)).toEqual([2, 0, 0]);
      await db.query("UPDATE user_problems SET solved_at = first_hint_at + interval '1 minute' WHERE user_id = $1 AND problem_id = $2", [user.id, p1.id]);
      await db.query(
        "INSERT INTO user_problems (user_id, problem_id, solved_at, first_attempt_at, submit_count) VALUES ($1, $2, now() - interval '1 hour', now() - interval '1 hour', 1)",
        [user.id, p2.id],
      );
      expect((await hint(p2.slug, 1)).status).toBe(200); // a hint after solving
      const h = ((await agent.get("/api/history")).body as History).problems;
      expect(h.find((x) => x.problem.slug === p1.slug)).toMatchObject({ hintsUsed: 2, solvedWithHints: true, track: { position: 1 } });
      expect(h.find((x) => x.problem.slug === p2.slug)).toMatchObject({ hintsUsed: 1, solvedWithHints: false });
      const hintOnly = await db.query("SELECT last_hint_at FROM user_problems WHERE user_id = $1 AND problem_id = $2", [user.id, p2.id]);
      expect(h.find((x) => x.problem.slug === p2.slug)!.lastActivityAt).toBe((hintOnly.rows[0].last_hint_at as Date).toISOString());
    }));

  it("lists tracks for staff with their imported lessons", () =>
    sandbox(async (db) => {
      const clock = { t: at(MON) };
      const { app, signIn } = harness(db, clock);
      const solver = await signIn();
      const setter = await signIn("setter");
      const t = await track(db, "two-pointers", [{}, {}]);

      expect((await request(app).get("/api/admin/tracks")).status).toBe(401);
      expect((await solver.agent.get("/api/admin/tracks")).status).toBe(403);
      const before = (await setter.agent.get("/api/admin/tracks")).body as StaffTrack[];
      expect(before).toEqual([{
        id: t.id, title: "two-pointers", pattern: { slug: "two-pointers", name: "Two pointers" }, ladder: 2, hasLesson: false, updatedAt: expect.any(String),
      }]);

      // `dsa lesson import` writes the lesson; staff can read it before the track's week.
      await db.query("UPDATE tracks SET title = 'Two pointers', lesson_md = '## How to spot it' WHERE id = $1", [t.id]);
      expect(((await setter.agent.get("/api/admin/tracks")).body as StaffTrack[])[0]).toMatchObject({ title: "Two pointers", hasLesson: true });
      expect((await setter.agent.get("/api/tracks/two-pointers")).body).toMatchObject({ lessonMd: "## How to spot it", released: false });
      expect((await solver.agent.get("/api/tracks/two-pointers")).status).toBe(404);
      await week(db, MON, t.id);
      expect((await solver.agent.get("/api/tracks/two-pointers")).body).toMatchObject({ title: "Two pointers", lessonMd: "## How to spot it" });
    }));
});
