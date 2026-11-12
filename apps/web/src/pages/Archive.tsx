// Every past daily problem, newest first (PLAN §1: they all stay open).
import { useEffect, useState } from "react";
import type { DailyEntry } from "@dailydsa/shared";
import { api, errorMessage } from "../api";
import { istDay } from "../format";
import { LoadError, Notice, SkeletonRows, useTitle } from "../components/ui";
import { DayRow } from "./Today";
import { TabInk } from "../components/TabInk";

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

  if (error) return <main className="page"><LoadError error={error} retry={() => { setError(null); void load(); }} /></main>;

  const today = istDay(new Date());
  const shown = days.filter((d) => filter === "all" || (filter === "solved" ? d.status === "solved" : d.status !== "solved"));
  const solved = days.filter((d) => d.status === "solved").length;

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Archive</h1>
          <p>Every daily problem so far. Missed one? It's still open.</p>
        </div>
        {next !== undefined && (
          <div className="tabs" role="tablist" aria-label="Filter">
            {(["all", "open", "solved"] as const).map((f) => (
              <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}>
                {f === "all" ? "All" : f === "open" ? "Not solved" : "Solved"}
                <span className="count">{f === "all" ? days.length : f === "solved" ? solved : days.length - solved}</span>
              </button>
            ))}
            <TabInk />
          </div>
        )}
      </div>

      {next === undefined ? (
        <SkeletonRows n={8} />
      ) : days.length === 0 ? (
        <div className="card empty"><h3>Nothing here yet</h3><p>The first daily problem appears at midnight IST.</p></div>
      ) : (
        <div className="card">
          {shown.length === 0 ? (
            <div className="empty"><p>{filter === "solved" ? "Nothing solved in the loaded days yet." : "You've solved every one of these. Nice."}</p></div>
          ) : (
            <table className="table">
              <tbody>{shown.map((d) => <DayRow key={d.day} d={d} today={today} />)}</tbody>
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
