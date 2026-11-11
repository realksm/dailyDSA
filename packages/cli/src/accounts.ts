// Account bootstrap commands (until the admin page exists, and for lock-outs without SMTP).
//   pnpm dsa admin create <email> <name...> [--password <pw>]   prints a generated password if none given
//   pnpm dsa admin reset-password <email>                       sets and prints a new random password
//   pnpm dsa invite create [--uses N] [--role solver|setter|admin] [--days D]
import { randomBytes } from "node:crypto";
import { createPool } from "@dailydsa/db";
import { ROLES, type Role } from "@dailydsa/shared";
import { MIN_PASSWORD_LENGTH } from "@dailydsa/server/password";
import { createInvite, createUser, findUserByEmail, setPassword } from "@dailydsa/server/users";
import { ProblemError } from "./problem.js";

const usage = (s: string) => new ProblemError(`usage: ${s}`);

/** Splits `--flag value` options from positional args. */
function options(args: string[]): { pos: string[]; opt: Map<string, string> } {
  const pos: string[] = [];
  const opt = new Map<string, string>();
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a.startsWith("--")) {
      const v = args[++i];
      if (v === undefined) throw new ProblemError(`${a} needs a value`);
      opt.set(a.slice(2), v);
    } else pos.push(a);
  }
  return { pos, opt };
}

const int = (s: string | undefined, name: string, dflt: number) => {
  if (s === undefined) return dflt;
  const n = Number(s);
  if (!Number.isInteger(n) || n <= 0) throw new ProblemError(`--${name} must be a positive integer`);
  return n;
};

const randomPassword = () => randomBytes(12).toString("base64url");

export async function accountsCommand(cmd: string, args: string[], log: (s: string) => void): Promise<number> {
  const [sub, ...rest] = args;
  const { pos, opt } = options(rest);
  const db = createPool();
  try {
    if (cmd === "admin" && sub === "create") {
      const [email, ...nameParts] = pos;
      if (!email || !nameParts.length) throw usage("pnpm dsa admin create <email> <name...> [--password <pw>]");
      const password = opt.get("password") ?? randomPassword();
      if (password.length < MIN_PASSWORD_LENGTH) throw new ProblemError(`password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      try {
        const u = await createUser(db, { email: email.toLowerCase(), name: nameParts.join(" "), password, role: "admin" });
        log(`created admin ${u.email} (id ${u.id})${opt.has("password") ? "" : `\npassword: ${password}`}`);
      } catch (e) {
        if ((e as { code?: string }).code === "email_taken") throw new ProblemError(`${email} already has an account`);
        throw e;
      }
      return 0;
    }
    if (cmd === "admin" && sub === "reset-password") {
      const [email] = pos;
      if (!email) throw usage("pnpm dsa admin reset-password <email>");
      const u = await findUserByEmail(db, email.toLowerCase());
      if (!u) throw new ProblemError(`no account for ${email}`);
      const password = randomPassword();
      await setPassword(db, u.id, password); // also logs them out everywhere
      log(`new password for ${u.email}: ${password}`);
      return 0;
    }
    if (cmd === "invite" && sub === "create") {
      const role = (opt.get("role") ?? "solver") as Role;
      if (!ROLES.includes(role)) throw new ProblemError(`--role must be one of ${ROLES.join(", ")}`);
      const maxUses = int(opt.get("uses"), "uses", 1);
      const days = opt.has("days") ? int(opt.get("days"), "days", 0) : undefined;
      const expiresAt = days ? new Date(Date.now() + days * 86_400_000) : undefined;
      const { code } = await createInvite(db, { maxUses, role, ...(expiresAt ? { expiresAt } : {}) });
      log(`invite ${code} — ${role}, ${maxUses} use${maxUses > 1 ? "s" : ""}${expiresAt ? `, expires ${expiresAt.toISOString().slice(0, 10)}` : ", no expiry"}`);
      return 0;
    }
    throw usage("pnpm dsa admin create|reset-password …  |  pnpm dsa invite create …");
  } finally {
    await db.end();
  }
}
