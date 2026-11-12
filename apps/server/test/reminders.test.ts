// The streak-saver email: who is due, the mail, the 21:00 IST timing, and no double sends. The db
// parts run inside one transaction per test that is rolled back, after hiding the real problems and schedule.
import type pg from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { createPool } from "@dailydsa/db";
import { loadConfig } from "../src/config.js";
import { addDays } from "../src/ist.js";
import { memoryMailer } from "../src/mailer.js";
import { currentStreak, dueReminders, msToNextReminder, reminderMail, sendReminders, streakBefore } from "../src/reminders.js";
import { createUser } from "../src/users.js";

describe("reminder timing", () => {
  it("waits for the next 21:00 IST (15:30 UTC)", () => {
    expect(msToNextReminder(new Date("2030-01-07T15:00:00Z"))).toBe(30 * 60_000);
    expect(msToNextReminder(new Date("2030-01-07T15:30:00Z"))).toBe(86_400_000);
    expect(msToNextReminder(new Date("2030-01-07T20:00:00Z"))).toBe(86_400_000 - 4.5 * 3600_000);
  });

  it("writes a short mail with the problem link and the way out", () => {
    const m = reminderMail("https://dsa.example", { userId: 1, email: "a@x.test", name: "Asha", streak: 4, problem: { slug: "still-water", title: "Still Water" } });
    expect(m.subject).toBe("Your 4-day streak ends at midnight IST");
    expect(m.text).toContain("https://dsa.example/p/still-water");
    expect(m.text).toContain("https://dsa.example/account");
  });
});

const config = loadConfig({ NODE_ENV: "test" });
const pool = createPool(config.databaseUrl);
const dbUp = await pool.query("SELECT 1 FROM streak_reminders LIMIT 1").then(() => true, () => false);
afterAll(() => pool.end());

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
async function problem(db: pg.PoolClient) {
  const r = await db.query<{ id: number }>(
    `INSERT INTO problems (slug, title, kind, pool, statement_md, time_limits, test_count, tests_hash, validated_at, active)
     VALUES ($1, $1, 'daily', 'weekday', '', '{}', 1, 'x', now(), true) RETURNING id`,
    [`zz-remind-test-${++seq}-${Date.now()}`],
  );
  return r.rows[0]!.id;
}

const TODAY = "2030-01-09"; // a Wednesday
const at = (day: string, hhmm = "12:00") => `${day}T${hhmm}:00+05:30`;

describe.skipIf(!dbUp)("streak reminders (needs db + migrations)", () => {
  it("reminds members with a streak who haven't solved today, once, unless they opted out", () =>
    sandbox(async (db) => {
      const [mon, tue, wed] = [await problem(db), await problem(db), await problem(db)];
      await db.query("INSERT INTO daily_schedule (day, problem_id) VALUES ($1, $2), ($3, $4), ($5, $6)",
        [addDays(TODAY, -2), mon, addDays(TODAY, -1), tue, TODAY, wed]);
      const stamp = Date.now();
      const user = (n: string) => createUser(db, { email: `${n}${stamp}@remind-test.local`, name: n, password: "whatever123", role: "solver" });
      const solve = (u: number, p: number, when: string) =>
        db.query("INSERT INTO user_problems (user_id, problem_id, solved_at) VALUES ($1, $2, $3)", [u, p, when]);

      const two = await user("two"); // Mon + Tue on time: a 2-day streak, today open → due
      await solve(two.id, mon, at(addDays(TODAY, -2)));
      await solve(two.id, tue, at(addDays(TODAY, -1)));
      const late = await user("late"); // solved Tuesday's only on Wednesday: no streak → not due
      await solve(late.id, tue, at(TODAY, "09:00"));
      const done = await user("done"); // streak, but today's is solved → not due
      await solve(done.id, tue, at(addDays(TODAY, -1)));
      await solve(done.id, wed, at(TODAY, "10:00"));
      const quiet = await user("quiet"); // streak, opted out → not due
      await solve(quiet.id, tue, at(addDays(TODAY, -1)));
      await db.query("UPDATE users SET remind_streak = false WHERE id = $1", [quiet.id]);

      expect(await streakBefore(db, two.id, TODAY)).toBe(2);
      expect(await streakBefore(db, late.id, TODAY)).toBe(0);
      // The top-bar chip: today counts once it's solved; a late solve never does.
      expect(await currentStreak(db, two.id, TODAY)).toEqual({ days: 2, todayDone: false });
      expect(await currentStreak(db, done.id, TODAY)).toEqual({ days: 2, todayDone: true });
      expect(await currentStreak(db, late.id, TODAY)).toEqual({ days: 0, todayDone: false });
      const due = (await dueReminders(db, TODAY)).filter((r) => r.email.endsWith(`${stamp}@remind-test.local`));
      expect(due.map((r) => [r.name, r.streak])).toEqual([["two", 2]]);
      expect(due[0]!.problem.slug).toMatch(/^zz-remind-test-/);

      const mailer = memoryMailer();
      const log = { error: (e: unknown) => { throw e; } };
      await sendReminders(db, mailer, config, TODAY, log);
      expect(mailer.sent.filter((m) => m.to === two.email)).toHaveLength(1);
      // A second run the same evening (e.g. after a restart) sends nothing new.
      await sendReminders(db, mailer, config, TODAY, log);
      expect(mailer.sent.filter((m) => m.to === two.email)).toHaveLength(1);
    }));
});
