// Server configuration from the environment. Production refuses to start with dev defaults.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { DEFAULT_DATABASE_URL } from "@dailydsa/db";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const DEV_SECRET = "dev-only-session-secret-change-me-in-production";

const env = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default("127.0.0.1"),
  DATABASE_URL: z.string().default(DEFAULT_DATABASE_URL),
  DATA_DIR: z.string().default(path.join(ROOT, ".data")),
  /** The built web app (pnpm web:build); served with an SPA fallback when it exists. */
  WEB_DIR: z.string().default(path.join(ROOT, "apps", "web", "dist")),
  /** go-judge's REST API; in production only reachable on the Docker network. */
  JUDGE_URL: z.url().default("http://127.0.0.1:5050"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters").default(DEV_SECRET),
  /** Public origin of the site; used to build links in emails. Vite's dev server by default. */
  APP_URL: z.url().default("http://localhost:5173"),
  /** e.g. smtps://user:pass@smtp-relay.brevo.com:465 — unset = print mails to the console (dev only). */
  SMTP_URL: z.string().optional(),
  MAIL_FROM: z.string().default("dailyDSA <no-reply@localhost>"),
});

export interface Config {
  production: boolean;
  port: number;
  host: string;
  databaseUrl: string;
  dataDir: string;
  webDir: string;
  judgeUrl: string;
  sessionSecret: string;
  appUrl: string;
  smtpUrl?: string;
  mailFrom: string;
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): Config {
  const e = env.parse(source);
  const production = e.NODE_ENV === "production";
  if (production) {
    if (e.SESSION_SECRET === DEV_SECRET) throw new Error("SESSION_SECRET must be set in production");
    if (!e.SMTP_URL) throw new Error("SMTP_URL must be set in production (password reset emails)");
    if (!e.APP_URL.startsWith("https://")) throw new Error("APP_URL must be https:// in production");
  }
  return {
    production,
    port: e.PORT,
    host: e.HOST,
    databaseUrl: e.DATABASE_URL,
    dataDir: path.resolve(e.DATA_DIR),
    webDir: path.resolve(e.WEB_DIR),
    judgeUrl: e.JUDGE_URL.replace(/\/+$/, ""),
    sessionSecret: e.SESSION_SECRET,
    appUrl: e.APP_URL.replace(/\/+$/, ""),
    ...(e.SMTP_URL ? { smtpUrl: e.SMTP_URL } : {}),
    mailFrom: e.MAIL_FROM,
  };
}
