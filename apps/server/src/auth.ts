// Who is calling: loads req.user from the session on every /api request, plus route guards.
import type { Request, RequestHandler } from "express";
import type pg from "pg";
import type { Me, Role } from "@dailydsa/shared";
import { forbidden, unauthorized } from "./errors.js";
import { getUser, toMe } from "./users.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: Me;
    }
  }
}

/** A disabled or deleted account loses its session on the next request. */
export function loadUser(pool: pg.Pool): RequestHandler {
  return async (req, _res, next) => {
    const id = req.session?.userId;
    if (id === undefined) return next();
    const u = await getUser(pool, id);
    if (u && !u.disabled) {
      req.user = toMe(u);
      return next();
    }
    await regenerateSession(req); // drop it, but keep req.session usable for later handlers
    next();
  };
}

export const requireUser: RequestHandler = (req, _res, next) => next(req.user ? undefined : unauthorized());

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    next(roles.includes(req.user.role) ? undefined : forbidden());
  };
}

/** The signed-in user; only call behind requireUser. */
export function me(req: Request): Me {
  if (!req.user) throw unauthorized();
  return req.user;
}

// express-session's callback API, promisified.
export const regenerateSession = (req: Request) => new Promise<void>((ok, fail) => req.session.regenerate((e) => (e ? fail(e) : ok())));
export const destroySession = (req: Request) => new Promise<void>((ok, fail) => req.session.destroy((e) => (e ? fail(e) : ok())));
