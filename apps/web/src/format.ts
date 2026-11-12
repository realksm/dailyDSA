// Dates are shown in IST (the site's clock, PLAN §1) whatever the viewer's timezone is.
import type { DailyEntry, Verdict } from "@dailydsa/shared";

const IST = "Asia/Kolkata";
const IST_OFFSET_MS = 330 * 60_000;

/** IST calendar day (YYYY-MM-DD) of an instant. */
export function istDay(t: Date | string): string {
  const ms = (typeof t === "string" ? Date.parse(t) : t.getTime()) + IST_OFFSET_MS;
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const dayFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const dayLongFmt = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const stampFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: IST });
const stampYearFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: IST });
const numFmt = new Intl.NumberFormat("en-IN");

/** "Wed, 11 Nov" for a YYYY-MM-DD day. */
export const fmtDay = (day: string) => dayFmt.format(new Date(`${day}T00:00:00Z`));
export const fmtDayLong = (day: string) => dayLongFmt.format(new Date(`${day}T00:00:00Z`));

/** "11 Nov, 14:32" (IST), with the year when it isn't this year. */
export function fmtStamp(iso: string): string {
  const d = new Date(iso);
  return d.getUTCFullYear() === new Date().getUTCFullYear() ? stampFmt.format(d) : stampYearFmt.format(d);
}

export const fmtNum = (n: number) => numFmt.format(n);

const timeFmt = new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: IST });
/** "14:32" (IST). */
export const fmtTime = (iso: string) => timeFmt.format(new Date(iso));

export function fmtMs(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`;
}

export function fmtKb(kb: number): string {
  return kb < 1024 ? `${kb} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

/** "today", "yesterday", "3 days ago" between two IST days. */
export function daysAgo(day: string, today: string): string {
  const n = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`)) / 86_400_000);
  if (n <= 0) return "today";
  if (n === 1) return "yesterday";
  return `${n} days ago`;
}

/** "4h 12m" / "12m 05s" until a moment. */
export function fmtCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m ${String(sec).padStart(2, "0")}s`;
}

/** Colour family for a verdict: ok / bad / warn / info. */
export function verdictTone(v: Verdict): "ok" | "bad" | "warn" | "info" {
  if (v === "AC") return "ok";
  if (v === "WA" || v === "RE") return "bad";
  if (v === "TLE" || v === "MLE" || v === "OLE") return "warn";
  return "info"; // CE, IE
}

/**
 * Daily streak: consecutive days, ending today (or yesterday while today is still open), whose
 * daily problem was solved by the end of that day. Solving a missed day later from the archive
 * doesn't count; a review day whose problem was solved earlier does.
 */
export function dailyStreak(days: DailyEntry[], today: string): number {
  const byDay = new Map(days.map((d) => [d.day, d]));
  const onTime = (d: DailyEntry | undefined) => !!d?.solvedAt && istDay(d.solvedAt) <= d.day;
  let day = onTime(byDay.get(today)) ? today : addDays(today, -1);
  let n = 0;
  while (onTime(byDay.get(day))) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}
