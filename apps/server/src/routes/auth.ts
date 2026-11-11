// Signup (invite code), login, logout, /me, change password, and password reset by email.
import { Router, type Request } from "express";
import type pg from "pg";
import { z } from "zod";
import { destroySession, me, regenerateSession, requireUser } from "../auth.js";
import type { Config } from "../config.js";
import { HttpError, parse, tooManyRequests } from "../errors.js";
import { passwordResetMail, type Mailer } from "../mailer.js";
import { dummyHash, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, verifyPassword } from "../password.js";
import { RateLimiter } from "../rate-limit.js";
import { SESSION_COOKIE } from "../session.js";
import {
  createResetToken, findUserByEmail, getUser, lastResetAgeSeconds, RESET_TOKEN_MINUTES,
  resetPasswordWithToken, setPassword, signupWithInvite, toMe,
} from "../users.js";

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")).pipe(z.string().max(254));
const password = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`)
  .max(MAX_PASSWORD_LENGTH, `Use at most ${MAX_PASSWORD_LENGTH} characters.`);

const SignupBody = z.object({
  email,
  name: z.string().trim().min(1, "Enter your name.").max(60),
  password,
  inviteCode: z.string().trim().toUpperCase().min(1, "Enter your invite code.").max(64),
});
// Login doesn't enforce the length rules: old passwords may predate them, and a 400 would leak them.
const LoginBody = z.object({ email, password: z.string().min(1).max(MAX_PASSWORD_LENGTH) });
const ChangePasswordBody = z.object({ currentPassword: z.string().min(1).max(MAX_PASSWORD_LENGTH), newPassword: password });
const ForgotBody = z.object({ email });
const ResetBody = z.object({ token: z.string().min(20).max(200), password });

const MIN = 60_000;
/** Minimum gap between two reset emails to the same account. */
export const RESET_EMAIL_GAP_SECONDS = 120;

export interface AuthDeps {
  pool: pg.Pool;
  config: Config;
  mailer: Mailer;
  logError: (err: unknown) => void;
}

export function authRoutes({ pool, config, mailer, logError }: AuthDeps): Router {
  const r = Router();
  const limits = {
    loginIp: new RateLimiter(30, 15 * MIN), // failed logins
    loginEmail: new RateLimiter(10, 15 * MIN), // failed logins
    signupIp: new RateLimiter(10, 60 * MIN),
    forgotIp: new RateLimiter(5, 15 * MIN),
    resetIp: new RateLimiter(10, 15 * MIN),
  };
  const ip = (req: Request) => req.ip ?? "?";
  const slowDown = () => tooManyRequests("Too many attempts. Please wait a few minutes and try again.");

  async function startSession(req: Request, userId: number) {
    await regenerateSession(req); // new session id on login: no session fixation
    req.session.userId = userId;
  }

  r.post("/auth/signup", async (req, res) => {
    if (!limits.signupIp.hit(ip(req))) throw slowDown();
    const body = parse(SignupBody, req.body);
    const user = await signupWithInvite(pool, body);
    await startSession(req, user.id);
    res.status(201).json(user);
  });

  r.post("/auth/login", async (req, res) => {
    const body = parse(LoginBody, req.body);
    if (limits.loginIp.blocked(ip(req)) || limits.loginEmail.blocked(body.email)) throw slowDown();
    const u = await findUserByEmail(pool, body.email);
    // Always run one argon2 verify so response time doesn't reveal whether the email exists.
    const ok = await verifyPassword(u?.password_hash ?? (await dummyHash()), body.password);
    if (!u || !ok) {
      limits.loginIp.hit(ip(req));
      limits.loginEmail.hit(body.email);
      throw new HttpError(401, "bad_credentials", "Wrong email or password.");
    }
    if (u.disabled) throw new HttpError(403, "account_disabled", "This account has been disabled.");
    limits.loginEmail.reset(body.email);
    await startSession(req, u.id);
    res.json(toMe(u));
  });

  r.post("/auth/logout", async (req, res) => {
    if (req.session.userId !== undefined) await destroySession(req);
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    res.json({ ok: true });
  });

  r.get("/me", requireUser, (req, res) => {
    res.json(me(req));
  });

  r.post("/me/password", requireUser, async (req, res) => {
    const body = parse(ChangePasswordBody, req.body);
    const key = `user:${me(req).id}`;
    if (limits.loginEmail.blocked(key)) throw slowDown();
    const u = await getUser(pool, me(req).id);
    if (!u || !(await verifyPassword(u.password_hash, body.currentPassword))) {
      limits.loginEmail.hit(key);
      throw new HttpError(400, "bad_credentials", "Your current password is wrong.");
    }
    await setPassword(pool, u.id, body.newPassword, req.sessionID); // logs out other devices
    res.json({ ok: true });
  });

  // Always answers the same way, whether or not the email has an account (no enumeration).
  r.post("/auth/forgot-password", async (req, res) => {
    if (!limits.forgotIp.hit(ip(req))) throw slowDown();
    const body = parse(ForgotBody, req.body);
    res.json({ ok: true });
    // After responding, so timing reveals nothing either.
    sendResetEmail(body.email).catch(logError);
  });

  async function sendResetEmail(address: string) {
    const u = await findUserByEmail(pool, address);
    if (!u || u.disabled) return;
    const age = await lastResetAgeSeconds(pool, u.id);
    if (age !== undefined && age < RESET_EMAIL_GAP_SECONDS) return; // don't let anyone flood an inbox
    const token = await createResetToken(pool, u.id);
    const link = `${config.appUrl}/reset-password?token=${encodeURIComponent(token)}`;
    await mailer.send(passwordResetMail(u.email, u.name, link, RESET_TOKEN_MINUTES));
  }

  r.post("/auth/reset-password", async (req, res) => {
    if (!limits.resetIp.hit(ip(req))) throw slowDown();
    const body = parse(ResetBody, req.body);
    if (!(await resetPasswordWithToken(pool, body.token, body.password))) {
      throw new HttpError(400, "invalid_token", "This reset link is invalid or has expired. Ask for a new one.");
    }
    res.json({ ok: true });
  });

  return r;
}
