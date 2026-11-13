// Phones (2026-11-13): solving needs a laptop, so a phone gets this week at a glance (streak, the
// week's dailies, the ladder; read-only) and the track lessons: this week's first, then the rest.
// Every other page shows <LaptopOnly />.
import type { DailyEntry, LadderStep, TrackSummary } from "@dailydsa/shared";
import { api } from "../api";
import { addDays, fmtDay, istDay } from "../format";
import { Icon } from "../components/Icon";
import { Markdown } from "../components/Markdown";
import { LoadError, Skeleton, StatusDot, useLoad, useTitle } from "../components/ui";
import { dowOf, lessonUnread } from "../ladder";
import { Link } from "../router";
import { useStreak } from "../streak";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function PhoneToday() {
  useTitle("Today");
  const tracks = useLoad(() => api.tracks(), []);
  const days = useLoad(() => api.archive(undefined, 7).catch(() => null), []);
  if (tracks.error) return <main className="page fluid"><LoadError error={tracks.error} retry={tracks.reload} /></main>;
  const lib = tracks.data;
  const running = lib?.tracks.find((t) => t.runningWeek) ?? null;
  // Lessons a solver can open: released tracks. The running one leads; the rest newest week first.
  const others = (lib?.tracks ?? [])
    .filter((t) => t !== running && t.released && t.hasLesson)
    .sort((a, b) => (lastWeek(b, lib!.today) ?? "").localeCompare(lastWeek(a, lib!.today) ?? ""));

  return (
    <main className="page fluid phone-home">
      <p className="phone-note phone-note-top"><Icon name="laptop" /><span>On a phone you can read the lessons and check your week. Solving needs a laptop.</span></p>
      {!lib ? <><Skeleton h={180} /><Skeleton h={220} /></> : (
        <>
          <WeekGlance today={lib.today} days={days.data?.days ?? null} track={running} />
          {running ? <ThisWeekLesson t={running} today={lib.today} /> : (
            <section className="card ph-lesson">
              <div className="eyebrow"><span>This week</span></div>
              <h1>No track this week</h1>
              <p className="muted">The dailies are mixed review. The lessons from earlier weeks are below.</p>
            </section>
          )}
          {others.length > 0 && (
            <section className="ph-more" aria-labelledby="ph-more-h">
              <h2 id="ph-more-h">{running ? "Earlier lessons" : "Lessons"}</h2>
              <ul className="ph-list">
                {others.map((t) => (
                  <li key={t.pattern.slug}>
                    <Link to={`/tracks/${t.pattern.slug}`} className="card ph-row">
                      <span className="ph-row-text">
                        <span className="ph-row-t">{t.title}</span>
                        <span className="small muted">{lastWeek(t, lib.today) ? `Week of ${fmtDay(lastWeek(t, lib.today)!)}` : ""}{lessonUnread(t) ? " · not opened yet" : ""}</span>
                      </span>
                      <Icon name="arrow" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}

const lastWeek = (t: TrackSummary, today: string) => t.weeks.filter((w) => w <= today).at(-1);

/** Streak, this week's dailies and the ladder: read-only, nothing here opens a problem. */
function WeekGlance({ today, days, track }: { today: string; days: DailyEntry[] | null; track: TrackSummary | null }) {
  const { streak } = useStreak();
  const monday = addDays(today, -dowOf(today));
  const byDay = new Map((days ?? []).map((d) => [d.day, d]));
  const todays = byDay.get(today);
  const line = !todays ? null : todays.status === "solved"
    ? <>Today's problem, <b>{todays.problem.title}</b>, is solved.</>
    : <>Today's problem, <b>{todays.problem.title}</b>, is open until midnight IST.</>;
  return (
    <section className="card ph-week" aria-labelledby="ph-week-h">
      <div className="ph-week-top">
        <div className="stat">
          <div className="k" id="ph-week-h">Streak</div>
          <div className="v">{streak?.days ?? "–"}<small>{streak?.days === 1 ? "day" : "days"}</small></div>
        </div>
        {line && <p className="small ph-today">{line}</p>}
      </div>
      {days === null ? <Skeleton h={44} /> : (
        <div className="ph-row-marks" role="list" aria-label="This week's dailies">
          {DOW.map((name, i) => {
            const day = addDays(monday, i);
            const d = byDay.get(day);
            const what = !d ? (day > today ? "not out yet" : "no problem") : d.status === "solved" ? "solved" : d.status === "attempted" ? "tried" : "not tried";
            return (
              <span key={day} role="listitem" className="ph-day" data-today={day === today || undefined} aria-label={`${fmtDay(day)}: ${d ? `${d.problem.title}, ` : ""}${what}`}>
                <span className="ph-dow" aria-hidden>{name}</span>
                {d ? <StatusDot status={d.status} /> : <span className="status-dot" data-s="none" aria-hidden />}
              </span>
            );
          })}
        </div>
      )}
      {track && <GlanceLadder ladder={track.ladder} solved={track.solved} />}
    </section>
  );
}

function GlanceLadder({ ladder, solved }: { ladder: LadderStep[]; solved: number }) {
  return (
    <div className="ph-ladder">
      <span className="ph-k">Ladder <span className="num">{solved}/{ladder.length}</span></span>
      <ol className="ph-rungs">
        {ladder.map((s) => {
          const state = !s.open ? "locked" : s.status === "new" && s.hintsUsed > 0 ? "attempted" : s.status;
          const what = { solved: "solved", attempted: "tried", new: "not tried", locked: s.opensOn ? `opens ${fmtDay(s.opensOn)}` : "locked" }[state];
          return (
            <li key={s.position} data-s={state} aria-label={`Ladder ${s.position}${s.problem && s.open ? `: ${s.problem.title}` : ""}, ${what}`}>
              <span className="ml-n num" aria-hidden>{s.position}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** This week's lesson: the one card with the hard shadow, and the page's one button. */
function ThisWeekLesson({ t, today }: { t: TrackSummary; today: string }) {
  const monday = t.runningWeek ?? addDays(today, -dowOf(today));
  const unread = lessonUnread(t);
  return (
    <section className="card card-hero ph-lesson" aria-labelledby="ph-lesson-h">
      <div className="eyebrow">
        <span>This week's pattern</span>
        <span aria-hidden>·</span>
        <span>{fmtDay(monday)} – {fmtDay(addDays(monday, 6))}</span>
      </div>
      <h1 id="ph-lesson-h">{t.title}</h1>
      {t.spotIt.length > 0 && (
        <div className="track-spot week-spot">
          <span className="week-k">How to spot it</span>
          <Markdown>{t.spotIt.slice(0, 3).map((s) => `- ${s}`).join("\n")}</Markdown>
        </div>
      )}
      {t.hasLesson ? (
        <div className="row row-wrap" style={{ gap: 12 }}>
          <Link to={`/tracks/${t.pattern.slug}`} className="btn btn-lg btn-primary">{unread ? "Read the lesson" : "Open the lesson again"}</Link>
          {!unread && t.lessonReadAt && <span className="small muted">Opened {fmtDay(istDay(t.lessonReadAt))}</span>}
        </div>
      ) : <p className="muted small">The lesson is on its way.</p>}
    </section>
  );
}

/** Any page a phone can't do: problems, archive, history, submissions, admin. */
export function LaptopOnly() {
  useTitle("Open on a laptop");
  return (
    <main className="page fluid">
      <section className="card ph-wall">
        <Icon name="laptop" />
        <h1>Open this on a laptop</h1>
        <p className="muted">Solving, the archive and your history need a bigger screen. On a phone you can read the lessons and check your week.</p>
        <Link to="/" className="btn btn-primary">Go to the lessons</Link>
      </section>
    </main>
  );
}
