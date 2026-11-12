// The weekly recap: what it says about a week, the Monday 08:00 IST timing, the mail, and no double
// sends. The db parts run in a transaction that is rolled back, with the real bank, schedule and members hidden.
import type pg from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { createPool } from "@dailydsa/db";
import { loadConfig } from "../src/config.js";
import { addDays } from "../src/ist.js";
import { memoryMailer } from "../src/mailer.js";
import { lastWeek, msToNextRecap, recapMail, sendRecaps, weeklyRecap } from "../src/recap.js";
import { createUser } from "../src/users.js";

const MON = "2030-01-07"; // a Monday

describe("recap timing and mail", () => {
  it("looks back on last week and waits for Monday 08:00 IST (02:30 UTC)", () => {
    expect(lastWeek(addDays(MON, 7))).toBe(MON);
    expect(lastWeek(addDays(MON, 13))).toBe(MON); // Sunday: still the week before
    expect(msToNextRecap(new Date("2030-01-07T02:00:00Z"))).toBe(30 * 60_000);
    expect(msToNextRecap(new Date("2030-01-07T02:30:00Z"))).toBe(7 * 86_400_000);
    expect(msToNextRecap(new Date("2030-01-09T02:30:00Z"))).toBe(5 * 86_400_000); // Wednesday → next Monday
  });

  it("writes the week in a few lines, with a link to practise the weakest pattern", () => {
    const m = recapMail("https://dsa.example", { email: "a@x.test", name: "Asha" }, {
      week: MON,
      track: { slug: "two-pointers", title: "Two pointers", solved: 4, ladder: 5 },
      daily: { days: 7, solvedOnTime: 5 },
      group: { members: 4, solved: 21, possible: 28 },
      strongest: { slug: "two-pointers", name: "Two pointers", solved: 6, tried: 6, helped: 0 },
      weakest: { slug: "prefix-sums", name: "Prefix sums", solved: 1, tried: 3, helped: 1 },
    });
    expect(m.subject).toBe("Your week on dailyDSA");
    expect(m.text).toContain("You solved 4 of its 5 ladder problems");
    expect(m.text).toContain("5 of 7 solved on the day");
    expect(m.text).toContain("The group solved 75%");
    expect(m.text).toContain("https://dsa.example/tracks/prefix-sums");
    expect(m.text).toContain("https://dsa.example/account");
  });
});

const config = loadConfig({ NODE_ENV: "test" });
const pool = createPool(config.databaseUrl);
const dbUp = await pool.query("SELECT 1 FROM weekly_recaps LIMIT 1").then(() => true, () => false);
afterAll(() => pool.end());

async function sandbox(fn: (db: pg.PoolClient) => Promise<void>) {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    await db.query("UPDATE problems SET active = false");
    await db.query("DELETE FROM daily_schedule");
    await db.query("DELETE FROM track_weeks");
    await db.query("UPDATE users SET disabled = true"); // only this test's members count
    await fn(db);
  } finally {
    await db.query("ROLLBACK");
    db.release();
  }
}

let seq = 0;
async function problem(db: pg.PoolClient, pattern: string) {
  const r = await db.query<{ id: number }>(
    `INSERT INTO problems (slug, title, kind, pool, pattern_slug, statement_md, time_limits, test_count, tests_hash, validated_at, active)
     VALUES ($1, $1, 'daily', 'weekday', $2, '', '{}', 1, 'x', now(), true) RETURNING id`,
    [`zz-recap-test-${++seq}-${Date.now()}`, pattern],
  );
  return r.rows[0]!.id;
}

describe.skipIf(!dbUp)("weekly recap (needs db + migrations)", () => {
  it("sums up the week and the patterns, and mails it once to members who want it", () =>
    sandbox(async (db) => {
      const stamp = Date.now();
      const user = (n: string) => createUser(db, { email: `${n}${stamp}@recap-test.local`, name: n, password: "whatever123", role: "solver" });
      const [a, b, off] = [await user("a"), await user("b"), await user("off")];
      await db.query("UPDATE users SET weekly_recap = false WHERE id = $1", [off.id]);
      const tp = [await problem(db, "two-pointers"), await problem(db, "two-pointers")];
      const ps = [await problem(db, "prefix-sums"), await problem(db, "prefix-sums")];
      await db.query("INSERT INTO daily_schedule (day, problem_id) VALUES ($1, $2), ($3, $4)", [MON, tp[0], addDays(MON, 1), ps[0]]);
      const at = (day: string) => `${day}T12:00:00+05:30`;
      // a: Monday's on the day, Tuesday's two days late; two-pointers 2/2, prefix-sums 1/2 (one tried, its
      // solutions opened so its pattern shows; a hidden pattern would not count).
      await db.query(
        `INSERT INTO user_problems (user_id, problem_id, solved_at, first_attempt_at) VALUES
           ($1, $2, $3, $3), ($1, $4, $5, $5), ($1, $6, $3, $3), ($1, $7, NULL, $3)`,
        [a.id, tp[0], at(MON), ps[0], at(addDays(MON, 3)), tp[1], ps[1]],
      );
      await db.query("UPDATE user_problems SET solutions_unlocked_at = now() WHERE user_id = $1 AND problem_id = $2", [a.id, ps[1]]);

      const r = await weeklyRecap(db, a.id, MON);
      expect(r).toMatchObject({
        week: MON, track: null,
        daily: { days: 2, solvedOnTime: 1 },
        group: { members: 3, solved: 2, possible: 6 },
        strongest: { slug: "two-pointers", solved: 2, tried: 2 },
        weakest: { slug: "prefix-sums", solved: 1, tried: 2 },
      });
      // One pattern only: no strongest / weakest.
      expect((await weeklyRecap(db, b.id, MON))).toMatchObject({ strongest: null, weakest: null, daily: { solvedOnTime: 0 } });

      const mailer = memoryMailer();
      const log = { error: (e: unknown) => { throw e; } };
      expect(await sendRecaps(db, mailer, config, addDays(MON, 7), log)).toBe(2); // a and b; "off" opted out
      expect(mailer.sent.map((m) => m.to).sort()).toEqual([a.email, b.email].sort());
      expect(await sendRecaps(db, mailer, config, addDays(MON, 7), log)).toBe(0); // never twice for a week
    }));
});
