// The admin page API under /api/admin. Admins: users, invite codes, track weeks.
// Admins and setters: the problem bank, the schedule view, day pins (PLAN §1). Lessons come from git (dsa track import).
// Only the future can be changed: today's problem and started weeks are already out.
import { Router } from "express";
import type pg from "pg";
import { z } from "zod";
import { ROLES, type PasswordResetByAdmin, type Schedule } from "@dailydsa/shared";
import {
  adminUsers, deleteInvite, invites, pinDay, scheduleDays, scheduleWeek, staffProblems, staffTracks, trackWeeks,
  unpinDay, unscheduleWeek, updateInvite, updateUser,
} from "../admin.js";
import { me, requireRole } from "../auth.js";
import { badRequest, conflict, HttpError, notFound, parse } from "../errors.js";
import { addDays, isDay, isoWeekday, istDate } from "../ist.js";
import { createInvite, randomPassword, revokeSessions, setPassword } from "../users.js";

const Day = z.string().refine(isDay, "Use a YYYY-MM-DD date.");
const Monday = Day.refine((d) => isoWeekday(d) === 1, "Weeks start on a Monday.");
const Slug = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/, "Not a slug.");
const Id = z.coerce.number().int().positive().max(2 ** 31 - 1);
const Role = z.enum(ROLES);
const InviteCodeParam = z.string().trim().toUpperCase().min(1).max(64);
const MaxUses = z.number().int().min(1).max(10_000);
const ExpiresAt = z.iso.datetime({ offset: true }).transform((s) => new Date(s));

const UserPatch = z
  .object({ role: Role.optional(), disabled: z.boolean().optional() })
  .refine((o) => o.role !== undefined || o.disabled !== undefined, "Send role and/or disabled.");
const InviteCreate = z.object({ maxUses: MaxUses.default(1), role: Role.default("solver"), expiresAt: ExpiresAt.optional() });
const InvitePatch = z
  .object({ disabled: z.boolean().optional(), maxUses: MaxUses.optional(), expiresAt: ExpiresAt.nullable().optional() })
  .refine((o) => Object.values(o).some((v) => v !== undefined), "Nothing to change.");
const PinBody = z.object({ slug: Slug });
const WeekBody = z.object({ pattern: Slug });
const ScheduleQuery = z.object({ from: Day.optional(), to: Day.optional() });

/** Longest range GET /admin/schedule returns. */
export const MAX_SCHEDULE_DAYS = 400;

const notFuture = (what: string) => badRequest(`${what} is already out; only future days can be changed.`, "not_future");

