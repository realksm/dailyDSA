import { Router } from "express";
import session from "express-session";
import type pg from "pg";
import request from "supertest";
import { afterAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createPool } from "@dailydsa/db";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { badRequest, parse } from "../src/errors.js";
import { dummyHash, hashPassword, verifyPassword } from "../src/password.js";
import { pgSessionStore, SESSION_COOKIE } from "../src/session.js";
import { createUser } from "../src/users.js";

const config = loadConfig({ NODE_ENV: "test" });

/** Routes that exercise the error paths and the session. */
function testRoutes(): Router {
  const r = Router();
  r.post("/echo", (req, res) => {
    const input = parse(z.object({ name: z.string().min(1), n: z.number().int() }), req.body);
    res.json(input);
  });
  r.get("/http-error", () => {
    throw badRequest("nope", "custom_code");
  });
  r.get("/boom", async () => {
    await Promise.resolve();
    throw new Error("secret internals");
  });
  r.post("/login-as", (req, res) => {
    req.session.userId = (req.body as { id: number }).id;
    res.json({ ok: true });
  });
  r.get("/whoami", (req, res) => {
    res.json({ userId: req.session.userId ?? null });
  });
  return r;
}

// Every query "finds" user 7 (loadUser drops sessions whose user doesn't exist).
const user7 = { id: 7, email: "u7@x.test", name: "U7", role: "solver", password_hash: "", disabled: false };
const fakePool = (ok: boolean) => ({ query: async () => (ok ? { rows: [user7] } : Promise.reject(new Error("down"))) }) as unknown as pg.Pool;

function memApp(dbOk = true) {
  const logError = vi.fn();
  const app = createApp({ config, pool: fakePool(dbOk), sessionStore: new session.MemoryStore(), routes: [testRoutes()], logError });
  return { app, logError };
}

describe("config", () => {
  it("refuses production without a real session secret", () => {
    expect(() => loadConfig({ NODE_ENV: "production" })).toThrow(/SESSION_SECRET/);
    expect(() => loadConfig({ NODE_ENV: "production", SESSION_SECRET: "short" })).toThrow(/32/);
    const prod = { NODE_ENV: "production", SESSION_SECRET: "x".repeat(40), SMTP_URL: "smtps://u:p@mail.test:465", APP_URL: "https://dsa.test/" };
    expect(loadConfig(prod)).toMatchObject({ production: true, appUrl: "https://dsa.test" });
    expect(() => loadConfig({ ...prod, SMTP_URL: undefined })).toThrow(/SMTP_URL/);
    expect(() => loadConfig({ ...prod, APP_URL: "http://dsa.test" })).toThrow(/https/);
  });
  it("has dev defaults", () => {
    expect(config.port).toBe(3000);
    expect(config.databaseUrl).toContain("55432");
  });
});

describe("passwords", () => {
  it("hashes with argon2id and verifies", async () => {
    const h = await hashPassword("correct horse");
    expect(h).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(h, "correct horse")).toBe(true);
    expect(await verifyPassword(h, "wrong horse")).toBe(false);
    expect(await verifyPassword("not-a-hash", "x")).toBe(false);
    expect(await dummyHash()).toMatch(/^\$argon2id\$/);
  });
});

