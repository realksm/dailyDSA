// Your record: every problem you touched, and every Run/Submit you made.
import { useEffect, useState } from "react";
import { LANG_LABEL, type HistoryEntry, type SubmissionKind, type SubmissionSummary, type TrackSummary } from "@dailydsa/shared";
import { api, errorMessage } from "../api";
import { addDays, fmtDay, fmtKb, fmtMs, fmtStamp, istDay } from "../format";
import { Heatmap } from "../components/Heatmap";
import { LoadError, Notice, SkeletonRows, StatusDot, useLoad, useTitle, VerdictBadge } from "../components/ui";
import { Select } from "../components/Select";
import { TabInk } from "../components/TabInk";
import { Link, useRouter } from "../router";

export function HistoryPage() {
  useTitle("History");
  const { search, navigate } = useRouter();
  const problem = search.get("problem") ?? undefined;
  const tab = problem || search.get("tab") === "submissions" ? "submissions" : "problems";
  const setTab = (t: string) => navigate(t === "problems" ? "/history" : "/history?tab=submissions", { replace: true });

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>History</h1>
          <p>Only you can see this.</p>
        </div>
      </div>
      <div className="tabs" role="tablist" style={{ marginBottom: 24 }}>
        <button role="tab" aria-selected={tab === "problems"} onClick={() => setTab("problems")}>Problems</button>
        <button role="tab" aria-selected={tab === "submissions"} onClick={() => setTab("submissions")}>Submissions</button>
        <TabInk />
      </div>
      {tab === "problems" ? <Problems /> : <Submissions problem={problem} />}
    </main>
  );
}

type Chip = "all" | "solved" | "open" | "after-solutions" | "hints";

function Problems() {
  const h = useLoad(() => api.history(), []);
  const tracks = useLoad(() => api.tracks(), []);
  const [chip, setChip] = useState<Chip>("all");
  if (h.error) return <LoadError error={h.error} retry={h.reload} />;
  if (!h.data) return <SkeletonRows n={6} />;
  const ps = h.data.problems;
  if (ps.length === 0) {
    return (
      <div className="card empty">
        <h3>Nothing yet</h3>
        <p>Problems you run or submit show up here. <Link to="/">Start with today's problem</Link>.</p>
      </div>
    );
  }
  const solved = ps.filter((p) => p.status === "solved");
  const submits = ps.reduce((n, p) => n + p.submitCount, 0);
  const test: Record<Chip, (p: HistoryEntry) => boolean> = {
    all: () => true,
    solved: (p) => p.status === "solved",
    open: (p) => p.status !== "solved",
    "after-solutions": (p) => p.solvedAfterSolutions,
    hints: (p) => p.hintsUsed > 0,
  };
  const chips: { key: Chip; label: string }[] = [
    { key: "all", label: "All" },
    { key: "solved", label: "Solved" },
    { key: "open", label: "Not solved" },
    { key: "after-solutions", label: "Solved after viewing solutions" },
    { key: "hints", label: "Used hints" },
  ];
  const shown = ps.filter(test[chip]);
  // Solves per IST day, for the heatmap; it starts at the first solve (at least ~half a year back).
  const counts = new Map<string, number>();
  for (const p of solved) if (p.solvedAt) counts.set(istDay(p.solvedAt), (counts.get(istDay(p.solvedAt)) ?? 0) + 1);
  const today = tracks.data?.today ?? istDay(new Date());
  const firstSolve = [...counts.keys()].sort()[0];
  const halfYear = addDays(today, -7 * 25);
  const from = firstSolve && firstSolve < halfYear ? firstSolve : halfYear;

  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="row" style={{ gap: 16 }}>
        <Stat k="Solved" v={solved.length} sub={`of ${ps.length} tried`} />
        <Stat k="Daily solved" v={solved.filter((p) => p.problem.kind === "daily").length} />
        <Stat k="Ladder solved" v={solved.filter((p) => p.problem.kind === "track").length} />
        <Stat k="Submits" v={submits} sub={solved.length ? `${(submits / Math.max(solved.length, 1)).toFixed(1)} per solve` : undefined} />
      </div>
      <section className="card history-heat" aria-labelledby="heat-h">
        <h2 id="heat-h">Solved days</h2>
        <Heatmap counts={counts} from={from} today={today} />
      </section>
      <PatternMap ps={ps} tracks={tracks.data?.tracks ?? []} />
      <section className="stack" style={{ gap: 12 }} aria-labelledby="problems-h">
        <div className="row between row-wrap" style={{ gap: 12 }}>
          <h2 id="problems-h">Problems</h2>
          <div className="chips" role="group" aria-label="Filter problems">
            {chips.map((c) => {
              const n = ps.filter(test[c.key]).length;
              if (n === 0 && c.key !== "all" && c.key !== chip) return null;
              return (
                <button key={c.key} type="button" className="chip" aria-pressed={chip === c.key} onClick={() => setChip(c.key)}>
                  {c.label}<span className="count num">{n}</span>
                </button>
              );
            })}
          </div>
        </div>
      {shown.length === 0 ? (
        <div className="card empty"><p>No problems match this filter.</p></div>
      ) : (
      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Problem</th>
              <th>Shown</th>
              <th className="r">Submits</th>
              <th className="r">Runs</th>
              <th>Solved</th>
              <th>Last activity</th>
            </tr>
          </thead>
          <tbody>{shown.map((p) => <ProblemRow key={p.problem.slug} p={p} />)}</tbody>
        </table>
      </div>
      )}
      </section>
    </div>
  );
}

