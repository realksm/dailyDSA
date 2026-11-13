// Home: today's daily problem, the countdown to the next one, the streak, and this week (daily
// problems and this week's track ladder) at a glance.
import { useEffect, useState, type ReactNode } from "react";
import type { DailyEntry, DailyToday, TrackSummary } from "@dailydsa/shared";
import { api, ApiErr } from "../api";
import { addDays, dailyStreak, daysAgo, fmtDay, fmtDayLong, fmtStamp, fmtTime, istDay } from "../format";
import { Icon } from "../components/Icon";
import { Markdown } from "../components/Markdown";
import { LoadError, Skeleton, StatusBadge, StatusDot, useLoad, useTitle } from "../components/ui";
import { dowOf, ladderNext, lessonUnread, trackAction } from "../ladder";
import { Link } from "../router";
import { store } from "../store";

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
          {t ? <TodayCard t={t} track={tracks.data ? running : undefined} next={ladderFirst ? next : null} onRollover={() => { today.reload(); archive.reload(); }} /> : (
            <div className="stack">
              <Skeleton h={14} w={180} />
              <Skeleton h={38} w="70%" />
              <Skeleton h={34} w={160} />
            </div>
          )}
        </section>
        <aside className="card today-side" aria-label="Your progress">
          {t && archive.data ? <Stats days={days} today={t.day} joinedOn={t.joinedOn} /> : <><Skeleton h={48} /><Skeleton h={96} /></>}
        </aside>
      </div>

      {t && dowOf(t.day) === 0 && <Recap today={t.day} />}

      {t && archive.data && tracks.data && <Week days={days} today={t.day} track={running} daily={t} />}
    </main>
  );
}

/**
 * `next`: once today's daily is solved, the ladder rung to do next (it becomes the primary button).
 * `track`: this week's track (null: none runs; undefined: still loading).
 */
function TodayCard({ t, track, next, onRollover }: { t: DailyToday; track: TrackSummary | null | undefined; next: ReturnType<typeof ladderNext>; onRollover: () => void }) {
  const left = useCountdown(t.nextRolloverAt, onRollover);
  const cta = t.status === "solved" ? "Open again" : t.status === "attempted" ? "Continue" : "Solve it";
  const solved = t.status === "solved";
  // The last three hours of an unsolved day read as urgent.
  const urgent = !solved && left < 3 * 3600_000;
  // A repeat shown since the user joined: one badge instead of "New" next to "Review".
  const seenBefore = !!t.review && (!t.joinedOn || t.review.lastShownOn >= t.joinedOn);
  const nextRung = next?.step.problem ? next : null;
  // A weekend problem of this week's pattern: the line under the badges names it, so no "hidden" badge.
  const ofTheWeek = t.weekend && t.weekTrack === true && !!track;
  return (
    <>
      <div className="eyebrow">
        <span>{fmtDayLong(t.day)}</span>
        <span aria-hidden>·</span>
        <span>{t.weekend ? "Weekend problem" : "Weekday problem"}</span>
      </div>
      <h1 id="today-title">{t.problem.title}</h1>
      {t.hook && <div className="today-hook"><Markdown>{t.hook}</Markdown></div>}
      <div className="row row-wrap" style={{ gap: 8 }}>
        {!(seenBefore && t.status === "new") && <StatusBadge status={t.status} />}
        {seenBefore && (
          <span className="badge badge-info">{t.status === "new" ? "Back for review" : "Review"} · shown {fmtDay(t.review!.lastShownOn)}</span>
        )}
        {t.pattern ? <span className="badge badge-primary">{t.pattern.name}</span> : !ofTheWeek && <span className="badge">Pattern hidden</span>}
      </div>
      <TodayWhy t={t} track={track} />
      {t.status === "solved" && t.solvedAt && <p className="muted small">Solved {fmtStamp(t.solvedAt)}.</p>}
      <Pulse pulse={t.pulse} />
      <div className="actions">
        <div className="row row-wrap" style={{ gap: 8 }}>
          {nextRung && <Link to={`/p/${nextRung.step.problem!.slug}`} className="btn btn-lg btn-primary">Next: Ladder {nextRung.step.position} · {nextRung.step.problem!.title}</Link>}
          <Link to={`/p/${t.problem.slug}`} className={`btn btn-lg${nextRung ? "" : " btn-primary"}`}>{cta}</Link>
        </div>
        <div className="today-clock" data-urgent={urgent || undefined} role="timer" aria-live="off">
          <span className="k">{solved ? "Next problem in" : "Left to solve it"}</span>
          <span className="v num">{clock(left)}</span>
        </div>
      </div>
    </>
  );
}