export function adminRoutes({ pool, now }: { pool: pg.Pool; now: () => Date }): Router {
  const r = Router();
  const admin = requireRole("admin");
  const staff = requireRole("admin", "setter");
  const today = () => istDate(now());

  // ───────────── users (admin) ─────────────

  r.get("/admin/users", admin, async (_req, res) => {
    res.json(await adminUsers(pool));
  });

  /** Change a role or (dis)able an account. Not your own: that's how admins lock themselves out. */
  r.patch("/admin/users/:id", admin, async (req, res) => {
    const id = parse(Id, req.params.id);
    const body = parse(UserPatch, req.body);
    if (id === me(req).id) throw badRequest("You can't change your own role or disable yourself.", "self");
    if (!(await updateUser(pool, id, body))) throw notFound("No such user.");
    if (body.disabled) await revokeSessions(pool, id); // loadUser would drop them anyway; this is immediate
    res.json((await adminUsers(pool, id))[0]);
  });

  /** Sets a random password, logs the user out everywhere and shows the password once. */
  r.post("/admin/users/:id/reset-password", admin, async (req, res) => {
    const id = parse(Id, req.params.id);
    if (id === me(req).id) throw badRequest("Use Change password for your own account.", "self");
    if (!(await adminUsers(pool, id))[0]) throw notFound("No such user.");
    const password = randomPassword();
    await setPassword(pool, id, password);
    res.json({ password } satisfies PasswordResetByAdmin);
  });

  // ───────────── invite codes (admin) ─────────────

  r.get("/admin/invites", admin, async (_req, res) => {
    res.json(await invites(pool));
  });

  r.post("/admin/invites", admin, async (req, res) => {
    const body = parse(InviteCreate, req.body);
    if (body.expiresAt && body.expiresAt <= now()) throw badRequest("The expiry must be in the future.", "expired");
    const { code } = await createInvite(pool, {
      maxUses: body.maxUses, role: body.role, createdBy: me(req).id, ...(body.expiresAt && { expiresAt: body.expiresAt }),
    });
    res.status(201).json((await invites(pool, code))[0]);
  });

  /** Turn off / on, change the number of uses (not below those used) or the expiry (null = never). */
  r.patch("/admin/invites/:code", admin, async (req, res) => {
    const code = parse(InviteCodeParam, req.params.code);
    const body = parse(InvitePatch, req.body);
    const result = await updateInvite(pool, code, body);
    if (result === "missing") throw notFound("No such invite code.");
    if (result === "below_uses") throw badRequest("The code has already been used more times than that.", "below_uses");
    res.json((await invites(pool, code))[0]);
  });

  /** Only codes nobody used yet; used ones are disabled instead (accounts remember their code). */
  r.delete("/admin/invites/:code", admin, async (req, res) => {
    const result = await deleteInvite(pool, parse(InviteCodeParam, req.params.code));
    if (result === "missing") throw notFound("No such invite code.");
    if (result === "used") throw conflict("This code has been used; disable it instead.", "invite_used");
    res.status(204).end();
  });

  // ───────────── problems, schedule, pins (admin + setter) ─────────────

  r.get("/admin/problems", staff, async (_req, res) => {
    res.json(await staffProblems(pool, today()));
  });

  r.get("/admin/tracks", staff, async (_req, res) => {
    res.json(await staffTracks(pool));
  });

  /** Daily picks and pins plus track weeks in [from, to]; default a week back to 8 weeks ahead. */
  r.get("/admin/schedule", staff, async (req, res) => {
    const q = parse(ScheduleQuery, req.query);
    const t = today();
    const from = q.from ?? addDays(t, -7);
    const to = q.to ?? addDays(t, 56);
    if (to < from) throw badRequest("`to` is before `from`.");
    if (addDays(from, MAX_SCHEDULE_DAYS) < to) throw badRequest(`At most ${MAX_SCHEDULE_DAYS} days at a time.`);
    const body: Schedule = { from, to, today: t, days: await scheduleDays(pool, from, to), weeks: await trackWeeks(pool, from, to) };
    res.json(body);
  });

  /** Pin a daily problem to a future day (replaces an earlier pin there). */
  r.put("/admin/schedule/days/:day", staff, async (req, res) => {
    const day = parse(Day, req.params.day);
    const { slug } = parse(PinBody, req.body);
    if (day <= today()) throw notFuture("That day's problem");
    const result = await pinDay(pool, { day, slug, userId: me(req).id });
    if (result === "missing") throw notFound("No such problem.");
    if (result === "not_daily") throw badRequest("Track problems can't be the daily problem.", "not_daily");
    if (result === "retired") throw badRequest("This problem is retired.", "retired");
    res.json((await scheduleDays(pool, day, day))[0]);
  });

  r.delete("/admin/schedule/days/:day", staff, async (req, res) => {
    const day = parse(Day, req.params.day);
    if (day <= today()) throw notFuture("That day's problem");
    if (!(await unpinDay(pool, day))) throw notFound("Nothing is pinned on that day.");
    res.status(204).end();
  });

  // ───────────── track weeks (admin) ─────────────

  /** Run the track of `pattern` in the week starting on this Monday (replaces what was there). */
  r.put("/admin/schedule/weeks/:weekStart", admin, async (req, res) => {
    const weekStart = parse(Monday, req.params.weekStart);
    const { pattern } = parse(WeekBody, req.body);
    if (weekStart <= today()) throw notFuture("That week");
    const week = await scheduleWeek(pool, weekStart, pattern);
    if (!week) throw new HttpError(404, "no_track", "There's no track for this pattern yet; import its ladder problems first.");
    res.json(week);
  });

  r.delete("/admin/schedule/weeks/:weekStart", admin, async (req, res) => {
    const weekStart = parse(Monday, req.params.weekStart);
    if (weekStart <= today()) throw notFuture("That week");
    if (!(await unscheduleWeek(pool, weekStart))) throw notFound("No track is scheduled that week.");
    res.status(204).end();
  });

  return r;
}
