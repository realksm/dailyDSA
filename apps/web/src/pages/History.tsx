// Your record: every problem you touched, and every Run/Submit you made.
import { useEffect, useState } from "react";
import { LANG_LABEL, type HistoryEntry, type SubmissionKind, type SubmissionSummary } from "@dailydsa/shared";
import { api, errorMessage } from "../api";
import { fmtDay, fmtKb, fmtMs, fmtStamp } from "../format";
import { LoadError, Notice, SkeletonRows, StatusDot, useLoad, useTitle, VerdictBadge } from "../components/ui";
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
      </div>
      {tab === "problems" ? <Problems /> : <Submissions problem={problem} />}
    </main>
  );
}

function Problems() {
  const h = useLoad(() => api.history(), []);
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
  const afterSolutions = solved.filter((p) => p.solvedAfterSolutions).length;
  const withHints = solved.filter((p) => p.hintsUsed > 0).length;
  const submits = ps.reduce((n, p) => n + p.submitCount, 0);

  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="row" style={{ gap: 16 }}>
        <Stat k="Solved" v={solved.length} sub={`of ${ps.length} tried`} />
        <Stat k="Daily solved" v={solved.filter((p) => p.problem.kind === "daily").length} />
        <Stat k="Ladder solved" v={solved.filter((p) => p.problem.kind === "track").length} />
        <Stat k="Submits" v={submits} sub={solved.length ? `${(submits / Math.max(solved.length, 1)).toFixed(1)} per solve` : undefined} />
      </div>
      {(afterSolutions > 0 || withHints > 0) && (
        <p className="muted small">
          {afterSolutions > 0 && `${afterSolutions} solved after viewing solutions. `}
          {withHints > 0 && `${withHints} solved with hints.`}
        </p>
      )}
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
          <tbody>{ps.map((p) => <ProblemRow key={p.problem.slug} p={p} />)}</tbody>
        </table>
      </div>
    </div>
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
              {p.hintsUsed > 0 && <span className="badge">{p.hintsUsed} hint{p.hintsUsed === 1 ? "" : "s"}</span>}
            </span>
          </span>
        </span>
      </td>
      <td className="small muted">
        {p.track ? `Ladder #${p.track.position}` : p.dailyDays.length ? p.dailyDays.map(fmtDay).join(", ") : "—"}
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
        <label className="row small" style={{ gap: 8 }}>
          Show
          <select value={kind} onChange={(e) => setKind(e.target.value as SubmissionKind | "")}>
            <option value="">Runs and submits</option>
            <option value="submit">Submits only</option>
            <option value="run">Runs only</option>
          </select>
        </label>
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
