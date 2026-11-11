// IST helpers (pure), the daily pick rules and the daily routes. The db parts run inside one
// transaction per test that is rolled back, after hiding the real problems and schedule.
import session from "express-session";
import type pg from "pg";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createPool } from "@dailydsa/db";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { chooseDailyProblem, dailyEntries, ensureDailyPick } from "../src/daily.js";
import { addDays, isDay, isoWeekday, isWeekend, istDate, nextIstMidnight, weekStart } from "../src/ist.js";
import { memoryMailer } from "../src/mailer.js";
import { createUser } from "../src/users.js";

describe("IST dates", () => {
  it("rolls over at 18:30 UTC", () => {
    expect(istDate(new Date("2026-11-10T18:29:59.999Z"))).toBe("2026-11-10");
    expect(istDate(new Date("2026-11-10T18:30:00Z"))).toBe("2026-11-11");
    expect(nextIstMidnight(new Date("2026-11-10T18:29:00Z")).toISOString()).toBe("2026-11-10T18:30:00.000Z");
    expect(nextIstMidnight(new Date("2026-11-10T18:30:00Z")).toISOString()).toBe("2026-11-11T18:30:00.000Z");
  });

  it("does weekdays, weeks and day arithmetic", () => {
    expect(isoWeekday("2026-11-09")).toBe(1); // Monday
    expect(isoWeekday("2026-11-15")).toBe(7);
    expect(isWeekend("2026-11-14")).toBe(true);
    expect(isWeekend("2026-11-13")).toBe(false);
    expect(weekStart("2026-11-15")).toBe("2026-11-09");
    expect(weekStart("2026-11-09")).toBe("2026-11-09");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
  });

  it("only accepts real YYYY-MM-DD dates", () => {
    expect(isDay("2026-02-28")).toBe(true);
    expect(isDay("2026-02-29")).toBe(false);
    expect(isDay("2026-1-05")).toBe(false);
    expect(isDay("today")).toBe(false);
  });
});

const config = loadConfig({ NODE_ENV: "test" });
const pool = createPool(config.databaseUrl);
const dbUp = await pool.query("SELECT 1 FROM daily_schedule LIMIT 1").then(() => true, () => false);
afterAll(() => pool.end());

/** Runs `fn` in a transaction that is always rolled back, with the real bank hidden. */
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
async function problem(db: pg.PoolClient, o: { kind?: "daily" | "track"; pool?: "weekday" | "weekend" | null; pattern?: string | null; active?: boolean } = {}) {
  const kind = o.kind ?? "daily";
  const r = await db.query<{ id: number }>(
    `INSERT INTO problems (slug, title, kind, pool, pattern_slug, statement_md, time_limits, test_count, tests_hash, validated_at, active)
     VALUES ($1, $1, $2, $3, $4, '', '{}', 1, 'x', now(), $5) RETURNING id`,
    [`zz-daily-test-${++seq}`, kind, kind === "track" ? null : (o.pool ?? "weekday"), o.pattern ?? null, o.active ?? true],
  );
  return r.rows[0]!.id;
}

async function scheduleTrack(db: pg.PoolClient, week: string, pattern: string) {
  const t = await db.query<{ id: number }>(
    `INSERT INTO tracks (pattern_slug, title) VALUES ($1, $1)
     ON CONFLICT (pattern_slug) DO UPDATE SET title = tracks.title RETURNING id`,
    [pattern],
  );
  await db.query("INSERT INTO track_weeks (week_start, track_id) VALUES ($1, $2)", [week, t.rows[0]!.id]);
}

// 2030-01-07 is a Monday.
const MON = "2030-01-07";
const SAT = addDays(MON, 5);
const SUN = addDays(MON, 6);

