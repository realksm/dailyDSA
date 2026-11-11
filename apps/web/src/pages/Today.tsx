// Home: today's daily problem, the countdown to the next one, the streak and this week at a glance.
import { useEffect, useState } from "react";
import type { DailyEntry, DailyToday, TrackLibrary } from "@dailydsa/shared";
import { api, ApiErr } from "../api";
import { addDays, dailyStreak, daysAgo, fmtCountdown, fmtDay, fmtDayLong, fmtStamp } from "../format";
import { LoadError, Skeleton, StatusBadge, StatusDot, useLoad, useTitle } from "../components/ui";
import { Link } from "../router";
import { LadderDots } from "./Tracks";

export function Today() {
  useTitle("Today");
  const today = useLoad(() => api.today(), []);
  const archive = useLoad(() => api.archive(undefined, 366), []);
  const tracks = useLoad(() => api.tracks(), []);

  if (today.error) {
    if (today.error instanceof ApiErr && today.error.code === "no_daily") {
      return (
        <main className="page">
          <div className="card empty">
            <h3>No daily problem yet</h3>
            <p>The problem bank is still empty. Check back soon.</p>
          </div>
        </main>
      );
    }
    return <main className="page"><LoadError error={today.error} retry={today.reload} /></main>;
  }

  const t = today.data;
  const days = archive.data?.days ?? [];
  return (
    <main className="page">
      <div className="today-hero">
        <section className="card today-main" aria-labelledby="today-title">
          {t ? <TodayCard t={t} onRollover={() => { today.reload(); archive.reload(); }} /> : (
            <div className="stack">
              <Skeleton h={14} w={180} />
              <Skeleton h={38} w="70%" />
              <Skeleton h={34} w={160} />
            </div>
          )}
        </section>
        <aside className="card today-side" aria-label="Your progress">
          {t && archive.data ? <Stats days={days} today={t.day} /> : <><Skeleton h={48} /><Skeleton h={48} /></>}
        </aside>
      </div>

      {tracks.data && <WeekTrack lib={tracks.data} />}

      {t && archive.data && <Week days={days} today={t.day} />}

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

function TodayCard({ t, onRollover }: { t: DailyToday; onRollover: () => void }) {
  const left = useCountdown(t.nextRolloverAt, onRollover);
  const cta = t.status === "solved" ? "Open again" : t.status === "attempted" ? "Continue" : "Solve it";
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
      <div className="actions">
        <Link to={`/p/${t.problem.slug}`} className="btn btn-primary btn-lg">{cta}</Link>
        <span className="muted small num">Next problem in {left}</span>
      </div>
    </>
  );
}

/** This week's track: the lesson, and today's ladder problem (Monday = 1 … Friday = 5). */
function WeekTrack({ lib }: { lib: TrackLibrary }) {
  const t = lib.tracks.find((x) => x.runningWeek);
  if (!t) return null;
  const dow = (new Date(`${lib.today}T00:00:00Z`).getUTCDay() + 6) % 7; // 0 = Monday
  const todays = dow < 5 ? t.ladder.find((s) => s.position === dow + 1 && s.problem) : undefined;
  const next = t.ladder.find((s) => s.open && s.problem && s.status !== "solved");
  return (
    <section className="card week-track" aria-labelledby="wt-h">
      <div className="grow stack-sm">
        <div className="eyebrow"><span>This week's track</span></div>
        <h2 id="wt-h">{t.title}</h2>
        <div className="row" style={{ gap: 16 }}>
          <LadderDots ladder={t.ladder} />
          <span className="num small"><b>{t.solved}</b><span className="muted">/{t.ladder.length} solved</span></span>
        </div>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <Link to={`/tracks/${t.pattern.slug}`} className="btn">{t.hasLesson ? "Read the lesson" : "Open the track"}</Link>
        {todays?.problem ? (
          <Link to={`/p/${todays.problem.slug}`} className="btn btn-primary">
            {todays.status === "solved" ? "Today's ladder problem ✓" : `Ladder ${todays.position}: ${todays.problem.title}`}
          </Link>
        ) : next?.problem ? (
          <Link to={`/p/${next.problem.slug}`} className="btn btn-primary">Catch up: ladder {next.position}</Link>
        ) : null}
      </div>
    </section>
  );
}

/** Ticks every second; reloads the page data a moment after IST midnight. */
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
  return fmtCountdown(target - now);
}

function Stats({ days, today }: { days: DailyEntry[]; today: string }) {
  const streak = dailyStreak(days, today);
  const last30 = days.filter((d) => d.day > addDays(today, -30));
  const solved30 = last30.filter((d) => d.status === "solved").length;
  return (
    <>
      <div className="stat">
        <div className="k">Streak</div>
        <div className="v">{streak}<small>{streak === 1 ? "day" : "days"}</small></div>
      </div>
      <div className="stat">
        <div className="k">Last 30 days</div>
        <div className="v">{solved30}<small>of {last30.length} solved</small></div>
      </div>
      <p className="muted small">The streak counts days solved by midnight IST. Missed days stay open in the archive.</p>
    </>
  );
}

/** Monday to Sunday of the current IST week. */
function Week({ days, today }: { days: DailyEntry[]; today: string }) {
  const dow = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7; // 0 = Monday
  const monday = addDays(today, -dow);
  const byDay = new Map(days.map((d) => [d.day, d]));
  return (
    <section style={{ marginTop: 32 }} aria-labelledby="week-h">
      <h2 id="week-h" style={{ marginBottom: 12 }}>This week</h2>
      <div className="week-strip">
        {Array.from({ length: 7 }, (_, i) => {
          const day = addDays(monday, i);
          const d = byDay.get(day);
          if (!d) {
            return (
              <div className="day" key={day}>
                <span className="d">{fmtDay(day).split(",")[0]}</span>
                <span className="t">{day > today ? "Opens at midnight" : "—"}</span>
              </div>
            );
          }
          return (
            <Link to={`/p/${d.problem.slug}`} key={day} aria-label={`${fmtDay(day)}: ${d.problem.title}, ${d.status}`}>
              <span className="d">{fmtDay(day).split(",")[0]}{day === today && " · today"} <StatusDot status={d.status} /></span>
              <span className="t">{d.problem.title}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
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
