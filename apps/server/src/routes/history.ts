// GET /api/history and GET /api/submissions: the signed-in user's own record.
import { Router } from "express";
import type pg from "pg";
import { z } from "zod";
import type { History } from "@dailydsa/shared";
import { me, requireUser } from "../auth.js";
import { parse } from "../errors.js";
import { history, listSubmissions } from "../history.js";
import { istDate } from "../ist.js";

const SubmissionsQuery = z.object({
  problem: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/, "Not a problem slug.").optional(),
  kind: z.enum(["run", "submit"]).optional(),
  before: z.coerce.number().int().positive().max(2 ** 53).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export function historyRoutes({ pool, now }: { pool: pg.Pool; now: () => Date }): Router {
  const r = Router();

  r.get("/history", requireUser, async (req, res) => {
    const body: History = { problems: await history(pool, { userId: me(req).id, today: istDate(now()) }) };
    res.json(body);
  });

  /** Newest first. Page with ?before=<nextBefore>; filter with ?problem=<slug>&kind=run|submit. */
  r.get("/submissions", requireUser, async (req, res) => {
    const q = parse(SubmissionsQuery, req.query);
    res.json(
      await listSubmissions(pool, {
        userId: me(req).id, limit: q.limit,
        ...(q.problem !== undefined && { slug: q.problem }),
        ...(q.kind !== undefined && { kind: q.kind }),
        ...(q.before !== undefined && { before: q.before }),
      }),
    );
  });

  return r;
}
