// "Your output" next to "Expected" for a Wrong Answer: line numbers, the first differing line
// marked on both sides with its differing value, both panes scrolled there and kept in step.
import { useLayoutEffect, useMemo, useRef } from "react";
import { describeDiff, firstDiff, outputLines, tokenSpan, type FirstDiff } from "../diff";
import { CopyButton } from "./ui";

/** Big outputs render a window around the difference, not every line. */
const BEFORE = 150;
const AFTER = 250;

/** The one-sentence verdict on where the outputs part ("Line 3, value 2: you printed 4, expected 7."). */
export function DiffSummary({ output, expected }: { output: string; expected: string }) {
  const d = useMemo(() => firstDiff(output, expected), [output, expected]);
  if (!d) return null;
  return <p className="odiff-sum">{describeDiff(d, outputLines(output).length, outputLines(expected).length)}</p>;
}

export function OutputDiff({ output, expected }: { output: string; expected: string }) {
  const d = useMemo(() => firstDiff(output, expected), [output, expected]);
  const yours = useMemo(() => outputLines(output), [output]);
  const want = useMemo(() => outputLines(expected), [expected]);
  const left = useRef<HTMLPreElement>(null);
  const right = useRef<HTMLPreElement>(null);

  const focus = d?.line ?? 0;
  const from = Math.max(0, focus - BEFORE);
  const to = Math.max(yours.length, want.length, focus + 1);
  const end = Math.min(to, focus + AFTER);
  const gutter = `${String(end).length}ch`;

  // Open at the difference, a third of the way down.
  useLayoutEffect(() => {
    for (const pre of [left.current, right.current]) {
      const row = pre?.querySelector<HTMLElement>(".dl-hit, .dl-gap-hit");
      if (pre && row) pre.scrollTop = Math.max(0, row.offsetTop - pre.clientHeight / 3);
    }
  }, [d]);

  // Scrolling one pane scrolls the other, so line n stays next to line n.
  const sync = (a: typeof left, b: typeof left) => () => {
    const src = a.current;
    const dst = b.current;
    if (!src || !dst) return;
    if (dst.scrollTop !== src.scrollTop) dst.scrollTop = src.scrollTop;
    if (dst.scrollLeft !== src.scrollLeft) dst.scrollLeft = src.scrollLeft;
  };

  return (
    <div className="pair">
      <Pane title="Your output" text={output} lines={yours} side="yours" d={d} from={from} end={end} gutter={gutter} ref_={left} onScroll={sync(left, right)} />
      <Pane title="Expected" text={expected} lines={want} side="expected" d={d} from={from} end={end} gutter={gutter} ref_={right} onScroll={sync(right, left)} />
    </div>
  );
}

function Pane(props: {
  title: string; text: string; lines: string[]; side: "yours" | "expected"; d: FirstDiff | null;
  from: number; end: number; gutter: string; ref_: React.RefObject<HTMLPreElement | null>; onScroll: () => void;
}) {
  const { title, text, lines, side, d, from, end, gutter } = props;
  const rows: React.ReactNode[] = [];
  if (from > 0) rows.push(<span key="above" className="dl dl-more">⋯ {from} lines above</span>);
  for (let i = from; i < end; i++) {
    const line = lines[i];
    const hit = d && d.line === i;
    if (line === undefined) {
      // Past this side's end: one marked gap where the other side goes on, then nothing.
      if (hit && (d.kind === "missing" || d.kind === "extra")) {
        rows.push(<span key={i} className="dl dl-gap-hit"><span className="ln" style={{ width: gutter }} aria-hidden /><span className="muted">{side === "yours" ? "(nothing here)" : "(output should end above)"}</span></span>);
      }
      continue;
    }
    rows.push(
      <span key={i} className={hit ? "dl dl-hit" : "dl"}>
        <span className="ln" style={{ width: gutter }} aria-hidden>{i + 1}</span>
        {hit && d.kind === "line" && d.token !== undefined ? <Marked line={line} token={d.token} /> : line || " "}
      </span>,
    );
  }
  const rest = lines.length - end;
  if (rest > 0) rows.push(<span key="below" className="dl dl-more">⋯ {rest} lines below</span>);

  return (
    <div>
      <h5 className="row between">
        <span>{title}</span>
        <CopyButton text={text} />
      </h5>
      <pre className="io io-lines" ref={props.ref_} onScroll={props.onScroll} tabIndex={0} aria-label={title}>
        {lines.length === 0 && !(d && d.line === 0) ? <span className="dl muted">(no output)</span> : rows}
      </pre>
    </div>
  );
}

function Marked({ line, token }: { line: string; token: number }) {
  const span = tokenSpan(line, token);
  if (!span) return <>{line}<mark className="dl-tok dl-tok-empty" aria-label="missing value"> </mark></>;
  return <>{line.slice(0, span[0])}<mark className="dl-tok">{line.slice(span[0], span[1])}</mark>{line.slice(span[1])}</>;
}
