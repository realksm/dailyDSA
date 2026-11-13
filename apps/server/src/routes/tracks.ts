// The Tracks library and lesson pages (PLAN §2): GET /api/tracks, GET /api/tracks/:pattern,
// POST /api/tracks/:pattern/lesson-read.
import { Router } from "express";
import type pg from "pg";
import { z } from "zod";
import type { TrackLibrary } from "@dailydsa/shared";
import { me, requireUser } from "../auth.js";
import { notFound, parse } from "../errors.js";
import { istDate } from "../ist.js";
import { markLessonRead, trackLibrary, trackView } from "../tracks.js";

const Pattern = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/, "Not a pattern slug.");

export function trackRoutes({ pool, now }: { pool: pg.Pool; now: () => Date }): Router {
  const r = Router();
  r.use("/tracks", requireUser);

  r.get("/tracks", async (req, res) => {
    const today = istDate(now());
    const body: TrackLibrary = { today, tracks: await trackLibrary(pool, { user: me(req), today }) };
    res.json(body);
  });

  /** 404 both for unknown patterns and for tracks whose first week hasn't started (solvers). */
  r.get("/tracks/:pattern", async (req, res) => {
    const v = await trackView(pool, { user: me(req), today: istDate(now()), pattern: parse(Pattern, req.params.pattern) });
    if (!v) throw notFound("No such track.");
    res.json(v);
  });

  /** The lesson page calls this on open; the first time is kept. Same 404 rule as the page. */
  r.post("/tracks/:pattern/lesson-read", async (req, res) => {
    const x = await markLessonRead(pool, { user: me(req), today: istDate(now()), pattern: parse(Pattern, req.params.pattern) });
    if (!x) throw notFound("No such track.");
    res.json(x);
  });

  return r;
}
