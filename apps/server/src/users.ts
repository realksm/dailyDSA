// Accounts, invite codes and password-reset tokens. Used by the API routes and by the CLI
// (`pnpm dsa admin create`, `pnpm dsa invite create`), so it only depends on pg + argon2.
import { createHash, randomBytes } from "node:crypto";
import type pg from "pg";
import type { Me, Role } from "@dailydsa/shared";
import { HttpError } from "./errors.js";
import { hashPassword } from "./password.js";

type Db = pg.Pool | pg.PoolClient;

export const RESET_TOKEN_MINUTES = 60;

const ME_COLUMNS = "id, email::text AS email, name, role";

export interface UserRow extends Me {
  password_hash: string;
  disabled: boolean;
}

export async function getUser(db: Db, id: number): Promise<UserRow | undefined> {
  const r = await db.query<UserRow>(`SELECT ${ME_COLUMNS}, password_hash, disabled FROM users WHERE id = $1`, [id]);
  return r.rows[0];
}

export async function findUserByEmail(db: Db, email: string): Promise<UserRow | undefined> {
  const r = await db.query<UserRow>(`SELECT ${ME_COLUMNS}, password_hash, disabled FROM users WHERE email = $1`, [email]);
  return r.rows[0];
}

export const toMe = (u: Me): Me => ({ id: u.id, email: u.email, name: u.name, role: u.role });

const isUniqueViolation = (e: unknown) => (e as { code?: string })?.code === "23505";
const emailTaken = () => new HttpError(409, "email_taken", "An account with this email already exists.");

/** Admin bootstrap (CLI). Throws email_taken if the email exists. */
export async function createUser(db: Db, u: { email: string; name: string; password: string; role: Role }): Promise<Me> {
  const hash = await hashPassword(u.password);
  try {
    const r = await db.query<Me>(`INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING ${ME_COLUMNS}`, [u.email, u.name, hash, u.role]);
    return r.rows[0]!;
  } catch (e) {
    throw isUniqueViolation(e) ? emailTaken() : e;
  }
}

/** Signup: the invite decides the role; its use is counted in the same transaction (row-locked). */
export async function signupWithInvite(pool: pg.Pool, u: { email: string; name: string; password: string; inviteCode: string }): Promise<Me> {
  const hash = await hashPassword(u.password); // slow: do it before taking the lock
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const inv = await client.query<{ max_uses: number; uses: number; expired: boolean; disabled: boolean; role: Role }>(
      "SELECT max_uses, uses, expires_at IS NOT NULL AND expires_at <= now() AS expired, disabled, role FROM invite_codes WHERE code = $1 FOR UPDATE",
      [u.inviteCode],
    );
    const code = inv.rows[0];
    const bad = (m: string) => new HttpError(400, "invalid_invite", m);
    if (!code || code.disabled) throw bad("This invite code isn't valid.");
    if (code.expired) throw bad("This invite code has expired.");
    if (code.uses >= code.max_uses) throw bad("This invite code has been used up.");
    let me: Me;
    try {
      const r = await client.query<Me>(
        `INSERT INTO users (email, name, password_hash, role, invite_code) VALUES ($1, $2, $3, $4, $5) RETURNING ${ME_COLUMNS}`,
        [u.email, u.name, hash, code.role, u.inviteCode],
      );
      me = r.rows[0]!;
    } catch (e) {
      throw isUniqueViolation(e) ? emailTaken() : e;
    }
    await client.query("UPDATE invite_codes SET uses = uses + 1 WHERE code = $1", [u.inviteCode]);
    await client.query("COMMIT");
    return me;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/** A random 16-character password (admin bootstrap and admin resets; shown once). */
export const randomPassword = () => randomBytes(12).toString("base64url");

/** Unambiguous alphabet (no 0/O/1/I/L) so codes survive being read out loud. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function randomCode(groups = 2, size = 4): string {
  const bytes = randomBytes(groups * size);
  const chars = [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]);
  const parts = Array.from({ length: groups }, (_, i) => chars.slice(i * size, (i + 1) * size).join(""));
  return ["DSA", ...parts].join("-");
}

export async function createInvite(
  db: Db,
  o: { code?: string; maxUses: number; role: Role; expiresAt?: Date; createdBy?: number },
): Promise<{ code: string }> {
  const code = o.code ?? randomCode();
  await db.query("INSERT INTO invite_codes (code, max_uses, role, expires_at, created_by) VALUES ($1, $2, $3, $4, $5)", [
    code, o.maxUses, o.role, o.expiresAt ?? null, o.createdBy ?? null,
  ]);
  return { code };
}

/**
 * Logs the user out of every session except `keepSid` (the one changing the password).
 * Sessions are rows in `session`; userId lives in the JSON (see session.ts).
 */
export async function revokeSessions(db: Db, userId: number, keepSid?: string): Promise<void> {
  await db.query("DELETE FROM session WHERE (sess ->> 'userId')::int = $1 AND sid IS DISTINCT FROM $2", [userId, keepSid ?? null]);
}

export async function setPassword(db: Db, userId: number, password: string, keepSid?: string): Promise<void> {
  const hash = await hashPassword(password);
  await db.query("UPDATE users SET password_hash = $2 WHERE id = $1", [userId, hash]);
  await revokeSessions(db, userId, keepSid);
}

// ───────────── password reset by email ─────────────

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Seconds since the user's newest reset token, or undefined if none. */
export async function lastResetAgeSeconds(db: Db, userId: number): Promise<number | undefined> {
  const r = await db.query<{ age: number }>(
    "SELECT extract(epoch FROM now() - max(created_at))::float AS age FROM password_resets WHERE user_id = $1",
    [userId],
  );
  return r.rows[0]?.age ?? undefined;
}

/** Returns the raw token for the email link; only its hash is stored. */
export async function createResetToken(db: Db, userId: number): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db.query(`INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '${RESET_TOKEN_MINUTES} minutes')`, [sha256(token), userId]);
  return token;
}

/**
 * Sets a new password if the token is valid, unused and unexpired; then burns every outstanding
 * token of that user and logs them out everywhere. Returns false for any bad token.
 */
export async function resetPasswordWithToken(pool: pg.Pool, token: string, password: string): Promise<boolean> {
  const hash = await hashPassword(password);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const r = await client.query<{ user_id: number }>(
      `SELECT pr.user_id FROM password_resets pr JOIN users u ON u.id = pr.user_id
        WHERE pr.token_hash = $1 AND pr.used_at IS NULL AND pr.expires_at > now() AND NOT u.disabled
        FOR UPDATE OF pr`,
      [sha256(token)],
    );
    const userId = r.rows[0]?.user_id;
    if (userId === undefined) {
      await client.query("ROLLBACK");
      return false;
    }
    await client.query("UPDATE users SET password_hash = $2 WHERE id = $1", [userId, hash]);
    await client.query("UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL", [userId]);
    await revokeSessions(client, userId);
    await client.query("COMMIT");
    return true;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