describe.skipIf(!dbUp)("daily pick (needs db + migrations)", () => {
  it("cycles the weekday pool, least recently shown first, and stores each pick once", () =>
    sandbox(async (db) => {
      const ids = [await problem(db), await problem(db), await problem(db)];
      await problem(db, { active: false });
      await problem(db, { kind: "track", pattern: "two-pointers" });
      await problem(db, { pool: "weekend", pattern: "sliding-window" });

      const week = [];
      for (let i = 0; i < 3; i++) week.push(await ensureDailyPick(db, addDays(MON, i)));
      expect(week.map((p) => p!.rule)).toEqual(["weekday", "weekday", "weekday"]);
      expect(new Set(week.map((p) => p!.problemId))).toEqual(new Set(ids));

      const thu = await ensureDailyPick(db, addDays(MON, 3));
      expect(thu!.problemId).toBe(week[0]!.problemId); // Monday's is the least recent
      expect(await ensureDailyPick(db, MON)).toEqual({ day: MON, problemId: week[0]!.problemId }); // no rule: not re-picked
    }));

  it("counts a future pin as shown", () =>
    sandbox(async (db) => {
      const pinned = await problem(db);
      const other = await problem(db);
      await db.query("INSERT INTO daily_schedule (day, problem_id) VALUES ($1, $2)", [addDays(MON, 20), pinned]);
      expect((await ensureDailyPick(db, MON))!.problemId).toBe(other);
    }));

  it("weekends: the week's track pattern, else patterns that already ran, else the weekday pool", () =>
    sandbox(async (db) => {
      const weekday = await problem(db);
      const sw = [await problem(db, { pool: "weekend", pattern: "sliding-window" }), await problem(db, { pool: "weekend", pattern: "sliding-window" })];
      await problem(db, { pool: "weekend", pattern: "bfs-dfs" }); // its track never ran: must not be used
      await scheduleTrack(db, MON, "sliding-window");

      // A weekend before any track has run: nothing weekend-eligible yet.
      expect(await chooseDailyProblem(db, addDays(SAT, -7))).toEqual({ problemId: weekday, rule: "weekday-fallback" });

      const sat = await ensureDailyPick(db, SAT);
      const sun = await ensureDailyPick(db, SUN);
      expect([sat!.rule, sun!.rule]).toEqual(["week-track", "week-track"]);
      expect(new Set([sat!.problemId, sun!.problemId])).toEqual(new Set(sw));

      // Next week has no track: sliding window already ran, BFS didn't.
      const next = await ensureDailyPick(db, addDays(SAT, 7));
      expect(next).toMatchObject({ problemId: sat!.problemId, rule: "ran-tracks" });

      // A track week whose pattern has no weekend problems falls through the same way.
      await scheduleTrack(db, addDays(MON, 14), "dp-1d");
      expect(await chooseDailyProblem(db, addDays(SAT, 14))).toMatchObject({ rule: "ran-tracks" });
    }));

  it("returns undefined when nothing is eligible", () =>
    sandbox(async (db) => {
      expect(await ensureDailyPick(db, MON)).toBeUndefined();
      expect((await db.query("SELECT count(*)::int AS n FROM daily_schedule")).rows[0].n).toBe(0);
    }));

  it("entries hide the pattern until solved or unlocked and mark repeats as review", () =>
    sandbox(async (db) => {
      const user = await createUser(db, { email: `d${Date.now()}@daily-test.local`, name: "D", password: "whatever123", role: "solver" });
      const a = await problem(db, { pattern: "prefix-sums" });
      const b = await problem(db, { pattern: "two-pointers" });
      for (const [day, id] of [[MON, a], [addDays(MON, 1), b], [addDays(MON, 2), a]] as const) {
        await db.query("INSERT INTO daily_schedule (day, problem_id) VALUES ($1, $2)", [day, id]);
      }
      await db.query("INSERT INTO user_problems (user_id, problem_id, first_attempt_at, solved_at) VALUES ($1, $2, now(), now())", [user.id, a]);
      await db.query("INSERT INTO user_problems (user_id, problem_id, submit_count) VALUES ($1, $2, 1)", [user.id, b]);

      const all = await dailyEntries(db, { userId: user.id, today: addDays(MON, 1) });
      expect(all.map((e) => e.day)).toEqual([addDays(MON, 1), MON]); // nothing after "today"
      expect(all[0]).toMatchObject({ status: "attempted", pattern: null, review: null, solvedAt: null, weekend: false });
      expect(all[1]).toMatchObject({ status: "solved", pattern: { slug: "prefix-sums", name: "Prefix sums" } });

      const [wed] = await dailyEntries(db, { userId: user.id, today: SUN, day: addDays(MON, 2) });
      expect(wed!.review).toEqual({ lastShownOn: MON });

      await db.query("UPDATE user_problems SET solutions_unlocked_at = now() WHERE problem_id = $1", [b]);
      const [tue] = await dailyEntries(db, { userId: user.id, today: SUN, day: addDays(MON, 1) });
      expect(tue!.pattern?.slug).toBe("two-pointers");
    }));

  it("serves today, one day and the paged archive", () =>
    sandbox(async (db) => {
      let clock = new Date(`${MON}T00:00:00+05:30`); // first second of Monday IST
      const app = createApp({
        config, pool: db as unknown as pg.Pool, sessionStore: new session.MemoryStore(), mailer: memoryMailer(), now: () => clock,
      });
      const email = `r${Date.now()}@daily-test.local`;
      await createUser(db, { email, name: "R", password: "whatever123", role: "solver" });
      expect((await request(app).get("/api/daily/today")).status).toBe(401);

      const agent = request.agent(app);
      expect((await agent.post("/api/auth/login").send({ email, password: "whatever123" })).status).toBe(200);
      expect((await agent.get("/api/daily/today")).body.error.code).toBe("no_daily");

      const a = await problem(db);
      const today = await agent.get("/api/daily/today");
      expect(today.body).toMatchObject({ day: MON, status: "new", nextRolloverAt: "2030-01-07T18:30:00.000Z" });

      for (let i = 1; i <= 3; i++) {
        clock = new Date(clock.getTime() + 86_400_000);
        expect((await agent.get("/api/daily/today")).body.problem.slug).toBe(today.body.problem.slug); // one problem: it repeats
      }
      expect((await agent.get("/api/daily/today")).body.review).toEqual({ lastShownOn: addDays(MON, 2) });

      const p1 = await agent.get("/api/daily?limit=3");
      expect(p1.body.days.map((d: { day: string }) => d.day)).toEqual([addDays(MON, 3), addDays(MON, 2), addDays(MON, 1)]);
      expect(p1.body.nextBefore).toBe(addDays(MON, 1));
      const p2 = await agent.get(`/api/daily?limit=3&before=${p1.body.nextBefore}`);
      expect(p2.body).toEqual({ days: [expect.objectContaining({ day: MON })], nextBefore: null });

      expect((await agent.get(`/api/daily/${MON}`)).body.problem.slug).toBe(today.body.problem.slug);
      await db.query("INSERT INTO daily_schedule (day, problem_id) VALUES ($1, $2)", [addDays(MON, 9), a]); // a future pin
      expect((await agent.get(`/api/daily/${addDays(MON, 9)}`)).status).toBe(404);
      expect((await agent.get("/api/daily/2030-02-30")).body.error.code).toBe("invalid_request");
      expect((await agent.get("/api/daily?limit=0")).status).toBe(400);
    }));
});
