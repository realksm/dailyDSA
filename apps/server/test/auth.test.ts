// Auth flows against the dev Postgres (docker compose up -d db && pnpm db:migrate).
import request from "supertest";
import { afterAll, describe, expect, it, vi } from "vitest";
import { createPool } from "@dailydsa/db";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { memoryMailer } from "../src/mailer.js";
import { pgSessionStore } from "../src/session.js";
import { createInvite, createUser, randomCode } from "../src/users.js";

const config = loadConfig({ NODE_ENV: "test", APP_URL: "http://site.test" });
const pool = createPool(config.databaseUrl);
const dbUp = await pool.query("SELECT 1 FROM password_resets LIMIT 1").then(() => true, () => false);

const DOMAIN = "auth-test.local";
let n = 0;
const email = () => `u${Date.now()}-${++n}@${DOMAIN}`;
const PW = "correct horse battery";

afterAll(async () => {
  if (dbUp) {
    await pool.query(`DELETE FROM session WHERE (sess ->> 'userId')::int IN (SELECT id FROM users WHERE email LIKE '%@${DOMAIN}')`);
    await pool.query(`DELETE FROM users WHERE email LIKE '%@${DOMAIN}'`);
    await pool.query("DELETE FROM invite_codes WHERE code LIKE 'TEST-%'");
  }
  await pool.end();
});

function setup() {
  const mailer = memoryMailer();
  const logError = vi.fn();
  const app = createApp({ config, pool, sessionStore: pgSessionStore(pool, false), mailer, logError });
  return { app, mailer, logError };
}

const invite = async (o: { maxUses?: number; role?: "solver" | "setter"; expiresAt?: Date } = {}) =>
  (await createInvite(pool, { code: `TEST-${randomCode()}`, maxUses: o.maxUses ?? 5, role: o.role ?? "solver", ...(o.expiresAt ? { expiresAt: o.expiresAt } : {}) })).code;