/**
 * Per pattern: how much of it you've done. Only patterns you can see count (a daily's pattern shows
 * once it's solved or its solutions are open), so the map never gives a hidden pattern away. Tracks
 * you can open appear even before you've tried them, and link to their lesson.
 */
function PatternMap({ ps, tracks }: { ps: HistoryEntry[]; tracks: TrackSummary[] }) {
  type Row = { slug: string; name: string; tried: number; solved: number; hints: number; afterSolutions: number; last: string | null };
  const rows = new Map<string, Row>();
  const row = (slug: string, name: string) => {
    let r = rows.get(slug);
    if (!r) rows.set(slug, (r = { slug, name, tried: 0, solved: 0, hints: 0, afterSolutions: 0, last: null }));
    return r;
  };
  for (const t of tracks) row(t.pattern.slug, t.pattern.name);
  for (const p of ps) {
    if (!p.pattern) continue;
    const r = row(p.pattern.slug, p.pattern.name);
    r.tried++;
    if (p.status === "solved") r.solved++;
    r.hints += p.hintsUsed;
    if (p.solvedAfterSolutions) r.afterSolutions++;
    if (p.lastActivityAt && (!r.last || p.lastActivityAt > r.last)) r.last = p.lastActivityAt;
  }
  const list = [...rows.values()].sort((a, b) => b.solved - a.solved || b.tried - a.tried || a.name.localeCompare(b.name));
  if (list.length === 0) return null;
  const hasTrack = new Set(tracks.map((t) => t.pattern.slug));
  return (
    <section aria-labelledby="patterns-h">
      <div className="row between" style={{ marginBottom: 12, gap: 12 }}>
        <h2 id="patterns-h">Patterns</h2>
        <span className="muted small">A daily's pattern counts once you've solved it or opened its solutions.</span>
      </div>
      <ul className="pattern-map">
        {list.map((r) => (
          <li key={r.slug} className="card" data-empty={r.tried === 0 || undefined}>
            <div className="row between" style={{ gap: 8, alignItems: "baseline" }}>
              <h3>{r.name}</h3>
              {hasTrack.has(r.slug) && <Link to={`/tracks/${r.slug}`} className="small nowrap">Track →</Link>}
            </div>
            <div className="pm-bar" role="img" aria-label={`${r.solved} solved of ${r.tried} tried`}>
              <i style={{ width: r.tried ? `${(100 * r.solved) / r.tried}%` : 0 }} />
            </div>
            <span className="small num"><b>{r.solved}</b><span className="muted"> solved of {r.tried} tried</span></span>
            <span className="small muted">
              {r.tried === 0 ? "Not practised yet" : [
                `${r.hints} hint${r.hints === 1 ? "" : "s"}`,
                r.afterSolutions ? `${r.afterSolutions} after solutions` : null,
                r.last ? `last ${fmtDay(istDay(r.last))}` : null,
              ].filter(Boolean).join(" · ")}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Stat({ k, v, sub }: { k: string; v: number; sub?: string | undefined }) {
  return (
    <div className="card stat" style={{ padding: "16px 20px", flex: 1 }}>
      <div className="k">{k}</div>
      <div className="v">{v}{sub && <small>{sub}</small>}</div>
    </div>
  );
}

function ProblemRow({ p }: { p: HistoryEntry }) {
  return (
    <tr>
      <td>
        <span className="row" style={{ gap: 10 }}>
          <StatusDot status={p.status} />
          <span className="stack-sm" style={{ gap: 2 }}>
            <Link to={`/p/${p.problem.slug}`}>{p.problem.title}</Link>
            <span className="row" style={{ gap: 6 }}>
              {p.pattern && <span className="badge badge-primary">{p.pattern.name}</span>}
              {p.solvedAfterSolutions && <span className="badge badge-warn">After solutions</span>}
              {p.hintsUsed > 0 && (
                <span className={p.solvedWithHints ? "badge badge-warn" : "badge"} title={p.solvedWithHints ? "Hints taken before solving" : undefined}>
                  {p.solvedWithHints ? "With " : ""}{p.hintsUsed} hint{p.hintsUsed === 1 ? "" : "s"}
                </span>
              )}
            </span>
          </span>
        </span>
      </td>
      <td className="small muted nowrap">
        {p.track ? `Ladder #${p.track.position}` : p.dailyDays.length ? (
          <span title={p.dailyDays.length > 1 ? p.dailyDays.map(fmtDay).join("\n") : undefined}>
            {fmtDay(p.dailyDays.at(-1)!)}
            {p.dailyDays.length > 1 && <span className="shown-more"> +{p.dailyDays.length - 1} more</span>}
          </span>
        ) : "—"}
      </td>
      <td className="r num">
        <Link to={`/history?problem=${encodeURIComponent(p.problem.slug)}`} title="See these submissions">{p.submitCount}</Link>
      </td>
      <td className="r num muted">{p.runCount}</td>
      <td className="small">
        {p.solvedAt ? <>{fmtStamp(p.solvedAt)}{p.solvedLang && <span className="muted"> · {LANG_LABEL[p.solvedLang]}</span>}</> : <span className="muted">—</span>}
      </td>
      <td className="small muted nowrap">{p.lastActivityAt ? fmtStamp(p.lastActivityAt) : "—"}</td>
    </tr>
  );
}

const PAGE = 50;

function Submissions({ problem }: { problem: string | undefined }) {
  const { navigate } = useRouter();
  const [kind, setKind] = useState<SubmissionKind | "">("");
  const [rows, setRows] = useState<SubmissionSummary[] | null>(null);
  const [next, setNext] = useState<number | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [moreErr, setMoreErr] = useState<string | null>(null);

  async function load(before?: number) {
    setBusy(true);
    try {
      const page = await api.submissions({ problem, kind: kind || undefined, before, limit: PAGE });
      setRows((r) => (before && r ? [...r, ...page.submissions] : page.submissions));
      setNext(page.nextBefore);
      setMoreErr(null);
    } catch (e) {
      if (before) setMoreErr(errorMessage(e));
      else setError(e);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    setRows(null);
    setError(null);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem, kind]);

  return (
    <div className="stack">
      <div className="row">
        <div className="row small" style={{ gap: 8 }}>
          <span aria-hidden>Show</span>
          <Select
            aria-label="Show"
            value={kind}
            onChange={(v) => setKind(v as SubmissionKind | "")}
            options={[
              { value: "", label: "Runs and submits" },
              { value: "submit", label: "Submits only" },
              { value: "run", label: "Runs only" },
            ]}
          />
        </div>
        {problem && (
          <span className="badge">
            {rows?.[0]?.problem.title ?? problem}
            <button className="copy-btn" aria-label="Show all problems" onClick={() => navigate("/history?tab=submissions", { replace: true })}>✕</button>
          </span>
        )}
      </div>
      {error ? <LoadError error={error} retry={() => void load()} /> : !rows ? <SkeletonRows n={6} /> : rows.length === 0 ? (
        <div className="card empty"><p>No {kind === "run" ? "runs" : kind === "submit" ? "submits" : "submissions"} yet.</p></div>
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                {!problem && <th>Problem</th>}
                <th>Kind</th>
                <th>Language</th>
                <th>Verdict</th>
                <th className="r">Time</th>
                <th className="r">Memory</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td className="nowrap"><Link to={`/submissions/${s.id}`}>{fmtStamp(s.createdAt)}</Link></td>
                  {!problem && <td><Link to={`/p/${s.problem.slug}`}>{s.problem.title}</Link></td>}
                  <td className="small">{s.kind === "run" ? "Run" : "Submit"}</td>
                  <td className="small">{LANG_LABEL[s.lang]}</td>
                  <td>{s.verdict ? <VerdictBadge verdict={s.verdict} /> : <span className="badge">{s.status === "running" ? "Judging" : "Queued"}</span>}</td>
                  <td className="r small num muted">{s.maxCpuMs !== null ? fmtMs(s.maxCpuMs) : "—"}</td>
                  <td className="r small num muted">{s.maxMemoryKb !== null ? fmtKb(s.maxMemoryKb) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {moreErr && <Notice>{moreErr}</Notice>}
      {next && rows && (
        <div className="row" style={{ justifyContent: "center" }}>
          <button className="btn" disabled={busy} onClick={() => void load(next)}>{busy ? "Loading…" : "Load older"}</button>
        </div>
      )}
    </div>
  );
}
