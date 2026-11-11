// Today's problem and the archive of past daily problems (PLAN §1).
import { Router } from "express";
import type pg from "pg";
import { z } from "zod";
import type { DailyArchive, DailyToday } from "@dailydsa/shared";
import { me, requireUser } from "../auth.js";
import { catchUpDaily, dailyEntries, dailyPulse, ensureDailyPick } from "../daily.js";
import { HttpError, notFound, parse } from "../errors.js";
import { isDay, istDate, nextIstMidnight } from "../ist.js";

const day = z.string().refine(isDay, "Use a YYYY-MM-DD date.");
const ArchiveQuery = z.object({
  before: day.optional(),
  limit: z.coerce.number().int().min(1).max(366).default(100),
});

const noDaily = () => new HttpError(404, "no_daily", "There is no daily problem yet. Check back soon.");

export function dailyRoutes({ pool, now }: { pool: pg.Pool; now: () => Date }): Router {
  const r = Router();
  r.use("/daily", requireUser);

  r.get("/daily/today", async (req, res) => {
    const t = now();
    const today = istDate(t);
    // Today missing means the rollover didn't run (e.g. the server was down): fill the gap too.
    const has = await pool.query("SELECT 1 FROM daily_schedule WHERE day = $1", [today]);
    if (has.rowCount === 0) await catchUpDaily(pool, today);
    const pick = await ensureDailyPick(pool, today);
    if (!pick) throw noDaily();
    const [entry] = await dailyEntries(pool, { userId: me(req).id, today, day: today });
    if (!entry) throw noDaily();
    const body: DailyToday = { ...entry, nextRolloverAt: nextIstMidnight(t).toISOString(), pulse: await dailyPulse(pool, pick.problemId) };
    res.json(body);
  });

  /** Newest first. Page with ?before=<day of the last entry>. */
  r.get("/daily", async (req, res) => {
    const q = parse(ArchiveQuery, req.query);
    const today = istDate(now());
    const days = await dailyEntries(pool, { userId: me(req).id, today, limit: q.limit + 1, ...(q.before ? { before: q.before } : {}) });
    const more = days.length > q.limit;
    if (more) days.pop();
    const body: DailyArchive = { days, nextBefore: more ? days[days.length - 1]!.day : null };
    res.json(body);
  });

  /** One past day. Future days are 404 so the schedule (incl. pins) can't be peeked at. */
  r.get("/daily/:day", async (req, res) => {
    const d = parse(day, req.params.day);
    const [entry] = await dailyEntries(pool, { userId: me(req).id, today: istDate(now()), day: d });
    if (!entry) throw notFound("No daily problem on that day.");
    res.json(entry);
  });

  return r;
}
