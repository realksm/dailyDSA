// Express app factory. main.ts wires it to a real pool; tests pass their own store/mailer/routes.
import express, { type RequestHandler, type Router } from "express";
import type session from "express-session";
import type pg from "pg";
import { loadUser } from "./auth.js";
import type { Config } from "./config.js";
import { errorHandler, HttpError, notFoundHandler } from "./errors.js";
import { createMailer, type Mailer } from "./mailer.js";
import { authRoutes } from "./routes/auth.js";
import { dailyRoutes } from "./routes/daily.js";
import { healthRoutes } from "./routes/health.js";
import { problemRoutes } from "./routes/problems.js";
import { pgSessionStore, sessionMiddleware } from "./session.js";

export interface AppDeps {
  config: Config;
  pool: pg.Pool;
  /** Defaults to the Postgres store. */
  sessionStore?: session.Store;
  /** Defaults to SMTP (SMTP_URL) or the console. */
  mailer?: Mailer;
  /** Extra routers mounted under /api before the 404 handler (used by tests). */
  routes?: Router[];
  logError?: (err: unknown) => void;
  /** Clock for the IST date; tests move it. */
  now?: () => Date;
}

/**
 * CSRF guard: state-changing /api requests must be JSON. A cross-site <form> can't send
 * application/json, and a cross-site fetch() with it needs a CORS preflight we never grant.
 * Together with SameSite=Lax cookies this is enough for a same-origin JSON API.
 */
const requireJson: RequestHandler = (req, _res, next) => {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
  if (!req.is("application/json")) return next(new HttpError(415, "unsupported_media_type", "Send a JSON body (Content-Type: application/json)."));
  next();
};

export function createApp(deps: AppDeps): express.Express {
  const { config, pool } = deps;
  const logError = deps.logError ?? console.error;
  const app = express();
  app.disable("x-powered-by");
  if (config.production) app.set("trust proxy", 1); // Caddy terminates TLS

  const api = express.Router();
  api.use(requireJson);
  api.use(express.json({ limit: "256kb" })); // code + custom input
  api.use(sessionMiddleware(config, deps.sessionStore ?? pgSessionStore(pool)));
  api.use(loadUser(pool));
  api.use(healthRoutes(pool));
  api.use(authRoutes({ pool, config, mailer: deps.mailer ?? createMailer(config), logError }));
  const now = deps.now ?? (() => new Date());
  api.use(dailyRoutes({ pool, now }));
  api.use(problemRoutes({ pool, now, dataDir: config.dataDir }));
  for (const r of deps.routes ?? []) api.use(r);
  api.use(notFoundHandler);

  app.use("/api", api);
  app.use(errorHandler(logError));
  return app;
}
