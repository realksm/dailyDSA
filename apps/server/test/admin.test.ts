// The admin API: who may call what, users, invite codes, the problem list, pins and track weeks.
// Runs in a rolled-back transaction with the real bank, schedule and track weeks hidden.
import session from "express-session";
import type pg from "pg";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createPool } from "@dailydsa/db";
import type { AdminUser, InviteCode, Role, Schedule, StaffProblem } from "@dailydsa/shared";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { addDays } from "../src/ist.js";
import { memoryMailer } from "../src/mailer.js";
import { createUser } from "../src/users.js";

const config = loadConfig({ NODE_ENV: "test" });
const pool = createPool(config.databaseUrl);
const dbUp = await pool.query("SELECT 1 FROM daily_schedule LIMIT 1").then(() => true, () => false);
afterAll(() => pool.end());

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
async function problem(db: pg.PoolClient, o: { kind?: "daily" | "track"; pool?: "weekday" | "weekend"; pattern?: string; active?: boolean } = {}) {
  const kind = o.kind ?? "daily";
  const slug = `zz-admin-test-${Date.now()}-${++seq}`;
  const r = await db.query<{ id: number }>(
    `INSERT INTO problems (slug, title, kind, pool, pattern_slug, statement_md, time_limits, test_count, tests_hash, validated_at, active)
     VALUES ($1, $1, $2, $3, $4, '', '{}', 1, 'x', now(), $5) RETURNING id`,
    [slug, kind, kind === "track" ? null : (o.pool ?? "weekday"), o.pattern ?? null, o.active ?? true],
  );
  return { id: r.rows[0]!.id, slug };
}

async function trackProblem(db: pg.PoolClient, pattern: string, position: number) {
  const p = await problem(db, { kind: "track", pattern });
  const t = await db.query<{ id: number }>(
    `INSERT INTO tracks (pattern_slug, title) VALUES ($1, $1) ON CONFLICT (pattern_slug) DO UPDATE SET title = tracks.title RETURNING id`,
    [pattern],
  );
  await db.query("DELETE FROM track_problems WHERE track_id = $1", [t.rows[0]!.id]);
  await db.query("INSERT INTO track_problems (track_id, position, problem_id) VALUES ($1, $2, $3)", [t.rows[0]!.id, position, p.id]);
  return { ...p, trackId: t.rows[0]!.id };
}

function harness(db: pg.PoolClient, clock: { t: Date }) {
  const app = createApp({
    config, pool: db as unknown as pg.Pool, sessionStore: new session.MemoryStore(), mailer: memoryMailer(), now: () => clock.t,
  });
  const signIn = async (role: Role, password = "whatever123") => {
    const email = `a${Date.now()}-${++seq}@admin-test.local`;
    const user = await createUser(db, { email, name: `${role} ${seq}`, password, role });
    const agent = request.agent(app);
    expect((await agent.post("/api/auth/login").send({ email, password })).status).toBe(200);
    return { agent, user, email };
  };
  return { app, signIn };
}

