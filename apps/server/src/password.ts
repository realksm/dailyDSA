// Password hashing (argon2id, library defaults: m=64 MiB, t=3, p=4).
import argon2 from "argon2";

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 200; // bounds hashing work per request

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

/** False for a wrong password or a malformed stored hash; never throws on bad input. */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/** A valid hash of a random password, for comparing against when the email doesn't exist (same timing). */
let dummy: Promise<string> | undefined;
export function dummyHash(): Promise<string> {
  return (dummy ??= hashPassword(crypto.randomUUID()));
}
