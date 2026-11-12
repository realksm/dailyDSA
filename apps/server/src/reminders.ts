// The streak-saver email: at 21:00 IST, a member who has a streak going (solved yesterday's daily on
// time) but hasn't solved today's gets one short reminder with a link to the problem. Opt-out per
// member (users.remind_streak, Account page); at most one per member and day (streak_reminders).
import type pg from "pg";
import type { DailyEntry } from "@dailydsa/shared";
import type { Config } from "./config.js";
import { dailyEntries, ensureDailyPick } from "./daily.js";
import { addDays, istDate, nextIstMidnight } from "./ist.js";
import type { Mailer } from "./mailer.js";

type Db = pg.Pool | pg.PoolClient;

/** Minutes after IST midnight the reminder goes out (21:00 IST). */
export const REMIND_AT_MINUTES = 21 * 60;

/** Longest run of days solved on time in `days` (newest first), starting at `from` and going back. */
function onTimeRun(days: DailyEntry[], from: string): number {
  let n = 0;
  let want = from;
  for (const d of days) {
    if (d.day > want) continue;
    if (d.day !== want) break;
    if (!d.solvedAt || istDate(new Date(d.solvedAt)) > d.day) break;
    n++;
    want = addDays(want, -1);
  }
  return n;
}

/** Days in a row solved on time, counting back from yesterday (today is still open). */
export async function streakBefore(db: Db, userId: number, today: string): Promise<number> {
  const days = await dailyEntries(db, { userId, today: addDays(today, -1), limit: 400 });
  return onTimeRun(days, addDays(today, -1));
}

/**
 * The streak right now (top-bar chip): ends today once today's daily is solved on time, else
 * yesterday. Same rule as the web app's dailyStreak() on Today.
 */
export async function currentStreak(db: Db, userId: number, today: string): Promise<{ days: number; todayDone: boolean }> {
  const days = await dailyEntries(db, { userId, today, limit: 401 });
  const todayDone = onTimeRun(days, today) > 0;
  return { days: onTimeRun(days, todayDone ? today : addDays(today, -1)), todayDone };
}

export interface Reminder {
  userId: number;
  email: string;
  name: string;
  streak: number;
  problem: { slug: string; title: string };
}

/**
 * Who gets today's reminder: active members with reminders on, not yet reminded today, who haven't
 * solved today's problem, and whose streak (up to yesterday) is at least one day.
 */
export async function dueReminders(db: Db, today: string): Promise<Reminder[]> {
  const pick = await ensureDailyPick(db, today);
  if (!pick) return [];
  const p = await db.query<{ slug: string; title: string }>("SELECT slug, title FROM problems WHERE id = $1", [pick.problemId]);
  const problem = p.rows[0]!;
  const r = await db.query<{ id: number; email: string; name: string }>(
    `SELECT u.id, u.email::text AS email, u.name
       FROM users u
       LEFT JOIN user_problems up ON up.user_id = u.id AND up.problem_id = $1
      WHERE NOT u.disabled AND u.remind_streak AND up.solved_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM streak_reminders s WHERE s.user_id = u.id AND s.day = $2)
      ORDER BY u.id`,
    [pick.problemId, today],
  );
  const out: Reminder[] = [];
  for (const u of r.rows) {
    const streak = await streakBefore(db, u.id, today);
    if (streak > 0) out.push({ userId: u.id, email: u.email, name: u.name, streak, problem });
  }
  return out;
}

export function reminderMail(appUrl: string, r: Reminder) {
  const link = `${appUrl}/p/${encodeURIComponent(r.problem.slug)}`;
  const days = `${r.streak}-day streak`;
  const off = `${appUrl}/account`;
  return {
    to: r.email,
    subject: `Your ${days} ends at midnight IST`,
    text:
      `Hi ${r.name},\n\nToday's problem, ${r.problem.title}, is still open, and your ${days} ends at midnight IST.\n\n` +
      `${link}\n\nDon't want these? Switch them off on your account page: ${off}\n`,
  };
}

/** Sends today's due reminders and records each one; one failed send doesn't stop the rest. */
export async function sendReminders(db: Db, mailer: Mailer, config: Pick<Config, "appUrl">, today: string, log: { error: (e: unknown) => void }): Promise<number> {
  let sent = 0;
  for (const r of await dueReminders(db, today)) {
    // Claim the row first: if two servers ever ran this, only one sends.
    const claim = await db.query("INSERT INTO streak_reminders (user_id, day) VALUES ($1, $2) ON CONFLICT DO NOTHING", [r.userId, today]);
    if (claim.rowCount !== 1) continue;
    try {
      await mailer.send(reminderMail(config.appUrl, r));
      sent++;
    } catch (e) {
      await db.query("DELETE FROM streak_reminders WHERE user_id = $1 AND day = $2", [r.userId, today]);
      log.error(e);
    }
  }
  return sent;
}

/** ms from `now` to the next 21:00 IST. */
export function msToNextReminder(now: Date): number {
  const midnight = nextIstMidnight(now).getTime();
  const todays = midnight - 86_400_000 + REMIND_AT_MINUTES * 60_000;
  const next = todays > now.getTime() ? todays : todays + 86_400_000;
  return next - now.getTime();
}

/**
 * Runs the reminders at 21:00 IST every day. If the server starts between 21:00 and midnight it sends
 * the day's reminders straight away (the claim table stops repeats). Returns a stop function.
 */
export function startStreakReminders(pool: pg.Pool, mailer: Mailer, config: Pick<Config, "appUrl">, log: { info: (m: string) => void; error: (e: unknown) => void }, now: () => Date = () => new Date()): () => void {
  let timer: NodeJS.Timeout | undefined;
  let stopped = false;
  const run = async () => {
    const day = istDate(now());
    try {
      const n = await sendReminders(pool, mailer, config, day, log);
      if (n > 0) log.info(`streak reminders ${day}: sent ${n}`);
    } catch (e) {
      log.error(e);
    }
    schedule();
  };
  const schedule = () => {
    if (stopped) return;
    timer = setTimeout(() => void run(), Math.max(1000, msToNextReminder(now()) + 2000));
    timer.unref();
  };
  // Started after 21:00 IST: today's window is still open.
  const t = now();
  const sinceMidnight = (t.getTime() - (nextIstMidnight(t).getTime() - 86_400_000)) / 60_000;
  if (sinceMidnight >= REMIND_AT_MINUTES) void run();
  else schedule();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
