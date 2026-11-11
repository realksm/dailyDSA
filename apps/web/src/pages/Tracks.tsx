// The Tracks library and the lesson page (PLAN §2): one pattern a week, a lesson on Monday and a
// ladder of five problems that opens one a day. After its week a track stays open in full here.
import type { LadderStep, TrackSummary, TrackView } from "@dailydsa/shared";
import { api } from "../api";
import { isStaff, useMe } from "../auth";
import { addDays, fmtDay } from "../format";
import { Lesson } from "../components/Lesson";
import { LoadError, Skeleton, SkeletonRows, StatusDot, useLoad, useTitle } from "../components/ui";
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
    <main className="page">
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
        <div className="track-grid">
          {lib.data.tracks.map((t) => (
            <Link key={t.pattern.slug} to={`/tracks/${t.pattern.slug}`} className="card track-card" data-running={t.runningWeek ? "" : undefined}>
              <div className="eyebrow">
                <span>{trackWhen(t, lib.data!.today)}</span>
                {staff && !t.released && <span className="badge">Not released</span>}
              </div>
              <h2>{t.title}</h2>
              <LadderDots ladder={t.ladder} />
              <div className="row between small">
                <span className="num"><b>{t.solved}</b><span className="muted">/{t.ladder.length} solved</span></span>
                {!t.hasLesson && <span className="muted">Lesson coming</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

/** Five small cells: solved / attempted / new / locked. */
export function LadderDots({ ladder }: { ladder: LadderStep[] }) {
  return (
    <div className="ladder-dots" aria-label={`${ladder.filter((s) => s.status === "solved").length} of ${ladder.length} solved`}>
      {ladder.map((s) => <span key={s.position} data-s={s.open ? s.status : "locked"} title={`Ladder ${s.position}`} />)}
    </div>
  );
}

export function TrackPage({ pattern }: { pattern: string }) {
  const t = useLoad(() => api.track(pattern), [pattern]);
  useTitle(t.data?.title ?? "Track");
  if (t.error) return <main className="page"><LoadError error={t.error} retry={t.reload} /></main>;
  if (!t.data) {
    return (
      <main className="page">
        <div className="stack"><Skeleton h={14} w={200} /><Skeleton h={34} w="50%" /><Skeleton h={320} /></div>
      </main>
    );
  }
  return <Track t={t.data} />;
}

function Track({ t }: { t: TrackView }) {
  const staff = isStaff(useMe());
  return (
    <main className="page track-page">
      <div className="track-layout">
        <article className="track-main">
          <div className="eyebrow">
            <Link to="/tracks">Tracks</Link>
            <span aria-hidden>/</span>
            <span>{trackWhen(t, t.today)}</span>
          </div>
          <h1>{t.title}</h1>
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
  const meta = (
    <span className="ladder-meta">
      {s.hintsUsed > 0 && <span className="badge">{s.hintsUsed} hint{s.hintsUsed === 1 ? "" : "s"}</span>}
      {!s.open && <span className="muted small">{s.opensOn ? `Opens ${fmtDay(s.opensOn)}` : "Locked"}</span>}
    </span>
  );
  const body = (
    <>
      <span className="ladder-n num">{s.position}</span>
      <span className="ladder-t">
        {s.problem ? s.problem.title : <span className="muted">Locked</span>}
        {staff && !s.open && <span className="muted small"> · locked for solvers</span>}
      </span>
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