describe("app", () => {
  it("health reports the database", async () => {
    expect((await request(memApp().app).get("/api/health")).body).toEqual({ ok: true, db: true });
    const down = await request(memApp(false).app).get("/api/health");
    expect(down.status).toBe(503);
    expect(down.body).toEqual({ ok: false, db: false });
  });

  it("404s unknown routes as JSON", async () => {
    const r = await request(memApp().app).get("/api/nope");
    expect(r.status).toBe(404);
    expect(r.body.error.code).toBe("not_found");
  });

  it("rejects non-JSON writes (CSRF guard)", async () => {
    const r = await request(memApp().app).post("/api/echo").type("form").send("name=a&n=1");
    expect(r.status).toBe(415);
    expect(r.body.error.code).toBe("unsupported_media_type");
  });

  it("reports malformed JSON and oversized bodies as client errors", async () => {
    const bad = await request(memApp().app).post("/api/echo").set("Content-Type", "application/json").send("{oops");
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe("bad_json");
    const big = await request(memApp().app).post("/api/echo").send({ name: "x".repeat(300_000), n: 1 });
    expect(big.status).toBe(413);
    expect(big.body.error.code).toBe("too_large");
  });

  it("validates bodies with zod", async () => {
    const { app } = memApp();
    expect((await request(app).post("/api/echo").send({ name: "a", n: 2, extra: 1 })).body).toEqual({ name: "a", n: 2 });
    const r = await request(app).post("/api/echo").send({ name: "", n: 1.5 });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("invalid_request");
    expect(r.body.error.details.map((d: { path: string }) => d.path).sort()).toEqual(["n", "name"]);
  });

  it("maps HttpError and hides unexpected errors (incl. async throws)", async () => {
    const { app, logError } = memApp();
    const h = await request(app).get("/api/http-error");
    expect(h.status).toBe(400);
    expect(h.body).toEqual({ error: { code: "custom_code", message: "nope" } });
    const b = await request(app).get("/api/boom");
    expect(b.status).toBe(500);
    expect(b.body.error.code).toBe("internal");
    expect(JSON.stringify(b.body)).not.toContain("secret");
    expect(logError).toHaveBeenCalledOnce();
  });

  it("sets an httpOnly SameSite=Lax cookie only once the session is used", async () => {
    const agent = request.agent(memApp().app);
    const anon = await agent.get("/api/whoami");
    expect(anon.headers["set-cookie"]).toBeUndefined();
    const login = await agent.post("/api/login-as").send({ id: 7 });
    const cookie = String(login.headers["set-cookie"]);
    expect(cookie).toContain(`${SESSION_COOKIE}=`);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect((await agent.get("/api/whoami")).body).toEqual({ userId: 7 });
  });
});

const pool = createPool(config.databaseUrl);
const dbUp = await pool.query("SELECT 1 FROM session LIMIT 1").then(() => true, () => false);
afterAll(() => pool.end());

describe.skipIf(!dbUp)("sessions in Postgres (needs db + migrations)", () => {
  it("stores the session row and reads it back", async () => {
    const app = createApp({ config, pool, sessionStore: pgSessionStore(pool, false), routes: [testRoutes()] });
    const agent = request.agent(app);
    const u = await createUser(pool, { email: `s${Date.now()}@app-test.local`, name: "S", password: "whatever123", role: "solver" });
    try {
      const login = await agent.post("/api/login-as").send({ id: u.id });
      const sid = decodeURIComponent(String(login.headers["set-cookie"]).match(/dsa\.sid=([^;]+)/)![1]!).slice(2).split(".")[0]!;
      const row = await pool.query<{ sess: { userId: number } }>("SELECT sess FROM session WHERE sid = $1", [sid]);
      expect(row.rows[0]?.sess.userId).toBe(u.id);
      expect((await agent.get("/api/whoami")).body).toEqual({ userId: u.id });
      expect((await request(app).get("/api/health")).body).toEqual({ ok: true, db: true });
    } finally {
      await pool.query("DELETE FROM session WHERE (sess ->> 'userId')::int = $1", [u.id]);
      await pool.query("DELETE FROM users WHERE id = $1", [u.id]);
    }
  });

  it("drops a session whose user no longer exists, without breaking the request", async () => {
    const app = createApp({ config, pool, sessionStore: pgSessionStore(pool, false), routes: [testRoutes()] });
    const agent = request.agent(app);
    await agent.post("/api/login-as").send({ id: -1 });
    expect((await agent.get("/api/whoami")).body).toEqual({ userId: null });
    expect((await agent.post("/api/auth/logout").send({})).body).toEqual({ ok: true });
  });
});
