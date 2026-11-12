// The weekly recap: on Monday, a look back at last week. Its track and how far you got up the ladder,
// your daily problems, the group's solve rate, and your strongest / weakest pattern so far. Shown on
// Today (GET /api/me/recap) and sent as one email at 08:00 IST (opt-out: users.weekly_recap; at most
// one per member and week: weekly_recaps).
import type pg from "pg";
import type { WeeklyRecap } from "@dailydsa/shared";
import type { Config } from "./config.js";
import { addDays, istDate, nextIstMidnight, weekStart } from "./ist.js";
import type { Mailer } from "./mailer.js";

type Db = pg.Pool | pg.PoolClient;

/** Minutes after IST midnight on Monday the recap email goes out (08:00 IST). */
export const RECAP_AT_MINUTES = 8 * 60;

/** The recap of the week starting `monday` (Mon–Sun) for `userId`. */
export async function weeklyRecap(db: Db, userId: number, monday: string): Promise<WeeklyRecap> {
  const sunday = addDays(monday, 6);

  // The track that ran that week, and the member's ladder progress on it (solved by now).
  const t = await db.query<{ slug: string; title: string; ladder: number; solved: number }>(
    `SELECT t.pattern_slug AS slug, t.title,
            (SELECT count(*)::int FROM track_problems tp WHERE tp.track_id = t.id) AS ladder,
            (SELECT count(*)::int FROM track_problems tp JOIN user_problems up ON up.problem_id = tp.problem_id
              WHERE tp.track_id = t.id AND up.user_id = $2 AND up.solved_at IS NOT NULL) AS solved
       FROM track_weeks w JOIN tracks t ON t.id = w.track_id WHERE w.week_start = $1`,
    [monday, userId],
  );

  // The member's dailies that week, solved by the end of their own day (the streak rule).
  const d = await db.query<{ days: number; on_time: number }>(
    `SELECT count(*)::int AS days,
            count(*) FILTER (WHERE (up.solved_at AT TIME ZONE 'Asia/Kolkata')::date <= ds.day)::int AS on_time
       FROM daily_schedule ds
       LEFT JOIN user_problems up ON up.problem_id = ds.problem_id AND up.user_id = $3
      WHERE ds.day BETWEEN $1 AND $2`,
    [monday, sunday, userId],
  );

  // The group: of every (active member who had joined by then, daily of the week) pair, how many were solved.
  const g = await db.query<{ members: number; possible: number; solved: number }>(
    `WITH m AS (SELECT id FROM users WHERE NOT disabled AND (created_at AT TIME ZONE 'Asia/Kolkata')::date <= $2),
          w AS (SELECT problem_id FROM daily_schedule WHERE day BETWEEN $1 AND $2)
     SELECT (SELECT count(*)::int FROM m) AS members,
            (SELECT count(*)::int FROM m, w) AS possible,
            (SELECT count(*)::int FROM m, w JOIN user_problems up ON up.problem_id = w.problem_id
              WHERE up.user_id = m.id AND up.solved_at IS NOT NULL) AS solved`,
    [monday, sunday],
  );

  // Patterns so far: only ones the member can see (ladder problems; dailies once solved or unlocked).
  const p = await db.query<{ slug: string; name: string; tried: number; solved: number; helped: number }>(
    `SELECT pt.slug, pt.name, count(*)::int AS tried,
            count(*) FILTER (WHERE up.solved_at IS NOT NULL)::int AS solved,
            count(*) FILTER (WHERE up.solved_at IS NOT NULL AND (
              (up.solutions_unlocked_at IS NOT NULL AND up.solutions_unlocked_at < up.solved_at) OR
              (up.first_hint_at IS NOT NULL AND up.first_hint_at < up.solved_at)))::int AS helped
       FROM user_problems up
       JOIN problems pr ON pr.id = up.problem_id
       JOIN patterns pt ON pt.slug = pr.pattern_slug
      WHERE up.user_id = $1
        AND (up.solved_at IS NOT NULL OR up.first_attempt_at IS NOT NULL OR coalesce(up.submit_count, 0) > 0)
        AND (pr.kind = 'track' OR up.solved_at IS NOT NULL OR up.solutions_unlocked_at IS NOT NULL)
      GROUP BY pt.slug, pt.name`,
    [userId],
  );
  // Solved on your own counts fully, solved with hints or after the solutions half.
  const score = (x: { tried: number; solved: number; helped: number }) => (x.solved - x.helped / 2) / x.tried;
  const ranked = [...p.rows].sort((a, b) => score(b) - score(a) || b.solved - a.solved || a.name.localeCompare(b.name));
  const out = (x: (typeof ranked)[number] | undefined) => (x ? { slug: x.slug, name: x.name, solved: x.solved, tried: x.tried, helped: x.helped } : null);
  // A weakest pattern only when one really is behind the best (not when every pattern scores the same).
  const apart = ranked.length >= 2 && score(ranked.at(-1)!) < score(ranked[0]!);

  const track = t.rows[0];
  const group = g.rows[0]!;
  return {
    week: monday,
    track: track ? { slug: track.slug, title: track.title, solved: track.solved, ladder: track.ladder } : null,
    daily: { days: d.rows[0]!.days, solvedOnTime: d.rows[0]!.on_time },
    group: { members: group.members, solved: group.solved, possible: group.possible },
    strongest: apart ? out(ranked[0]) : null,
    weakest: apart ? out(ranked.at(-1)) : null,
  };
}

