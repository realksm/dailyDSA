import pg from "pg";

export const DEFAULT_DATABASE_URL = "postgres://dailydsa:dailydsa@127.0.0.1:55432/dailydsa";

export function createPool(url = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL): pg.Pool {
  return new pg.Pool({ connectionString: url, max: 10 });
}