/**
 * One line relating today's problem to the week, so the daily isn't taken for the week's pattern:
 * weekday dailies are mixed review; weekend ones use this week's pattern (when the server says so).
 */
function TodayWhy({ t, track }: { t: DailyToday; track: TrackSummary | null | undefined }) {
  if (track === undefined) return null; // tracks still loading: don't flash the wrong line
  const name = track ? <Link to={`/tracks/${track.pattern.slug}`}>{track.title}</Link> : null;
  let line;
  if (!t.weekend) {
    line = name ? <>Mixed review: weekday dailies can be any pattern. This week's pattern, {name}, is on the ladder below.</> : <>Mixed review: weekday dailies can be any pattern.</>;
  } else if (t.weekTrack === true && name) {
    line = <>Uses this week's pattern, {name}, without the ladder's hints.</>;
  } else if (t.weekTrack === false) {
    line = name ? <>Weekend review: not this week's pattern this time.</> : <>Weekend review: any pattern.</>;
  } else {
    line = <>Weekend problems use the pattern of this week's track.</>; // a server without `weekTrack`
  }
  return <p className="muted small today-why">{line}</p>;
}

/** hh:mm:ss */
function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

/**
 * The group today, as one square per member (filled = solved, earliest solver first), plus the count.
 * Hovering names who solved it and when, as plain text: no initials, avatars or ranks; the point is
 * "others are at it too", not a leaderboard. Large groups get a bar instead of squares.
 */