/** Monday of the week before `today`'s week: the week a recap on `today` looks back on. */
export const lastWeek = (today: string) => addDays(weekStart(today), -7);

export function recapMail(appUrl: string, to: { email: string; name: string }, r: WeeklyRecap) {
  const pct = (a: number, b: number) => (b > 0 ? `${Math.round((100 * a) / b)}%` : "no");
  const lines = [
    r.track ? `Track: ${r.track.title}. You solved ${r.track.solved} of its ${r.track.ladder} ladder problems.` : "No track ran last week.",
    `Daily problems: ${r.daily.solvedOnTime} of ${r.daily.days} solved on the day.`,
    `The group solved ${pct(r.group.solved, r.group.possible)} of last week's daily problems (${r.group.members} members).`,
  ];
  if (r.strongest && r.weakest) {
    lines.push(`Strongest pattern so far: ${r.strongest.name} (${r.strongest.solved}/${r.strongest.tried} solved).`);
    lines.push(`Worth more practice: ${r.weakest.name} (${r.weakest.solved}/${r.weakest.tried} solved${r.weakest.helped ? `, ${r.weakest.helped} with hints or solutions` : ""}). ${appUrl}/tracks/${encodeURIComponent(r.weakest.slug)}`);
  }
  return {
    to: to.email,
    subject: "Your week on dailyDSA",
    text:
      `Hi ${to.name},\n\nHere's last week (from ${r.week}):\n\n${lines.map((l) => `- ${l}`).join("\n")}\n\n` +
      `This week's problems: ${appUrl}/\n\nDon't want these? Switch them off on your account page: ${appUrl}/account\n`,
  };
}

/**
 * Sends the recap of the week before `today`'s to every active member who has recaps on, joined before
 * that week ended, and wasn't sent this one yet. Returns how many were sent.
 */
export async function sendRecaps(db: Db, mailer: Mailer, config: Pick<Config, "appUrl">, today: string, log: { error: (e: unknown) => void }): Promise<number> {
  const monday = lastWeek(today);
  const users = await db.query<{ id: number; email: string; name: string }>(
    `SELECT u.id, u.email::text AS email, u.name FROM users u
      WHERE NOT u.disabled AND u.weekly_recap AND (u.created_at AT TIME ZONE 'Asia/Kolkata')::date <= $2
        AND NOT EXISTS (SELECT 1 FROM weekly_recaps r WHERE r.user_id = u.id AND r.week_start = $1)
      ORDER BY u.id`,
    [monday, addDays(monday, 6)],
  );
  let sent = 0;
  for (const u of users.rows) {
    const claim = await db.query("INSERT INTO weekly_recaps (user_id, week_start) VALUES ($1, $2) ON CONFLICT DO NOTHING", [u.id, monday]);
    if (claim.rowCount !== 1) continue;
    try {
      await mailer.send(recapMail(config.appUrl, u, await weeklyRecap(db, u.id, monday)));
      sent++;
    } catch (e) {
      await db.query("DELETE FROM weekly_recaps WHERE user_id = $1 AND week_start = $2", [u.id, monday]);
      log.error(e);
    }
  }
  return sent;
}

/** ms from `now` to the next Monday 08:00 IST. */
export function msToNextRecap(now: Date): number {
  const today = istDate(now);
  const todayStart = nextIstMidnight(now).getTime() - 86_400_000;
  let monday = weekStart(today);
  let at = todayStart - (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${monday}T00:00:00Z`)) + RECAP_AT_MINUTES * 60_000;
  if (at <= now.getTime()) {
    monday = addDays(monday, 7);
    at += 7 * 86_400_000;
  }
  return at - now.getTime();
}

/**
 * Sends the recaps every Monday at 08:00 IST. Started on a Monday after 08:00, it sends straight away
 * (the claim table stops repeats). Returns a stop function.
 */
export function startWeeklyRecaps(pool: pg.Pool, mailer: Mailer, config: Pick<Config, "appUrl">, log: { info: (m: string) => void; error: (e: unknown) => void }, now: () => Date = () => new Date()): () => void {
  let timer: NodeJS.Timeout | undefined;
  let stopped = false;
  const run = async () => {
    const day = istDate(now());
    try {
      const n = await sendRecaps(pool, mailer, config, day, log);
      if (n > 0) log.info(`weekly recaps for the week of ${lastWeek(day)}: sent ${n}`);
    } catch (e) {
      log.error(e);
    }
    schedule();
  };
  const schedule = () => {
    if (stopped) return;
    // At most a week: setTimeout's limit is ~24.8 days.
    timer = setTimeout(() => void run(), Math.max(1000, msToNextRecap(now()) + 2000));
    timer.unref();
  };
  const t = now();
  const day = istDate(t);
  const sinceMidnight = (t.getTime() - (nextIstMidnight(t).getTime() - 86_400_000)) / 60_000;
  if (weekStart(day) === day && sinceMidnight >= RECAP_AT_MINUTES) void run();
  else schedule();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
