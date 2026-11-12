// The problem page and its Solutions tab: GET /api/problems/:slug, POST /api/problems/:slug/unlock-solutions,
// GET /api/problems/:slug/solutions, and hints on track problems: POST /api/problems/:slug/hints.
import { Router, type Request } from "express";
import type pg from "pg";
import { z } from "zod";
import { LANGS } from "@dailydsa/shared";
import { me, requireUser } from "../auth.js";
import { HttpError, notFound, parse } from "../errors.js";
import { istDate } from "../ist.js";
import { problemView } from "../problems.js";
import { listSolutions, solutionsAccess, unlockSolutions } from "../solutions.js";
import { takeHint } from "../tracks.js";

const Slug = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/, "Not a problem slug.");
const SolutionsQuery = z.object({
  lang: z.enum(LANGS).optional(),
  before: z.coerce.number().int().positive().max(2 ** 53).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
const HintBody = z.object({ level: z.number().int().min(1).max(3) });
const NoteBody = z.object({ note: z.string().max(2000) });

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

  /**
   * Take the next hint (PLAN §2). `level` must be the next one; one already taken is a no-op, so a
   * double click is harmless. Recorded in history. Answers the updated problem page.
   */
  r.post("/problems/:slug/hints", async (req, res) => {
    const slug = parse(Slug, req.params.slug);
    const { level } = parse(HintBody, req.body);
    const a = await access(req, slug);
    const result = await takeHint(pool, { userId: me(req).id, problemId: a.id, level });
    if (result === "no_hints") throw new HttpError(400, "no_hints", "This problem has no hints.");
    if (result === "no_such_hint") throw new HttpError(400, "no_such_hint", "This problem doesn't have that many hints.");
    if (result === "out_of_order") throw new HttpError(400, "hint_order", "Hints open in order: take the earlier ones first.");
    res.json(await view(req, slug));
  });

  /**
   * The member's private note on a problem they solved ("what gave it away"). Blank clears it.
   * Answers the updated problem page.
   */
  r.put("/problems/:slug/note", async (req, res) => {
    const slug = parse(Slug, req.params.slug);
    const { note } = parse(NoteBody, req.body);
    const a = await access(req, slug);
    const text = note.trim() === "" ? null : note.replace(/\r\n/g, "\n").trimEnd();
    const u = await pool.query(
      `UPDATE user_problems SET note = $3, note_updated_at = now()
        WHERE user_id = $1 AND problem_id = $2 AND solved_at IS NOT NULL`,
      [me(req).id, a.id, text],
    );
    if (u.rowCount === 0) throw new HttpError(403, "not_solved", "Notes open once you've solved the problem.");
    res.json(await view(req, slug));
  });

  return r;
}
