// Cookie sessions stored in Postgres (connect-pg-simple, table `session` from 001_init.sql).
import connectPgSimple from "connect-pg-simple";
import session from "express-session";
import type { RequestHandler } from "express";
import type pg from "pg";
import type { Config } from "./config.js";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

export const SESSION_COOKIE = "dsa.sid";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function pgSessionStore(pool: pg.Pool, prune = true): session.Store {
  const PgStore = connectPgSimple(session);
  return new PgStore({
    pool,
    tableName: "session",
    createTableIfMissing: false, // created by migrations
    pruneSessionInterval: prune ? 15 * 60 : false,
  });
}

export function sessionMiddleware(config: Config, store: session.Store): RequestHandler {
  return session({
    name: SESSION_COOKIE,
    secret: config.sessionSecret,
    store,
    resave: false,
    saveUninitialized: false, // no row/cookie until login
    rolling: true, // active users stay logged in
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: config.production, // behind Caddy (trust proxy is set)
      maxAge: THIRTY_DAYS_MS,
    },
  });
}
