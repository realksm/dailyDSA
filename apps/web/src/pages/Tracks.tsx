// The Tracks library and the lesson page (PLAN §2): one pattern a week, a lesson on Monday and a
// ladder of five problems that opens one a day. After its week a track stays open in full here.
import type { LadderStep, TrackSummary, TrackView } from "@dailydsa/shared";
import { api } from "../api";
import { isStaff, useMe } from "../auth";
import { addDays, fmtDay } from "../format";
import { Icon } from "../components/Icon";
import { Lesson } from "../components/Lesson";
import { Markdown } from "../components/Markdown";
import { hasDiagram, PatternDiagram } from "../components/PatternDiagram";
import { LoadError, Skeleton, SkeletonRows, StatusDot, useLoad, useTitle } from "../components/ui";
import { trackAction } from "../ladder";
import { Link } from "../router";

/** "Running this week", "Ran the week of 4 Nov", … */
export function trackWhen(t: TrackSummary, today: string): string {
  if (t.runningWeek) return "Running this week";
  const past = t.weeks.filter((w) => w <= today);
  const next = t.weeks.find((w) => w > today);
  if (past.length) return `Ran the week of ${fmtDay(past.at(-1)!)}${next ? ` · again from ${fmtDay(next)}` : ""}`;
  if (next) return `Scheduled for the week of ${fmtDay(next)}`;
  return "Not scheduled";
}

export function TracksPage() {
  useTitle("Tracks");
  const lib = useLoad(() => api.tracks(), []);
  const staff = isStaff(useMe());

  return (
    <main className="page fluid">
      <div className="page-head">
        <div>
          <h1>Tracks</h1>
          <p>One pattern a week: a lesson on Monday and a ladder of five problems that opens one a day. Past tracks stay open here.</p>
        </div>
      </div>
      {lib.error ? <LoadError error={lib.error} retry={lib.reload} /> : !lib.data ? <SkeletonRows n={4} /> : lib.data.tracks.length === 0 ? (
        <div className="card empty">
          <h3>No tracks yet</h3>
          <p>The first track opens on the Monday of its week.</p>
        </div>
      ) : (
        <TrackTimeline tracks={lib.data.tracks} today={lib.data.today} staff={staff} />
      )}
    </main>
  );
}

/** Next week a track runs (after today), or undefined. */
const nextWeek = (t: TrackSummary, today: string) => t.weeks.find((w) => w > today);
const lastPast = (t: TrackSummary, today: string) => t.weeks.filter((w) => w <= today).at(-1);

/**
 * Tracks are scheduled by week, so the library reads as a timeline: this week's track as the one
 * feature card, then the open ones (newest first), then what's coming (soonest first). Staff also
 * see tracks that aren't scheduled yet.
 */
