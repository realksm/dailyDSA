// The problem page: GET /api/problems/:slug.
import { Router } from "express";
import type pg from "pg";
import { z } from "zod";
import { me, requireUser } from "../auth.js";
import { notFound, parse } from "../errors.js";
import { istDate } from "../ist.js";
import { problemView } from "../problems.js";

const Slug = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/, "Not a problem slug.");

export function problemRoutes({ pool, now, dataDir }: { pool: pg.Pool; now: () => Date; dataDir: string }): Router {
  const r = Router();
  r.use("/problems", requireUser);

  /** 404 both for unknown slugs and for problems not released yet, so the schedule can't be probed. */
  r.get("/problems/:slug", async (req, res) => {
    const slug = parse(Slug, req.params.slug);
    const view = await problemView(pool, { slug, user: me(req), today: istDate(now()), dataDir });
    if (!view) throw notFound("No such problem.");
    res.json(view);
  });

  return r;
}
