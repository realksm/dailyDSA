// Every past daily problem, newest first (PLAN §1: they all stay open).
import { useEffect, useRef, useState } from "react";
import type { DailyEntry } from "@dailydsa/shared";
import { api, errorMessage } from "../api";
import { addDays, fmtDay, istDay } from "../format";
import { dowOf } from "../ladder";
import { LoadError, Notice, SkeletonRows, useLoad, useTitle } from "../components/ui";
import { Select } from "../components/Select";
import { Icon } from "../components/Icon";
import { DayRow } from "./Today";
import { TabInk } from "../components/TabInk";
import { Link, useRouter } from "../router";

const PAGE = 60;
type Filter = "all" | "open" | "solved";

export function Archive() {
  useTitle("Archive");
  const [days, setDays] = useState<DailyEntry[]>([]);
  const [next, setNext] = useState<string | null | undefined>(undefined); // undefined = first page not loaded
  const [error, setError] = useState<unknown>(null);
  const [moreErr, setMoreErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [pattern, setPattern] = useState("");
  const tracks = useLoad(() => api.tracks(), []);
  // ?day=YYYY-MM-DD (from a problem's "Daily · …" badge): load back to that day, scroll to it, mark it.
  const { search, navigate } = useRouter();
  const wanted = search.get("day");
  const target = wanted && /^\d{4}-\d{2}-\d{2}$/.test(wanted) ? wanted : null;
  const scrolled = useRef<string | null>(null);

  async function load(before?: string) {
    setBusy(true);
    try {
      const page = await api.archive(before, PAGE);
      setDays((d) => (before ? [...d, ...page.days] : page.days));
      setNext(page.nextBefore);
      setMoreErr(null);
    } catch (e) {
      if (before) setMoreErr(errorMessage(e));
      else setError(e);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => void load(), []);

  useEffect(() => {
    if (!target || busy || next === undefined || scrolled.current === target) return;
    const oldest = days.at(-1)?.day;
    if (!days.some((d) => d.day === target) && next && oldest && target < oldest) return void load(next);
    scrolled.current = target; // found, or not in the archive at all: stop either way
    const row = document.querySelector<HTMLElement>(`tr[data-day="${target}"]`);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row?.scrollIntoView({ block: "center", behavior: still ? "auto" : "smooth" });
  }, [target, days, next, busy]);

  if (error) return <main className="page"><LoadError error={error} retry={() => { setError(null); void load(); }} /></main>;

  const today = istDay(new Date());
  // A pattern is only known for days you solved (or opened the solutions of), so the filter can only
  // ever narrow to those: it never reveals the pattern of an open problem.
  const patterns = [...new Map(days.filter((d) => d.pattern).map((d) => [d.pattern!.slug, d.pattern!.name])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1]));
  const shown = days.filter((d) =>
    (filter === "all" || (filter === "solved" ? d.status === "solved" : d.status !== "solved")) &&
    (!pattern || d.pattern?.slug === pattern));
  const solved = days.filter((d) => d.status === "solved").length;
  const unsolved = days.filter((d) => d.status !== "solved");
  const randomUnsolved = () => {
    const d = unsolved[Math.floor(Math.random() * unsolved.length)];
    if (d) navigate(`/p/${d.problem.slug}`);
  };
  // Monday → the track that ran that week (tracks you can see).
  const trackOf = new Map<string, { slug: string; title: string }>();
  for (const t of tracks.data?.tracks ?? []) for (const w of t.weeks) trackOf.set(w, { slug: t.pattern.slug, title: t.title });
  const weeks: { monday: string; days: DailyEntry[] }[] = [];
  for (const d of shown) {
    const monday = addDays(d.day, -dowOf(d.day));
    if (weeks.at(-1)?.monday !== monday) weeks.push({ monday, days: [] });
    weeks.at(-1)!.days.push(d);
  }

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Archive</h1>
          <p>Every daily problem so far. Missed one? It's still open.</p>
        </div>
        {next !== undefined && (
          <div className="archive-tools">
          <div className="tabs" role="tablist" aria-label="Filter">
            {(["all", "open", "solved"] as const).map((f) => (
              <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}>
                {f === "all" ? "All" : f === "open" ? "Not solved" : "Solved"}
                <span className="count">{f === "all" ? days.length : f === "solved" ? solved : days.length - solved}</span>
              </button>
            ))}
            <TabInk />
          </div>
          <div className="row row-wrap" style={{ gap: 8 }}>
            {patterns.length > 0 && (
              <Select
                aria-label="Pattern"
                value={pattern}
                onChange={setPattern}
                options={[{ value: "", label: "Any pattern" }, ...patterns.map(([slug, name]) => ({ value: slug, label: name }))]}
              />
            )}
            <button type="button" className="btn" onClick={randomUnsolved} disabled={unsolved.length === 0}
              title={unsolved.length ? `Open one of the ${unsolved.length} days you haven't solved, at random` : "Nothing left to solve"}>
              <Icon name="shuffle" />Random unsolved
            </button>
          </div>
          </div>
        )}
      </div>
      {pattern && <p className="muted small" style={{ marginTop: -8, marginBottom: 16 }}>Only solved days show their pattern, so this filter only finds days you've solved or opened the solutions of.</p>}

      {next === undefined ? (
        <SkeletonRows n={8} />
      ) : days.length === 0 ? (
        <div className="card empty"><h3>Nothing here yet</h3><p>The first daily problem appears at midnight IST.</p></div>
      ) : (
        <div className="card">
          {shown.length === 0 ? (
            <div className="empty"><p>{filter === "solved" ? "Nothing solved in the loaded days yet." : "You've solved every one of these. Nice."}</p></div>
          ) : (
            <table className="table archive-table">
              {weeks.map((w) => {
                const t = trackOf.get(w.monday);
                return (
                  <tbody key={w.monday}>
                    <tr className="week-row">
                      <th colSpan={4} scope="rowgroup">
                        <span>Week of {fmtDay(w.monday)}</span>
                        {t && <><span aria-hidden> · </span><Link to={`/tracks/${t.slug}`}>{t.title} track</Link></>}
                      </th>
                    </tr>
                    {w.days.map((d) => <DayRow key={d.day} d={d} today={today} target={d.day === target} />)}
                  </tbody>
                );
              })}
            </table>
          )}
        </div>
      )}

      {moreErr && <div style={{ marginTop: 16 }}><Notice>{moreErr}</Notice></div>}
      {next && (
        <div className="row" style={{ justifyContent: "center", marginTop: 24 }}>
          <button className="btn" disabled={busy} onClick={() => void load(next)}>{busy ? "Loading…" : "Load older days"}</button>
        </div>
      )}
    </main>
  );
}
