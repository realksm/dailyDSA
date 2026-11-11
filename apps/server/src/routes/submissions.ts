// Run/Submit and polling: POST /api/problems/:slug/run|submit, GET /api/submissions/:id.
import { Router, type Request } from "express";
import type pg from "pg";
import { z } from "zod";
import { LANGS, type SubmissionKind, type SubmissionQueued } from "@dailydsa/shared";
import { me, requireUser } from "../auth.js";
import { conflict, notFound, parse, tooManyRequests } from "../errors.js";
import { istDate } from "../ist.js";
import { openToSolvers, seesAllProblems } from "../problems.js";
import { RateLimiter } from "../rate-limit.js";
import { enqueue, inFlight, submissionView } from "../submissions.js";

const Slug = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/, "Not a problem slug.");
const MAX_CODE = 64 * 1024;
const MAX_INPUT = 64 * 1024;
const Code = z.string().min(1, "Write some code first.").max(MAX_CODE, `Code is limited to ${MAX_CODE / 1024} KB.`);
const Lang = z.enum(LANGS);
const RunBody = z.object({
  lang: Lang,
  code: Code,
  customInput: z.string().max(MAX_INPUT, `Custom input is limited to ${MAX_INPUT / 1024} KB.`).optional(),
});
const SubmitBody = z.object({ lang: Lang, code: Code });
const Id = z.coerce.number().int().positive().max(2 ** 53);

/** One Run or Submit per user every 5 s (shared limit, PLAN §6). */
export const SUBMIT_INTERVAL_MS = 5000;

export function submissionRoutes({ pool, now, onQueued }: { pool: pg.Pool; now: () => Date; onQueued: () => void }): Router {
  const r = Router();
  const limiter = new RateLimiter(1, SUBMIT_INTERVAL_MS, () => now().getTime());

  async function queue(req: Request, kind: SubmissionKind, body: { lang: (typeof LANGS)[number]; code: string; customInput?: string }) {
    const slug = parse(Slug, req.params.slug);
    const user = me(req);
    // Same release rules as the problem page: unreleased problems are a plain 404.
    const p = await pool.query<{ id: number }>(
      `SELECT p.id FROM problems p WHERE p.slug = $1 AND ($3 OR ${openToSolvers("$2")})`,
      [slug, istDate(now()), seesAllProblems(user.role)],
    );
    const problemId = p.rows[0]?.id;
    if (problemId === undefined) throw notFound("No such problem.");
    if (await inFlight(pool, user.id)) throw conflict("Your last Run or Submit is still being judged.", "busy");
    if (!limiter.hit(String(user.id))) throw tooManyRequests(`One Run or Submit every ${SUBMIT_INTERVAL_MS / 1000} seconds, please.`);
    const id = await enqueue(pool, {
      userId: user.id, problemId, kind, lang: body.lang, code: body.code, customInput: body.customInput || null,
    });
    onQueued();
    return { id, status: "queued" } satisfies SubmissionQueued;
  }

  r.post("/problems/:slug/run", requireUser, async (req, res) => {
    res.status(202).json(await queue(req, "run", parse(RunBody, req.body)));
  });

  r.post("/problems/:slug/submit", requireUser, async (req, res) => {
    res.status(202).json(await queue(req, "submit", parse(SubmitBody, req.body)));
  });

  /** Poll about once a second until `status` is "done". Other people's submissions are a 404. */
  r.get("/submissions/:id", requireUser, async (req, res) => {
    const user = me(req);
    const view = await submissionView(pool, parse(Id, req.params.id), { id: user.id, isAdmin: user.role === "admin" });
    if (!view) throw notFound("No such submission.");
    res.json(view);
  });

  return r;
}
