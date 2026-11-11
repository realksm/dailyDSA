// IST calendar helpers (PLAN §1: rollover at midnight IST, weeks run Monday–Sunday IST).
// IST is UTC+05:30 all year (no DST), so a fixed offset is exact. Days are "YYYY-MM-DD" strings,
// which is also how the db package returns DATE columns.

const IST_OFFSET_MS = 330 * 60_000;
const DAY_MS = 86_400_000;
const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The IST calendar date at instant `now`. */
export function istDate(now: Date = new Date()): string {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** True for a real calendar date written as YYYY-MM-DD. */
export function isDay(s: string): boolean {
  const m = DAY_RE.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!));
  return d.toISOString().slice(0, 10) === s;
}

const toUtc = (day: string) => {
  if (!isDay(day)) throw new Error(`not a YYYY-MM-DD day: ${day}`);
  return Date.parse(`${day}T00:00:00Z`);
};

export const addDays = (day: string, n: number): string => new Date(toUtc(day) + n * DAY_MS).toISOString().slice(0, 10);

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(day: string): number {
  return ((new Date(toUtc(day)).getUTCDay() + 6) % 7) + 1;
}

export const isWeekend = (day: string) => isoWeekday(day) >= 6;

/** Monday of the IST week containing `day` (the key of track_weeks). */
export const weekStart = (day: string) => addDays(day, 1 - isoWeekday(day));

/** The instant the IST day after `now` begins. */
export function nextIstMidnight(now: Date = new Date()): Date {
  return new Date(toUtc(addDays(istDate(now), 1)) - IST_OFFSET_MS);
}