function Pulse({ pulse }: { pulse: DailyToday["pulse"] | undefined }) {
  // Missing when the server predates the pulse (a deploy where the web app is newer): show nothing.
  if (!pulse || pulse.members < 2) return null;
  const who = (pulse.solvers ?? []).map((s) => `${s.you ? "You" : s.name} at ${fmtTime(s.solvedAt)}`);
  const label = `${pulse.solved} of ${pulse.members} solved it today${who.length ? `: ${who.join(", ")}` : ""}`;
  const list = who.length ? who.join("\n") : undefined;
  return (
    <div className="pulse" role="img" aria-label={label}>
      {pulse.members <= 60 ? (
        <span className="pulse-sq" aria-hidden>
          {Array.from({ length: pulse.members }, (_, i) => (
            <i key={i} data-on={i < pulse.solved || undefined} title={who[i] ?? (i < pulse.solved ? undefined : "Not yet")} />
          ))}
        </span>
      ) : (
        <span className="pulse-bar" aria-hidden title={list}><i style={{ width: `${(100 * pulse.solved) / pulse.members}%` }} /></span>
      )}
      <span className="small" aria-hidden title={list}><b className="num">{pulse.solved}</b><span className="muted"> of {pulse.members} solved it today</span></span>
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

/**
 * The streak, and the last 30 days as squares (oldest first), each linking to its problem. The
 * squares start on the day the account was made: days before it weren't missed.
 */
function Stats({ days, today, joinedOn }: { days: DailyEntry[]; today: string; joinedOn: string | undefined }) {
  const streak = dailyStreak(days, today);
  const byDay = new Map(days.map((d) => [d.day, d]));
  const from = addDays(today, -29);
  const start = joinedOn && joinedOn > from ? (joinedOn > today ? today : joinedOn) : from;
  const cells = Array.from({ length: 30 }, (_, i) => addDays(from, i)).filter((d) => d >= start);
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
          <span className="stat"><span className="k">{start === from ? "Last 30 days" : "Since you joined"}</span></span>
          <span className="small num"><b>{solved}</b><span className="muted"> of {shown.length} solved</span></span>
        </div>
        <div className="days30">
          {cells.map((day) => {
            const d = byDay.get(day);
            if (!d) return <span key={day} className="d30" data-s="none" title={`${fmtDay(day)} · no problem`} />;
            const s = d.status === "solved" ? (d.solvedAt && istDay(d.solvedAt) > day ? "late" : "solved") : day < today ? (d.status === "attempted" ? "attempted" : "missed") : d.status;
            const review = !!d.review && (!joinedOn || d.review.lastShownOn >= joinedOn);
            const what = { solved: "solved", late: "solved later", attempted: "attempted", missed: "missed", new: "open" }[s] + (review ? ", review" : "");
            return (
              <Link
                key={day}
                to={`/p/${d.problem.slug}`}
                className="d30"
                data-s={s}
                data-review={review ? "" : undefined}
                data-today={day === today || undefined}
                title={`${fmtDay(day)} · ${d.problem.title} · ${what}`}
                aria-label={`${fmtDay(day)}: ${d.problem.title}, ${what}`}
              />
            );
          })}
        </div>
        <ul className="d30-key" aria-hidden>
          <li><i className="d30" data-s="solved" />Solved</li>
          <li><i className="d30" data-s="late" />Late</li>
          <li><i className="d30" data-s="missed" />Missed</li>
          <li><i className="d30" data-s="solved" data-review="" />Review</li>
          <li><i className="d30" data-s="new" data-today="" />Today</li>
        </ul>
      </div>
      <div className="stack-sm" style={{ gap: 6 }}>
        <p className="muted small">Solve by midnight IST to keep the streak.</p>
        <Link to="/archive" className="small">Full archive →</Link>
      </div>
    </>
  );
}

/**
 * Monday to Sunday of the current IST week: the daily problem of each day and, while a track
 * runs, its ladder (problem n opens on day n; Saturday and Sunday are for catching up).
 */
function Week({ days, today, track, daily }: { days: DailyEntry[]; today: string; track: TrackSummary | null; daily: DailyToday }) {
  const next = track ? ladderNext(track, today) : null;
  const monday = addDays(today, -dowOf(today));
  const tomorrow = addDays(today, 1);
  const byDay = new Map(days.map((d) => [d.day, d]));
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const left = track ? track.ladder.length - track.solved : 0;

  return (
    <section className="card week" aria-labelledby="week-h">
      {track ? <WeekBand track={track} today={today} monday={monday} daily={daily} weekendDays={[byDay.get(week[5]!), byDay.get(week[6]!)]} /> : (
        <div className="week-head">
          <h2 id="week-h">This week</h2>
          <span className="muted small">No track this week: the dailies are mixed review.</span>
        </div>
      )}

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

/**
 * The week's pattern, named big, with the lesson's "how to spot it" leads and the week's three
 * steps: the lesson, the ladder (one rung a weekday), then the weekend dailies of the same pattern.
 * (Weekday dailies are mixed review; the line on today's card says so.)
 */
function WeekBand({ track, today, monday, daily, weekendDays }: {
  track: TrackSummary; today: string; monday: string; daily: DailyToday;
  /** This week's Saturday and Sunday dailies, where shown already. */
  weekendDays: [DailyEntry | undefined, DailyEntry | undefined];
}) {
  const action = trackAction(track, today);
  const to = `/tracks/${track.pattern.slug}`;
  const unread = lessonUnread(track);
  const weekend = dowOf(today) >= 5;
  const ladderDone = track.ladder.length > 0 && track.solved >= track.ladder.length;
  // On a weekend the server says whether today's problem really is of this pattern (a pin may not be).
  const weekendNote = !weekend ? "Saturday's and Sunday's dailies use it" : daily.weekTrack === false ? "Today's is review: another pattern" : "Today's daily uses it";
  const steps: { title: ReactNode; sub: string; state: "todo" | "doing" | "done" | "none"; to?: string }[] = [
    {
      title: "Lesson",
      sub: !track.hasLesson ? "Coming soon" : unread ? "Not opened yet" : `Opened ${fmtDay(istDay(track.lessonReadAt!))}`,
      state: !track.hasLesson ? "none" : unread ? "todo" : "done",
      ...(track.hasLesson ? { to } : {}),
    },
    {
      title: <>Ladder <span className="num">{track.solved}/{track.ladder.length}</span></>,
      sub: "One rung opens each weekday",
      state: ladderDone ? "done" : track.solved > 0 ? "doing" : "todo",
    },
    // Done once Sunday's daily (and Saturday's, if there was one) is solved.
    { title: "Weekend", sub: weekendNote, state: weekendDays[1]?.status === "solved" && (!weekendDays[0] || weekendDays[0].status === "solved") ? "done" : "todo" },
  ];
  const nextStep = steps.findIndex((s) => s.state === "todo" || s.state === "doing");
  return (
    <div className="week-band">
      <div className="week-band-text">
        <div className="eyebrow">
          <span>This week's pattern</span>
          <span aria-hidden>·</span>
          <span>{fmtDay(monday)} – {fmtDay(addDays(monday, 6))}</span>
        </div>
        <h2 id="week-h"><Link to={to}>{track.title}</Link></h2>
        {track.spotIt.length > 0 && (
          <div className="track-spot week-spot">
            <span className="week-k">How to spot it</span>
            <Markdown>{track.spotIt.slice(0, 3).map((s) => `- ${s}`).join("\n")}</Markdown>
          </div>
        )}
      </div>
      <div className="week-band-side">
        <ol className="week-steps" aria-label="This week's steps">
          {steps.map((s, i) => (
            <li key={i} data-s={s.state} data-next={i === nextStep || undefined}>
              <span className="ws-n" aria-hidden>{s.state === "done" ? <Icon name="check" /> : i + 1}</span>
              <span className="ws-body">
                {s.to ? <Link to={s.to} className="ws-t">{s.title}</Link> : <span className="ws-t">{s.title}</span>}
                <span className="ws-sub">{s.sub}</span>
              </span>
              <span className="sr-only">{s.state === "done" ? ", done" : i === nextStep ? ", next" : ""}</span>
            </li>
          ))}
        </ol>
        {"to" in action ? (
          <Link to={action.to} className="btn">{action.label}</Link>
        ) : (
          <span className="small muted">{action.label}</span>
        )}
        {action.kind !== "lesson" && track.hasLesson && <Link to={to} className="small">{unread ? "Read the lesson" : "Open the lesson again"} →</Link>}
      </div>
    </div>
  );
}

/**
 * Monday's look back at last week: its track, your dailies, the group, your strongest and weakest
 * pattern. Hidden once dismissed (per week, in this browser); the same recap goes out by email.
 */
function Recap({ today }: { today: string }) {
  const week = addDays(today, -7);
  const key = "dsa.recap.dismissed";
  const [gone, setGone] = useState(() => store.get(key) === week);
  const r = useLoad(() => (gone ? Promise.resolve(null) : api.recap(week).catch(() => null)), [week, gone]);
  if (gone || !r.data) return null;
  const x = r.data;
  const pct = x.group.possible > 0 ? Math.round((100 * x.group.solved) / x.group.possible) : null;
  const dismiss = () => { store.set(key, week); setGone(true); };
  return (
    <section className="card recap" aria-labelledby="recap-h">
      <div className="recap-head">
        <div>
          <h2 id="recap-h">Last week</h2>
          <span className="muted small">{fmtDay(week)} – {fmtDay(addDays(week, 6))}</span>
        </div>
        <button type="button" className="copy-btn" onClick={dismiss} aria-label="Hide last week's recap">Hide</button>
      </div>
      <dl className="recap-grid">
        <div>
          <dt>Track</dt>
          {x.track ? (
            <dd><Link to={`/tracks/${x.track.slug}`}>{x.track.title}</Link><span className="num"> · {x.track.solved}/{x.track.ladder} ladder</span></dd>
          ) : <dd className="muted">No track ran</dd>}
        </div>
        <div>
          <dt>Your dailies</dt>
          <dd><span className="num"><b>{x.daily.solvedOnTime}</b> of {x.daily.days}</span> <span className="muted">solved on the day</span></dd>
        </div>
        <div>
          <dt>The group</dt>
          <dd>{pct === null ? <span className="muted">No dailies</span> : <><b className="num">{pct}%</b> <span className="muted">of the dailies solved · {x.group.members} members</span></>}</dd>
        </div>
        <div>
          <dt>Patterns so far</dt>
          {x.strongest && x.weakest ? (
            <dd>
              Strongest: <b>{x.strongest.name}</b> <span className="muted num">({x.strongest.solved}/{x.strongest.tried})</span>
              <br />Practise: <Link to={`/tracks/${x.weakest.slug}`}>{x.weakest.name}</Link> <span className="muted num">({x.weakest.solved}/{x.weakest.tried}{x.weakest.helped ? `, ${x.weakest.helped} with help` : ""})</span>
            </dd>
          ) : <dd className="muted">Nothing to compare yet: solve problems of two patterns</dd>}
        </div>
      </dl>
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

export function DayRow({ d, today, target }: { d: DailyEntry; today: string; target?: boolean }) {
  return (
    <tr data-day={d.day} data-target={target || undefined}>
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
