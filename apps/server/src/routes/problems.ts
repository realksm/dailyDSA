// The problem page and its Solutions tab: GET /api/problems/:slug, POST /api/problems/:slug/unlock-solutions,
// GET /api/problems/:slug/solutions.
import { Router, type Request } from "express";
import type pg from "pg";
import { z } from "zod";
import { LANGS } from "@dailydsa/shared";
import { me, requireUser } from "../auth.js";
import { HttpError, notFound, parse } from "../errors.js";
import { istDate } from "../ist.js";
import { problemView } from "../problems.js";
import { listSolutions, solutionsAccess, unlockSolutions } from "../solutions.js";

const Slug = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/, "Not a problem slug.");
const SolutionsQuery = z.object({
  lang: z.enum(LANGS).optional(),
  before: z.coerce.number().int().positive().max(2 ** 53).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export function problemRoutes({ pool, now, dataDir }: { pool: pg.Pool; now: () => Date; dataDir: string }): Router {
  const r = Router();
  r.use("/problems", requireUser);

  const view = async (req: Request, slug: string) => {
    const v = await problemView(pool, { slug, user: me(req), today: istDate(now()), dataDir });
    if (!v) throw notFound("No such problem.");
    return v;
  };
  const access = async (req: Request, slug: string) => {
    const a = await solutionsAccess(pool, { slug, user: me(req), today: istDate(now()) });
    if (!a) throw notFound("No such problem.");
    return a;
  };

  /** 404 both for unknown slugs and for problems not released yet, so the schedule can't be probed. */
  r.get("/problems/:slug", async (req, res) => {
    res.json(await view(req, parse(Slug, req.params.slug)));
  });

  /**
   * The "Show solutions" button (PLAN §4): needs one real attempt first (403 `no_attempt`).
   * Clicking again, or after solving, is fine. Answers the updated problem page.
   */
  r.post("/problems/:slug/unlock-solutions", async (req, res) => {
    const slug = parse(Slug, req.params.slug);
    const a = await access(req, slug);
    if (!a.open && (await unlockSolutions(pool, me(req).id, a.id)) === "no_attempt") {
      throw new HttpError(403, "no_attempt", "Make one real attempt first: a Submit that compiles.");
    }
    res.json(await view(req, slug));
  });

  /** Reference code + everyone's accepted code, once solved or unlocked (else 403 `solutions_locked`). */
  r.get("/problems/:slug/solutions", async (req, res) => {
    const slug = parse(Slug, req.params.slug);
    const q = parse(SolutionsQuery, req.query);
    const a = await access(req, slug);
    if (!a.open) throw new HttpError(403, "solutions_locked", "Solutions open once you solve the problem, or after a real attempt with Show solutions.");
    res.json(
      await listSolutions(pool, {
        problemId: a.id, userId: me(req).id, limit: q.limit,
        ...(q.lang !== undefined && { lang: q.lang }),
        ...(q.before !== undefined && { before: q.before }),
      }),
    );
  });

  return r;
}
