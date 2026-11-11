import { Router } from "express";
import type pg from "pg";

export function healthRoutes(pool: pg.Pool): Router {
  const r = Router();
  r.get("/health", async (_req, res) => {
    const db = await pool.query("SELECT 1").then(() => true, () => false);
    res.status(db ? 200 : 503).json({ ok: db, db });
  });
  return r;
}
