import pg from "pg";

export const DEFAULT_DATABASE_URL = "postgres://dailydsa:dailydsa@127.0.0.1:55432/dailydsa";

// DATE columns (IST calendar days) come back as "YYYY-MM-DD" strings. pg's default turns them
// into a Date at local midnight, which shifts the day whenever the process isn't on IST.
pg.types.setTypeParser(pg.types.builtins.DATE, (v) => v);

export function createPool(url = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL): pg.Pool {
  return new pg.Pool({ connectionString: url, max: 10 });
}