const sidOf = (res: request.Response) => String(res.headers["set-cookie"] ?? "").match(/dsa\.sid=([^;]*)/)?.[1];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe.skipIf(!dbUp)("auth (needs db + migrations)", () => {
  it("rejects anonymous /me", async () => {
    const r = await request(setup().app).get("/api/me");
    expect(r.status).toBe(401);
    expect(r.body.error.code).toBe("unauthorized");
  });

  it("signs up with an invite code; the code decides the role and counts uses", async () => {
    const { app } = setup();
    const code = await invite({ maxUses: 1, role: "setter" });
    const agent = request.agent(app);
    const e = email();
    const r = await agent.post("/api/auth/signup").send({ email: e.toUpperCase(), name: "  Asha ", password: PW, inviteCode: code.toLowerCase() });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ email: e, name: "Asha", role: "setter" });
    expect((await agent.get("/api/me")).body.email).toBe(e);

    const usedUp = await request(app).post("/api/auth/signup").send({ email: email(), name: "B", password: PW, inviteCode: code });
    expect(usedUp.body.error).toMatchObject({ code: "invalid_invite", message: expect.stringMatching(/used up/) });
    expect((await pool.query("SELECT uses FROM invite_codes WHERE code = $1", [code])).rows[0].uses).toBe(1);
  });

  it("refuses bad, expired and disabled codes, duplicate emails and weak passwords", async () => {
    const { app } = setup();
    const signup = (body: object) => request(app).post("/api/auth/signup").send({ email: email(), name: "X", password: PW, ...body });
    expect((await signup({ inviteCode: "TEST-NOPE" })).body.error.code).toBe("invalid_invite");
    const old = await invite({ expiresAt: new Date(Date.now() - 1000) });
    expect((await signup({ inviteCode: old })).body.error.message).toMatch(/expired/);
    const off = await invite();
    await pool.query("UPDATE invite_codes SET disabled = true WHERE code = $1", [off]);
    expect((await signup({ inviteCode: off })).body.error.code).toBe("invalid_invite");

    const code = await invite();
    const e = email();
    expect((await signup({ email: e, inviteCode: code })).status).toBe(201);
    const dup = await signup({ email: e.toUpperCase(), inviteCode: code });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe("email_taken");
    expect((await pool.query("SELECT uses FROM invite_codes WHERE code = $1", [code])).rows[0].uses).toBe(1); // rolled back

    const weak = await signup({ inviteCode: code, password: "short" });
    expect(weak.body.error.details[0]).toMatchObject({ path: "password" });
  });

  it("logs in (new session id), logs out, and drops sessions of disabled users", async () => {
    const { app } = setup();
    const e = email();
    const u = await createUser(pool, { email: e, name: "L", password: PW, role: "solver" });
    const agent = request.agent(app);

    const wrong = await agent.post("/api/auth/login").send({ email: e, password: "nope nope" });
    expect(wrong.status).toBe(401);
    const unknown = await agent.post("/api/auth/login").send({ email: email(), password: PW });
    expect(unknown.body.error.code).toBe("bad_credentials"); // same answer as a wrong password

    const first = await agent.post("/api/auth/login").send({ email: e, password: PW });
    expect(first.body).toEqual({ id: u.id, email: e, name: "L", role: "solver" });
    const second = await agent.post("/api/auth/login").send({ email: e, password: PW });
    expect(sidOf(second)).toBeDefined();
    expect(sidOf(second)).not.toBe(sidOf(first));

    expect((await agent.post("/api/auth/logout").send({})).body).toEqual({ ok: true });
    expect((await agent.get("/api/me")).status).toBe(401);

    await agent.post("/api/auth/login").send({ email: e, password: PW });
    await pool.query("UPDATE users SET disabled = true WHERE id = $1", [u.id]);
    expect((await agent.get("/api/me")).status).toBe(401);
    const blocked = await request(app).post("/api/auth/login").send({ email: e, password: PW });
    expect(blocked.body.error.code).toBe("account_disabled");
  });

  it("rate-limits repeated failed logins for an email", async () => {
    const { app } = setup();
    const e = email();
    await createUser(pool, { email: e, name: "R", password: PW, role: "solver" });
    for (let i = 0; i < 10; i++) expect((await request(app).post("/api/auth/login").send({ email: e, password: "wrong pass" })).status).toBe(401);
    const r = await request(app).post("/api/auth/login").send({ email: e, password: PW });
    expect(r.status).toBe(429);
  });

  it("changes the password and logs out other devices only", async () => {
    const { app } = setup();
    const e = email();
    await createUser(pool, { email: e, name: "C", password: PW, role: "solver" });
    const laptop = request.agent(app);
    const phone = request.agent(app);
    await laptop.post("/api/auth/login").send({ email: e, password: PW });
    await phone.post("/api/auth/login").send({ email: e, password: PW });

    const bad = await laptop.post("/api/me/password").send({ currentPassword: "wrong one", newPassword: "another long one" });
    expect(bad.body.error.code).toBe("bad_credentials");
    expect((await laptop.post("/api/me/password").send({ currentPassword: PW, newPassword: "another long one" })).body).toEqual({ ok: true });
    expect((await laptop.get("/api/me")).status).toBe(200);
    expect((await phone.get("/api/me")).status).toBe(401);
    expect((await request(app).post("/api/auth/login").send({ email: e, password: "another long one" })).status).toBe(200);
  });

  it("resets a forgotten password by email", async () => {
    const { app, mailer, logError } = setup();
    const e = email();
    await createUser(pool, { email: e, name: "Ravi", password: PW, role: "solver" });
    const oldDevice = request.agent(app);
    await oldDevice.post("/api/auth/login").send({ email: e, password: PW });

    // Unknown email: same answer, no mail.
    expect((await request(app).post("/api/auth/forgot-password").send({ email: email() })).body).toEqual({ ok: true });
    expect((await request(app).post("/api/auth/forgot-password").send({ email: e })).body).toEqual({ ok: true });
    await vi.waitFor(() => expect(mailer.sent).toHaveLength(1));
    const mail = mailer.sent[0]!;
    expect(mail.to).toBe(e);
    expect(mail.text).toContain("Hi Ravi");
    const link = mail.text.match(/http:\/\/site\.test\/reset-password\?token=(\S+)/);
    expect(link).not.toBeNull();
    const token = decodeURIComponent(link![1]!);

    // A second request right away doesn't send another mail.
    await request(app).post("/api/auth/forgot-password").send({ email: e });
    await sleep(300);
    expect(mailer.sent).toHaveLength(1);

    // Only the hash is stored.
    const stored = await pool.query("SELECT token_hash FROM password_resets pr JOIN users u ON u.id = pr.user_id WHERE u.email = $1", [e]);
    expect(stored.rows[0].token_hash).not.toContain(token);

    const weak = await request(app).post("/api/auth/reset-password").send({ token, password: "short" });
    expect(weak.status).toBe(400);
    expect((await request(app).post("/api/auth/reset-password").send({ token, password: "brand new password" })).body).toEqual({ ok: true });
    expect((await oldDevice.get("/api/me")).status).toBe(401); // logged out everywhere
    expect((await request(app).post("/api/auth/login").send({ email: e, password: PW })).status).toBe(401);
    expect((await request(app).post("/api/auth/login").send({ email: e, password: "brand new password" })).status).toBe(200);

    const reuse = await request(app).post("/api/auth/reset-password").send({ token, password: "yet another password" });
    expect(reuse.body.error.code).toBe("invalid_token");
    expect(logError).not.toHaveBeenCalled();
  });

  it("refuses expired reset tokens", async () => {
    const { app, mailer } = setup();
    const e = email();
    await createUser(pool, { email: e, name: "T", password: PW, role: "solver" });
    await request(app).post("/api/auth/forgot-password").send({ email: e });
    await vi.waitFor(() => expect(mailer.sent).toHaveLength(1));
    const token = decodeURIComponent(mailer.sent[0]!.text.match(/token=(\S+)/)![1]!);
    await pool.query("UPDATE password_resets SET expires_at = now() - interval '1 second' WHERE user_id = (SELECT id FROM users WHERE email = $1)", [e]);
    const r = await request(app).post("/api/auth/reset-password").send({ token, password: "brand new password" });
    expect(r.body.error.code).toBe("invalid_token");
  });
});
