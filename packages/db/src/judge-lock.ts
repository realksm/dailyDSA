// One judge at a time (PLAN §6/§7): the queue worker and `pnpm dsa validate` both take this
// session-level advisory lock around their go-judge work, so calibration never competes with
// live judging. Must be one connection for lock and unlock (a PoolClient, not the Pool).
import type pg from "pg";

export const JUDGE_LOCK_KEY = 727002;

export async function withJudgeLock<T>(client: pg.ClientBase, fn: () => Promise<T>): Promise<T> {
  await client.query("SELECT pg_advisory_lock($1)", [JUDGE_LOCK_KEY]);
  try {
    return await fn();
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [JUDGE_LOCK_KEY]);
  }
}
