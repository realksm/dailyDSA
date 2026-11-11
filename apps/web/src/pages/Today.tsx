// Home: today's daily problem, the countdown to the next one, the streak, and this week (daily
// problems and this week's track ladder) at a glance.
import { useEffect, useState } from "react";
import type { DailyEntry, DailyToday, LadderStep, TrackSummary } from "@dailydsa/shared";
import { api, ApiErr } from "../api";
import { addDays, dailyStreak, daysAgo, fmtDay, fmtDayLong, fmtStamp, istDay } from "../format";
import { Icon } from "../components/Icon";
import { LoadError, Skeleton, StatusBadge, StatusDot, useLoad, useTitle } from "../components/ui";
import { Link } from "../router";

const dowOf = (day: string) => (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7; // 0 = Monday

/** The ladder problem to do next: today's, else the first open one not solved yet. */
function ladderNext(t: TrackSummary, today: string): { step: LadderStep; label: string } | null {
  const dow = dowOf(today);
  const todays = dow < 5 ? t.ladder.find((s) => s.position === dow + 1 && s.open && s.problem) : undefined;
  if (todays && todays.status !== "solved") return { step: todays, label: `Ladder ${todays.position}: ${todays.problem!.title}` };
  const next = t.ladder.find((s) => s.open && s.problem && s.status !== "solved");
  return next ? { step: next, label: `Catch up: ladder ${next.position}` } : null;
}

export function Today() {
  useTitle("Today");
  const today = useLoad(() => api.today(), []);
  const archive = useLoad(() => api.archive(undefined, 366), []);
  const tracks = useLoad(() => api.tracks(), []);

  if (today.error) {
    if (today.error instanceof ApiErr && today.error.code === "no_daily") {
      return (
        <main className="page fluid">
          <div className="card empty">
            <h3>No daily problem yet</h3>
            <p>The problem bank is still empty. Check back soon.</p>
          </div>
        </main>
      );
    }
    return <main className="page fluid"><LoadError error={today.error} retry={today.reload} /></main>;
  }

  const t = today.data;
  const days = archive.data?.days ?? [];
  const running = tracks.data?.tracks.find((x) => x.runningWeek) ?? null;
  const next = running && tracks.data ? ladderNext(running, tracks.data.today) : null;
  // One primary action on the page: the daily until it's solved, then the ladder.
  const ladderFirst = t?.status === "solved" && !!next;

  return (
    <main className="page fluid">
      <div className="today-hero">
        <section className="card card-hero today-main" aria-labelledby="today-title">
          {t ? <TodayCard t={t} primary={!ladderFirst} onRollover={() => { today.reload(); archive.reload(); }} /> : (
            <div className="stack">
              <Skeleton h={14} w={180} />
              <Skeleton h={38} w="70%" />
              <Skeleton h={34} w={160} />
            </div>
          )}
        </section>
        <aside className="card today-side" aria-label="Your progress">
          {t && archive.data ? <Stats days={days} today={t.day} /> : <><Skeleton h={48} /><Skeleton h={96} /></>}
        </aside>
      </div>

      {t && archive.data && tracks.data && <Week days={days} today={t.day} track={running} next={next} ladderFirst={ladderFirst} />}

      {archive.data && days.length > 1 && (
        <section style={{ marginTop: 32 }}>
          <div className="row between" style={{ marginBottom: 12 }}>
            <h2>Recent days</h2>
            <Link to="/archive" className="small">Full archive</Link>
          </div>
          <div className="card">
            <table className="table">
              <tbody>
                {days.slice(1, 8).map((d) => <DayRow key={d.day} d={d} today={t?.day ?? d.day} />)}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}

function TodayCard({ t, primary, onRollover }: { t: DailyToday; primary: boolean; onRollover: () => void }) {
  const left = useCountdown(t.nextRolloverAt, onRollover);
  const cta = t.status === "solved" ? "Open again" : t.status === "attempted" ? "Continue" : "Solve it";
  const solved = t.status === "solved";
  // The last three hours of an unsolved day read as urgent.
  const urgent = !solved && left < 3 * 3600_000;
  return (
    <>
      <div className="eyebrow">
        <span>{fmtDayLong(t.day)}</span>
        <span aria-hidden>·</span>
        <span>{t.weekend ? "Weekend problem" : "Weekday problem"}</span>
      </div>
      <h1 id="today-title">{t.problem.title}</h1>
      <div className="row row-wrap" style={{ gap: 8 }}>
        <StatusBadge status={t.status} />
        {t.pattern ? <span className="badge badge-primary">{t.pattern.name}</span> : <span className="badge">Pattern hidden</span>}
        {t.review && <span className="badge badge-info">Review · last shown {fmtDay(t.review.lastShownOn)}</span>}
      </div>
      {t.weekend && !t.pattern && (
        <p className="muted small">Weekend problems use the pattern of this week's track. The tag stays hidden until you solve it.</p>
      )}
      {t.status === "solved" && t.solvedAt && <p className="muted small">Solved {fmtStamp(t.solvedAt)}.</p>}
      <Pulse pulse={t.pulse} />
      <div className="actions">
        <Link to={`/p/${t.problem.slug}`} className={`btn btn-lg${primary ? " btn-primary" : ""}`}>{cta}</Link>
        <div className="today-clock" data-urgent={urgent || undefined} role="timer" aria-live="off">
          <span className="k">{solved ? "Next problem in" : "Left to solve it"}</span>
          <span className="v num">{clock(left)}</span>
        </div>
      </div>
    </>
  );
}

/** hh:mm:ss */
function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

/**
 * The group today, as one square per member (filled = solved), plus the count. Counts only, no names:
 * the point is "others are at it too", not a leaderboard. Large groups get a bar instead of squares.
 */
function Pulse({ pulse }: { pulse: DailyToday["pulse"] }) {
  if (pulse.members < 2) return null;
  const label = `${pulse.solved} of ${pulse.members} solved it today`;
  return (
    <div className="pulse" role="img" aria-label={label}>
      {pulse.members <= 60 ? (
        <span className="pulse-sq" aria-hidden>
          {Array.from({ length: pulse.members }, (_, i) => <i key={i} data-on={i < pulse.solved || undefined} />)}
        </span>
      ) : (
        <span className="pulse-bar" aria-hidden><i style={{ width: `${(100 * pulse.solved) / pulse.members}%` }} /></span>
      )}
      <span className="small" aria-hidden><b className="num">{pulse.solved}</b><span className="muted"> of {pulse.members} solved it today</span></span>
    </div>
  );
}

/** Milliseconds to `iso`, ticking every second; reloads the page data a moment after IST midnight. */
function useCountdown(iso: string, onDone: () => void) {
  const target = Date.parse(iso);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const ms = target - Date.now() + 2000; // the server picks ~2 s after midnight
    if (ms > 2 ** 31 - 1) return;
    const id = setTimeout(onDone, Math.max(ms, 0));
    return () => clearTimeout(id);
  }, [target, onDone]);
  return target - now;
}

/** The streak, and the last 30 days as squares (oldest first), each linking to its problem. */
function Stats({ days, today }: { days: DailyEntry[]; today: string }) {
  const streak = dailyStreak(days, today);
  const byDay = new Map(days.map((d) => [d.day, d]));
  const cells = Array.from({ length: 30 }, (_, i) => addDays(today, i - 29));
  const shown = cells.filter((d) => byDay.has(d));
  const solved = shown.filter((d) => byDay.get(d)!.status === "solved").length;
  return (
    <>
      <div className="stat">
        <div className="k">Streak</div>
        <div className="v">{streak}<small>{streak === 1 ? "day" : "days"}</small></div>
      </div>
      <div className="stack-sm">
        <div className="row between">
          <span className="stat"><span className="k">Last 30 days</span></span>
          <span className="small num"><b>{solved}</b><span className="muted"> of {shown.length} solved</span></span>
        </div>
        <div className="days30">
          {cells.map((day) => {
            const d = byDay.get(day);
            if (!d) return <span key={day} className="d30" data-s="none" title={`${fmtDay(day)} · no problem`} />;
            const s = d.status === "solved" ? (d.solvedAt && istDay(d.solvedAt) > day ? "late" : "solved") : day < today ? (d.status === "attempted" ? "attempted" : "missed") : d.status;
            const what = { solved: "solved", late: "solved later", attempted: "attempted", missed: "missed", new: "open" }[s];
            return (
              <Link
                key={day}
                to={`/p/${d.problem.slug}`}
                className="d30"
                data-s={s}
                data-today={day === today || undefined}
                title={`${fmtDay(day)} · ${d.problem.title} · ${what}`}
                aria-label={`${fmtDay(day)}: ${d.problem.title}, ${what}`}
              />
            );
          })}
        </div>
      </div>
      <p className="muted small">Solve by midnight IST to keep the streak.</p>
    </>
  );
}

/**
 * Monday to Sunday of the current IST week: the daily problem of each day and, while a track
 * runs, its ladder (problem n opens on day n; Saturday and Sunday are for catching up).
 */
function Week({ days, today, track, next, ladderFirst }: {
  days: DailyEntry[]; today: string; track: TrackSummary | null; next: ReturnType<typeof ladderNext>; ladderFirst: boolean;
}) {
  const monday = addDays(today, -dowOf(today));
  const tomorrow = addDays(today, 1);
  const byDay = new Map(days.map((d) => [d.day, d]));
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const left = track ? track.ladder.length - track.solved : 0;

  return (
    <section className="card week" aria-labelledby="week-h">
      <div className="week-head">
        <div className="stack-sm" style={{ gap: 4 }}>
          <h2 id="week-h">This week</h2>
          {track && (
            <div className="eyebrow">
              <span>Track: <Link to={`/tracks/${track.pattern.slug}`}>{track.title}</Link></span>
              <span aria-hidden>·</span>
              <span className="num"><b style={{ color: "var(--text)", fontWeight: 500 }}>{track.solved}</b>/{track.ladder.length} solved</span>
            </div>
          )}
        </div>
        {track && (
          <div className="row" style={{ gap: 8 }}>
            <Link to={`/tracks/${track.pattern.slug}`} className="btn">{track.hasLesson ? "Read the lesson" : "Open the track"}</Link>
            {next?.step.problem && (
              <Link to={`/p/${next.step.problem.slug}`} className={`btn${ladderFirst ? " btn-primary" : ""}`}>{next.label}</Link>
            )}
          </div>
        )}
      </div>

      <div className="week-grid" role="table" aria-label="This week">
        <div role="row" className="wg-row">
          <span role="columnheader" className="wg-label" />
          {week.map((day, i) => (
            <span role="columnheader" key={day} className="wg-day" data-today={day === today || undefined} data-weekend={i >= 5 || undefined}>
              {fmtDay(day).replace(",", "")}{day === today && <b> · today</b>}
            </span>
          ))}
        </div>

        <div role="row" className="wg-row">
          <span role="rowheader" className="wg-label">Daily</span>
          {week.map((day, i) => {
            const d = byDay.get(day);
            const weekend = i >= 5;
            if (d) {
              return (
                <Link role="cell" key={day} to={`/p/${d.problem.slug}`} className="wg-cell" data-today={day === today || undefined}
                  aria-label={`${fmtDay(day)}: ${d.problem.title}, ${d.status === "new" ? "not attempted" : d.status}`}>
                  <span className="wg-top">{weekend ? "Weekend" : "Weekday"}<StatusDot status={d.status} /></span>
                  <span className="wg-t">{d.problem.title}</span>
                </Link>
              );
            }
            return (
              <span role="cell" key={day} className="wg-cell" data-empty>
                <span className="wg-top">{weekend ? "Weekend" : "Weekday"}</span>
                <EmptyNote kind={day < today ? "none" : day === tomorrow ? "midnight" : "later"} />
              </span>
            );
          })}
        </div>

        {track && (
          <div role="row" className="wg-row">
            <span role="rowheader" className="wg-label">Ladder</span>
            {week.slice(0, 5).map((day, i) => {
              const s = track.ladder.find((x) => x.position === i + 1);
              if (s?.open && s.problem) {
                return (
                  <Link role="cell" key={day} to={`/p/${s.problem.slug}`} className="wg-cell" data-today={day === today || undefined}
                    aria-label={`Ladder ${s.position}: ${s.problem.title}, ${s.status === "new" ? "not attempted" : s.status}`}>
                    <span className="wg-top">Ladder {s.position}<StatusDot status={s.status} /></span>
                    <span className="wg-t">{s.problem.title}</span>
                  </Link>
                );
              }
              return (
                <span role="cell" key={day} className="wg-cell" data-empty>
                  <span className="wg-top">Ladder {i + 1}</span>
                  <EmptyNote kind={!s ? "unwritten" : day === tomorrow ? "midnight" : "locked"} />
                </span>
              );
            })}
            {left === 0 ? (
              <span role="cell" className="wg-cell wg-span" data-done>
                <span className="wg-top">Catch-up days</span>
                <span className="wg-t">All {track.ladder.length} solved</span>
              </span>
            ) : next?.step.problem && dowOf(today) >= 5 ? (
              <Link role="cell" to={`/p/${next.step.problem.slug}`} className="wg-cell wg-span">
                <span className="wg-top">Catch-up days</span>
                <span className="wg-t">{left} to go · next: ladder {next.step.position}</span>
              </Link>
            ) : (
              <span role="cell" className="wg-cell wg-span" data-empty>
                <span className="wg-top">Catch-up days</span>
                <span className="wg-note">Finish what's left of the ladder</span>
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/** What an empty week cell says: an icon where a word would repeat across the row. */
function EmptyNote({ kind }: { kind: "none" | "midnight" | "later" | "locked" | "unwritten" }) {
  if (kind === "later") return null;
  if (kind === "none") return <span className="wg-note">No problem</span>;
  if (kind === "unwritten") return <span className="wg-note">Not written yet</span>;
  if (kind === "midnight") return <span className="wg-note wg-icon"><Icon name="clock" />Midnight</span>;
  return <span className="wg-note wg-icon" title="Locked"><Icon name="lock" /><span className="sr-only">Locked</span></span>;
}

export function DayRow({ d, today }: { d: DailyEntry; today: string }) {
  return (
    <tr>
      <td className="nowrap" style={{ width: 150 }}>
        <span className="row" style={{ gap: 10 }}><StatusDot status={d.status} />{fmtDay(d.day)}</span>
      </td>
      <td><Link to={`/p/${d.problem.slug}`}>{d.problem.title}</Link></td>
      <td>
        <span className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
          {d.review && <span className="badge badge-info">Review</span>}
          {d.weekend && <span className="badge">Weekend</span>}
          {d.pattern && <span className="badge badge-primary">{d.pattern.name}</span>}
        </span>
      </td>
      <td className="r muted small nowrap" style={{ width: 120 }}>{daysAgo(d.day, today)}</td>
    </tr>
  );
}
