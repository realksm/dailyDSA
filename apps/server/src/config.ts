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
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters").default(DEV_SECRET),
});

export interface Config {
  production: boolean;
  port: number;
  host: string;
  databaseUrl: string;
  dataDir: string;
  sessionSecret: string;
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): Config {
  const e = env.parse(source);
  const production = e.NODE_ENV === "production";
  if (production && e.SESSION_SECRET === DEV_SECRET) throw new Error("SESSION_SECRET must be set in production");
  return {
    production,
    port: e.PORT,
    host: e.HOST,
    databaseUrl: e.DATABASE_URL,
    dataDir: path.resolve(e.DATA_DIR),
    sessionSecret: e.SESSION_SECRET,
  };
}
