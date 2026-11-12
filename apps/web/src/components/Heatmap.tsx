// A calendar heatmap: one column per week (Monday on top), one square per IST day, shaded by how many
// problems were solved that day. Used on History for the whole record, not just the last 30 days.
import { useEffect, useRef } from "react";
import { addDays, fmtDay } from "../format";
import { dowOf } from "../ladder";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `counts`: solves per IST day. Shows from the Monday on or before `from` through `today`. */
export function Heatmap({ counts, from, today }: { counts: Map<string, number>; from: string; today: string }) {
  const start = addDays(from, -dowOf(from));
  const weeks: string[][] = [];
  for (let w = start; w <= today; w = addDays(w, 7)) weeks.push(Array.from({ length: 7 }, (_, i) => addDays(w, i)));
  const total = [...counts.entries()].filter(([d]) => d >= start && d <= today).reduce((n, [, c]) => n + c, 0);
  const active = [...counts.entries()].filter(([d, c]) => c > 0 && d >= start && d <= today).length;
  const level = (c: number) => (c <= 0 ? 0 : c === 1 ? 1 : c === 2 ? 2 : 3);
  // Open scrolled to the newest weeks when the record is wider than the card.
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [weeks.length]);

  return (
    <figure className="heatmap" aria-label={`Solved problems per day since ${fmtDay(start)}: ${total} solves on ${active} days`}>
      <div className="hm-scroll" ref={scroller}>
        <div className="hm-grid" style={{ gridTemplateColumns: `28px repeat(${weeks.length}, 13px)` }} aria-hidden>
          <span />
          {weeks.map((w, i) => {
            const m = Number(w[0]!.slice(5, 7)) - 1;
            const month = (j: number) => weeks[j]?.[0]!.slice(5, 7);
            // A label where the month changes; the first column only if its month lasts 3+ weeks (no overlap).
            const first = i === 0 ? month(1) === month(0) && month(2) === month(0) : month(i) !== month(i - 1);
            return <span key={w[0]} className="hm-month">{first ? MONTHS[m] : ""}</span>;
          })}
          {[0, 1, 2, 3, 4, 5, 6].map((r) => (
            <div key={r} className="hm-row" style={{ display: "contents" }}>
              <span className="hm-dow">{r === 0 ? "Mon" : r === 2 ? "Wed" : r === 4 ? "Fri" : ""}</span>
              {weeks.map((w) => {
                const day = w[r]!;
                if (day > today) return <span key={day} className="hm-sq" data-future />;
                const c = counts.get(day) ?? 0;
                return (
                  <span key={day} className="hm-sq" data-l={level(c)} data-today={day === today || undefined}
                    title={`${fmtDay(day)}: ${c === 0 ? "nothing solved" : `${c} solved`}`} />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <figcaption className="hm-foot">
        <span className="small"><b className="num">{total}</b><span className="muted"> solves on {active} {active === 1 ? "day" : "days"}</span></span>
        <span className="hm-key small muted" aria-hidden>
          Less <i className="hm-sq" data-l="0" /><i className="hm-sq" data-l="1" /><i className="hm-sq" data-l="2" /><i className="hm-sq" data-l="3" /> More
        </span>
      </figcaption>
    </figure>
  );
}