function TrackTimeline({ tracks, today, staff }: { tracks: TrackSummary[]; today: string; staff: boolean }) {
  const running = tracks.find((t) => t.runningWeek);
  const rest = tracks.filter((t) => t !== running);
  const open = rest.filter((t) => lastPast(t, today)).sort((a, b) => lastPast(b, today)!.localeCompare(lastPast(a, today)!));
  const coming = rest.filter((t) => !lastPast(t, today) && nextWeek(t, today)).sort((a, b) => nextWeek(a, today)!.localeCompare(nextWeek(b, today)!));
  const unscheduled = staff ? rest.filter((t) => t.weeks.length === 0) : [];
  const groups = [
    { key: "open", title: "Open", note: "Every problem is unlocked.", items: open },
    { key: "coming", title: "Coming up", note: "Each opens on the Monday of its week.", items: coming },
    { key: "none", title: "Not scheduled", note: "Only staff see these.", items: unscheduled },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="tracks-tl">
      {running && <RunningTrack t={running} today={today} />}
      {groups.map((g) => (
        <section key={g.key} className="tl-group" aria-labelledby={`tl-${g.key}`}>
          <div className="tl-head">
            <h2 id={`tl-${g.key}`}>{g.title}</h2>
            <span className="muted small">{g.note}</span>
          </div>
          <ol className="tl">
            {g.items.map((t) => (
              <li key={t.pattern.slug}>
                <span className="tl-when small">{tlWhen(t, today)}</span>
                <Link to={`/tracks/${t.pattern.slug}`} className="card track-row">
                  {hasDiagram(t.pattern.slug) ? <PatternDiagram pattern={t.pattern.slug} className="track-row-pd" /> : <span className="track-row-pd track-row-pd-empty" aria-hidden />}
                  <div className="track-row-text">
                    <h3>{t.title}</h3>
                    {t.spotIt[0] && <div className="track-spot"><Markdown>{t.spotIt[0]}</Markdown></div>}
                    <span className="small num track-row-count"><b>{t.solved}</b><span className="muted">/{t.ladder.length} solved{!t.hasLesson ? " · lesson coming" : ""}</span></span>
                  </div>
                  <MiniLadder ladder={t.ladder} />
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

/** The left column of a timeline row: when the track ran or runs. */
function tlWhen(t: TrackSummary, today: string): string {
  const past = lastPast(t, today);
  const next = nextWeek(t, today);
  if (past) return `Week of ${fmtDay(past)}`;
  if (next) return `Week of ${fmtDay(next)}`;
  return "No week yet";
}

/**
 * This week's track: the one card on the page with the hard shadow. The title link stretches over
 * the whole card (so it stays one big target) and the action button sits above it as its own link.
 */
function RunningTrack({ t, today }: { t: TrackSummary; today: string }) {
  const action = trackAction(t, today);
  return (
    <div className="card card-hero track-feature">
      <div className="track-feature-text">
        <div className="eyebrow">
          <span className="track-live">Running this week</span>
          {t.runningWeek && <span>{fmtDay(t.runningWeek)} – {fmtDay(addDays(t.runningWeek, 4))}</span>}
        </div>
        <h2><Link to={`/tracks/${t.pattern.slug}`} className="track-feature-link">{t.title}</Link></h2>
        {t.spotIt.length > 0 && (
          <div className="track-spot">
            <Markdown>{t.spotIt.map((s) => `- ${s}`).join("\n")}</Markdown>
          </div>
        )}
        <MiniLadder ladder={t.ladder} next={action.next?.position} />
        <div className="track-feature-cta">
          {"to" in action ? (
            <Link to={action.to} className="btn btn-lg btn-primary">{action.label}</Link>
          ) : (
            <span className="track-feature-state" data-kind={action.kind}>
              {action.kind === "done" && <Icon name="check" />}
              {action.label}
            </span>
          )}
          <span className="small num"><b>{t.solved}</b><span className="muted">/{t.ladder.length} solved{!t.hasLesson ? " · lesson coming" : ""}</span></span>
        </div>
      </div>
      {hasDiagram(t.pattern.slug) && (
        <div className="track-feature-pd">
          <PatternDiagram pattern={t.pattern.slug} />
        </div>
      )}
    </div>
  );
}

/**
 * The ladder on a library card: numbered steps (solved / attempted / open / locked) with titles.
 * `next` marks the rung the card's button leads to.
 */
function MiniLadder({ ladder, next }: { ladder: LadderStep[]; next?: number }) {
  return (
    <ol className="mini-ladder">
      {ladder.map((s) => {
        const state = s.open ? s.status : "locked";
        const what = { solved: "solved", attempted: "attempted", new: "open", locked: "locked" }[state];
        const isNext = s.position === next;
        return (
          <li key={s.position} data-s={state} data-next={isNext || undefined}>
            <span className="ml-n num" aria-hidden>{s.position}</span>
            <span className="ml-t">{s.open && s.problem ? s.problem.title : s.problem ? <span className="muted">{s.problem.title}</span> : <span className="muted">Locked</span>}</span>
            {isNext && <span className="ml-next" aria-hidden>Next</span>}
            <span className="sr-only">, {what}{isNext ? ", next" : ""}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function TrackPage({ pattern }: { pattern: string }) {
  const t = useLoad(() => api.track(pattern), [pattern]);
  useTitle(t.data?.title ?? "Track");
  if (t.error) return <main className="page fluid"><LoadError error={t.error} retry={t.reload} /></main>;
  if (!t.data) {
    return (
      <main className="page fluid">
        <div className="stack"><Skeleton h={14} w={200} /><Skeleton h={34} w="50%" /><Skeleton h={320} /></div>
      </main>
    );
  }
  return <Track t={t.data} />;
}

function Track({ t }: { t: TrackView }) {
  const staff = isStaff(useMe());
  return (
    <main className="page track-page fluid">
      <div className="track-layout">
        <article className="track-main">
          <div className="eyebrow">
            <Link to="/tracks">Tracks</Link>
            <span aria-hidden>/</span>
            <span>{trackWhen(t, t.today)}</span>
          </div>
          <h1>{t.title}</h1>
          {hasDiagram(t.pattern.slug) && (
            <section className="see-it" aria-label={`${t.title}, step by step`}>
              <div className="see-it-head">
                <h2>See it work</h2>
                <span className="muted small">A tiny example, one step at a time.</span>
              </div>
              <PatternDiagram pattern={t.pattern.slug} mode="steps" />
            </section>
          )}
          {t.hasLesson ? (
            <Lesson md={t.lessonMd} />
          ) : (
            <div className="card empty" style={{ marginTop: 24 }}>
              <h3>The lesson is on its way</h3>
              <p>The ladder is open already; start with problem 1.</p>
            </div>
          )}
        </article>
        <aside className="track-side" aria-label="Practice ladder">
          <div className="card ladder">
            <div className="ladder-head">
              <h2>Practice ladder</h2>
              <span className="num small"><b>{t.solved}</b><span className="muted">/{t.ladder.length} solved</span></span>
            </div>
            <ol>
              {t.ladder.map((s) => <Step key={s.position} s={s} staff={staff} />)}
            </ol>
            <p className="muted small">
              {t.runningWeek
                ? `One problem opens each day, Monday to Friday (${fmtDay(t.runningWeek)} – ${fmtDay(addDays(t.runningWeek, 4))}). Catch up at the weekend.`
                : "Problems get harder as you go. Once open, they stay open."}
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Step({ s, staff }: { s: LadderStep; staff: boolean }) {
  // Meta sits on its own line under the title, so long titles never push it into an awkward wrap.
  const meta = (
    <span className="ladder-meta">
      {s.hintsUsed > 0 && <span className="badge">{s.hintsUsed} hint{s.hintsUsed === 1 ? "" : "s"}</span>}
      {!s.open && <span className="muted small nowrap">{s.opensOn ? `Opens ${fmtDay(s.opensOn)}` : "Locked"}</span>}
      {staff && !s.open && s.problem && <span className="badge" title="Solvers can't open it yet; staff can">Staff preview</span>}
    </span>
  );
  const body = (
    <>
      <span className="ladder-n num">{s.position}</span>
      <span className="ladder-t">{s.problem ? s.problem.title : <span className="muted">Locked</span>}</span>
      {s.open && <StatusDot status={s.status} />}
      {meta}
    </>
  );
  return (
    <li data-locked={!s.open || undefined}>
      {s.problem ? <Link to={`/p/${s.problem.slug}`}>{body}</Link> : <div>{body}</div>}
    </li>
  );
}