describe.skipIf(!dbUp)("admin API", () => {
  it("is admin-only for users, invites and weeks; setters get problems, schedule and pins", () =>
    sandbox(async (db) => {
      const { app, signIn } = harness(db, { t: at(MON) });
      const solver = await signIn("solver");
      const setter = await signIn("setter");
      const admin = await signIn("admin");
      const adminOnly = ["/api/admin/users", "/api/admin/invites"];
      const staff = ["/api/admin/problems", "/api/admin/tracks", "/api/admin/schedule"];
      for (const url of [...adminOnly, ...staff]) {
        expect((await request(app).get(url)).status).toBe(401);
        expect((await solver.agent.get(url)).status).toBe(403);
        expect((await admin.agent.get(url)).status).toBe(200);
        expect((await setter.agent.get(url)).status).toBe(adminOnly.includes(url) ? 403 : 200);
      }
      expect((await setter.agent.put(`/api/admin/schedule/weeks/${addDays(MON, 7)}`).send({ pattern: "dp-1d" })).status).toBe(403);
      expect((await solver.agent.put(`/api/admin/schedule/days/${addDays(MON, 1)}`).send({ slug: "x" })).status).toBe(403);
    }));

  it("changes roles, disables accounts and resets passwords, but never your own", () =>
    sandbox(async (db) => {
      const { app, signIn } = harness(db, { t: at(MON) });
      const admin = await signIn("admin");
      const solver = await signIn("solver");

      const list = (await admin.agent.get("/api/admin/users")).body as AdminUser[];
      expect(list.find((u) => u.id === solver.user.id)).toMatchObject({ email: solver.email, role: "solver", disabled: false, solved: 0, lastSubmissionAt: null });

      expect((await admin.agent.patch(`/api/admin/users/${admin.user.id}`).send({ role: "solver" })).body.error.code).toBe("self");
      expect((await admin.agent.patch(`/api/admin/users/${admin.user.id}`).send({ disabled: true })).body.error.code).toBe("self");
      expect((await admin.agent.patch(`/api/admin/users/${solver.user.id}`).send({})).body.error.code).toBe("invalid_request");
      expect((await admin.agent.patch(`/api/admin/users/${solver.user.id}`).send({ role: "boss" })).body.error.code).toBe("invalid_request");
      expect((await admin.agent.patch("/api/admin/users/99999999").send({ role: "setter" })).status).toBe(404);

      const promoted = await admin.agent.patch(`/api/admin/users/${solver.user.id}`).send({ role: "setter" });
      expect(promoted.body).toMatchObject({ id: solver.user.id, role: "setter" });
      expect((await solver.agent.get("/api/me")).body.role).toBe("setter"); // takes effect on the next request
      expect((await solver.agent.get("/api/admin/problems")).status).toBe(200);

      expect((await admin.agent.patch(`/api/admin/users/${solver.user.id}`).send({ disabled: true })).body.disabled).toBe(true);
      expect((await solver.agent.get("/api/me")).status).toBe(401);
      expect((await request(app).post("/api/auth/login").send({ email: solver.email, password: "whatever123" })).body.error.code).toBe("account_disabled");
      await admin.agent.patch(`/api/admin/users/${solver.user.id}`).send({ disabled: false });

      expect((await admin.agent.post(`/api/admin/users/${admin.user.id}/reset-password`).send({})).body.error.code).toBe("self");
      expect((await admin.agent.post("/api/admin/users/99999999/reset-password").send({})).status).toBe(404);
      const reset = await admin.agent.post(`/api/admin/users/${solver.user.id}/reset-password`).send({});
      expect(reset.status).toBe(200);
      expect(reset.body.password).toMatch(/^[A-Za-z0-9_-]{16}$/);
      expect((await request(app).post("/api/auth/login").send({ email: solver.email, password: "whatever123" })).status).toBe(401);
      expect((await request(app).post("/api/auth/login").send({ email: solver.email, password: reset.body.password })).status).toBe(200);
    }));

  it("creates, edits, disables and deletes invite codes", () =>
    sandbox(async (db) => {
      const clock = { t: new Date() }; // invite expiry is judged by the database clock
      const { signIn } = harness(db, clock);
      const admin = await signIn("admin");
      const later = new Date(Date.now() + 7 * 86_400_000).toISOString();

      expect((await admin.agent.post("/api/admin/invites").send({ expiresAt: new Date(Date.now() - 1000).toISOString() })).body.error.code).toBe("expired");
      expect((await admin.agent.post("/api/admin/invites").send({ maxUses: 0 })).body.error.code).toBe("invalid_request");
      const made = await admin.agent.post("/api/admin/invites").send({ maxUses: 3, role: "setter", expiresAt: later });
      expect(made.status).toBe(201);
      const inv = made.body as InviteCode;
      expect(inv).toMatchObject({ role: "setter", maxUses: 3, uses: 0, disabled: false, state: "active", createdBy: { id: admin.user.id } });
      expect(inv.code).toMatch(/^DSA-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
      expect(new Date(inv.expiresAt!).toISOString()).toBe(later);
      expect(((await admin.agent.get("/api/admin/invites")).body as InviteCode[]).some((i) => i.code === inv.code)).toBe(true);
      const dflt = (await admin.agent.post("/api/admin/invites").send({})).body as InviteCode;
      expect(dflt).toMatchObject({ role: "solver", maxUses: 1, expiresAt: null, state: "active" });

      await db.query("UPDATE invite_codes SET uses = 2 WHERE code = $1", [inv.code]);
      expect((await admin.agent.patch(`/api/admin/invites/${inv.code}`).send({ maxUses: 1 })).body.error.code).toBe("below_uses");
      expect((await admin.agent.patch(`/api/admin/invites/${inv.code}`).send({ maxUses: 2 })).body).toMatchObject({ maxUses: 2, state: "used_up" });
      expect((await admin.agent.patch(`/api/admin/invites/${inv.code.toLowerCase()}`).send({ maxUses: 5, expiresAt: null })).body)
        .toMatchObject({ maxUses: 5, expiresAt: null, state: "active" });
      expect((await admin.agent.patch(`/api/admin/invites/${inv.code}`).send({ disabled: true })).body.state).toBe("disabled");
      expect((await admin.agent.patch(`/api/admin/invites/${inv.code}`).send({})).body.error.code).toBe("invalid_request");
      expect((await admin.agent.patch("/api/admin/invites/DSA-NOPE-NOPE").send({ disabled: true })).status).toBe(404);
      await db.query("UPDATE invite_codes SET disabled = false, expires_at = now() - interval '1 minute' WHERE code = $1", [inv.code]);
      expect(((await admin.agent.get("/api/admin/invites")).body as InviteCode[]).find((i) => i.code === inv.code)!.state).toBe("expired");

      expect((await admin.agent.delete(`/api/admin/invites/${inv.code}`)).body.error.code).toBe("invite_used");
      expect((await admin.agent.delete(`/api/admin/invites/${dflt.code}`)).status).toBe(204);
      expect((await admin.agent.delete(`/api/admin/invites/${dflt.code}`)).status).toBe(404);
    }));

  it("pins daily problems to future days only, and the pin becomes that day's problem", () =>
    sandbox(async (db) => {
      const clock = { t: at(MON) };
      const { signIn } = harness(db, clock);
      const setter = await signIn("setter");
      const solver = await signIn("solver");
      const weekday = await problem(db, { pattern: "prefix-sums" });
      const weekend = await problem(db, { pool: "weekend", pattern: "two-pointers" });
      const retired = await problem(db, { active: false });
      const track = await trackProblem(db, "dp-1d", 1);
      const TUE = addDays(MON, 1);
      const pin = (day: string, slug: string) => setter.agent.put(`/api/admin/schedule/days/${day}`).send({ slug });

      expect((await pin(MON, weekday.slug)).body.error.code).toBe("not_future");
      expect((await pin(addDays(MON, -3), weekday.slug)).body.error.code).toBe("not_future");
      expect((await pin(TUE, track.slug)).body.error.code).toBe("not_daily");
      expect((await pin(TUE, retired.slug)).body.error.code).toBe("retired");
      expect((await pin(TUE, "zz-nope")).status).toBe(404);
      expect((await pin("2030-02-30", weekday.slug)).body.error.code).toBe("invalid_request");

      expect((await pin(TUE, weekday.slug)).body).toEqual({
        day: TUE, weekend: false,
        problem: { slug: weekday.slug, title: weekday.slug, pool: "weekday", pattern: { slug: "prefix-sums", name: "Prefix sums" } },
        pinnedBy: { id: setter.user.id, name: setter.user.name },
      });
      expect((await pin(TUE, weekend.slug)).body.problem.slug).toBe(weekend.slug); // replaces the earlier pin
      expect((await pin(addDays(MON, 5), weekday.slug)).status).toBe(200);

      const sched = (await setter.agent.get(`/api/admin/schedule?from=${MON}&to=${addDays(MON, 6)}`)).body as Schedule;
      expect(sched).toMatchObject({ from: MON, to: addDays(MON, 6), today: MON, weeks: [] });
      expect(sched.days.map((d) => [d.day, d.problem.slug])).toEqual([[TUE, weekend.slug], [addDays(MON, 5), weekday.slug]]);
      expect((await setter.agent.get(`/api/admin/schedule?from=${TUE}&to=${MON}`)).status).toBe(400);
      expect((await setter.agent.get(`/api/admin/schedule?from=${MON}&to=${addDays(MON, 401)}`)).status).toBe(400);

      const problems = (await setter.agent.get("/api/admin/problems")).body as StaffProblem[];
      expect(problems.find((p) => p.slug === weekday.slug)).toMatchObject({
        kind: "daily", pool: "weekday", active: true, timesShown: 0, lastShownOn: null, nextPinnedOn: addDays(MON, 5), solvedBy: 0, track: null,
      });
      expect(problems.find((p) => p.slug === track.slug)).toMatchObject({ kind: "track", pool: null, track: { position: 1 }, pattern: { slug: "dp-1d" } });

      // Solvers can't see the pin ahead of time; on the day it is the daily problem.
      expect((await solver.agent.get(`/api/daily/${TUE}`)).status).toBe(404);
      clock.t = at(TUE);
      expect((await solver.agent.get("/api/daily/today")).body.problem.slug).toBe(weekend.slug);
      expect((await setter.agent.delete(`/api/admin/schedule/days/${TUE}`)).body.error.code).toBe("not_future");

      const SAT = addDays(MON, 5);
      expect((await setter.agent.delete(`/api/admin/schedule/days/${SAT}`)).status).toBe(204);
      expect((await setter.agent.delete(`/api/admin/schedule/days/${SAT}`)).status).toBe(404);
      expect((await setter.agent.get("/api/admin/problems")).body.find((p: StaffProblem) => p.slug === weekday.slug))
        .toMatchObject({ nextPinnedOn: null });
    }));

  it("schedules track weeks that haven't started", () =>
    sandbox(async (db) => {
      const clock = { t: at(addDays(MON, 2)) }; // Wednesday
      const { signIn } = harness(db, clock);
      const admin = await signIn("admin");
      const NEXT = addDays(MON, 7);
      const week = (d: string, pattern: string) => admin.agent.put(`/api/admin/schedule/weeks/${d}`).send({ pattern });

      expect((await week(NEXT, "heaps-top-k")).body.error.code).toBe("no_track"); // nothing imported for it
      const tp = await trackProblem(db, "heaps-top-k", 1);
      expect((await week(addDays(NEXT, 1), "heaps-top-k")).body.error.code).toBe("invalid_request"); // a Tuesday
      expect((await week(MON, "heaps-top-k")).body.error.code).toBe("not_future"); // this week started
      const res = await week(NEXT, "heaps-top-k");
      expect(res.body).toEqual({
        weekStart: NEXT,
        track: {
          id: tp.trackId, title: "heaps-top-k", pattern: { slug: "heaps-top-k", name: "Heaps / top-k" }, ladder: 1,
          hasLesson: false, updatedAt: expect.any(String),
        },
      });
      expect(((await admin.agent.get("/api/admin/tracks")).body as { id: number }[]).some((t) => t.id === tp.trackId)).toBe(true);

      // The schedule shows weeks overlapping the range, even one starting before `from`.
      const sched = (await admin.agent.get(`/api/admin/schedule?from=${addDays(NEXT, 3)}&to=${addDays(NEXT, 4)}`)).body as Schedule;
      expect(sched.weeks.map((w) => w.weekStart)).toEqual([NEXT]);

      expect((await admin.agent.delete(`/api/admin/schedule/weeks/${MON}`)).body.error.code).toBe("not_future");
      expect((await admin.agent.delete(`/api/admin/schedule/weeks/${NEXT}`)).status).toBe(204);
      expect((await admin.agent.delete(`/api/admin/schedule/weeks/${NEXT}`)).status).toBe(404);
    }));
});
