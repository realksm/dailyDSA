// One small diagram per pattern, drawn from data: the pattern working on a tiny example, frame by frame.
// The same diagrams appear on the Tracks cards, at the top of a lesson (as a step-through), in the solve
// reveal and on the landing page, so each pattern has one picture people learn to recognise.
//
// "loop" plays by itself while on screen (never offscreen, in a hidden tab, or under reduced motion,
// where it shows the finished last frame). "steps" is driven by the reader: back, play/pause, next.
import { useEffect, useRef, useState, type ReactNode } from "react";

type Tone = "idle" | "dead" | "soft" | "on" | "found" | "blank";

interface Diagram<S> {
  /** What the whole animation shows, for screen readers. */
  summary: string;
  w: number;
  h: number;
  frames: S[];
  draw: (s: S, i: number) => ReactNode;
  caption: (s: S, i: number) => string;
}

function Cell({ x, y, w, h, v, tone = "idle" }: { x: number; y: number; w: number; h: number; v: ReactNode; tone?: Tone }) {
  return (
    <g className="pd-cell" data-tone={tone} transform={`translate(${x} ${y})`}>
      <rect width={w} height={h} rx={6} />
      <text x={w / 2} y={h / 2} dy="0.35em">{v}</text>
    </g>
  );
}

/** A pointer tag above a cell; moves smoothly between frames (CSS transform transition). */
function Ptr({ cx, label }: { cx: number; label: string }) {
  const w = label.length > 1 ? 30 : 18;
  return (
    <g className="pd-ptr" style={{ transform: `translate(${cx}px, 0px)` }}>
      <rect x={-w / 2} y={2} width={w} height={16} rx={4} />
      <text x={0} y={10} dy="0.35em">{label}</text>
      <path d="M-4 18 L0 23 L4 18 Z" />
    </g>
  );
}

// ── two pointers: a pair with sum 10 in a sorted array ──
const TP_A = [1, 3, 4, 6, 8, 11];
const TP_T = 10;
const twoPointers: Diagram<{ l: number; r: number }> = {
  summary: `Two pointers on the sorted array ${TP_A.join(", ")}, looking for a pair that sums to ${TP_T}: each step drops the end that can't be part of any answer.`,
  w: 300, h: 70,
  frames: [{ l: 0, r: 5 }, { l: 0, r: 4 }, { l: 1, r: 4 }, { l: 1, r: 3 }, { l: 2, r: 3 }],
  draw: ({ l, r }) => {
    const x = (i: number) => 15 + i * 46;
    const sum = TP_A[l]! + TP_A[r]!;
    return (
      <>
        {TP_A.map((v, i) => (
          <Cell key={i} x={x(i)} y={26} w={40} h={40} v={v}
            tone={i < l || i > r ? "dead" : sum === TP_T && (i === l || i === r) ? "found" : i === l || i === r ? "on" : "idle"} />
        ))}
        <Ptr cx={x(l) + 20} label="L" />
        <Ptr cx={x(r) + 20} label="R" />
      </>
    );
  },
  caption: ({ l, r }) => {
    const a = TP_A[l]!, b = TP_A[r]!, s = a + b;
    if (s > TP_T) return `${a} + ${b} = ${s} > ${TP_T}: ${b} is too big for any pair. R moves in.`;
    if (s < TP_T) return `${a} + ${b} = ${s} < ${TP_T}: ${a} is too small for any pair. L moves in.`;
    return `${a} + ${b} = ${TP_T}. Found in 5 steps, not 15 pairs.`;
  },
};

// ── sliding window: the longest stretch with sum ≤ 6 ──
const SW_A = [2, 1, 3, 2, 4, 1, 1, 2];
const SW_MAX = 6;
const slidingWindow: Diagram<{ l: number; r: number; best: number; done?: boolean }> = {
  summary: `A sliding window over ${SW_A.join(", ")}, finding the longest stretch with sum at most ${SW_MAX}: the right edge grows, the left edge shrinks when the sum is too big.`,
  w: 320, h: 76,
  frames: [
    { l: 0, r: 0, best: 1 }, { l: 0, r: 1, best: 2 }, { l: 0, r: 2, best: 3 }, { l: 0, r: 3, best: 3 }, { l: 1, r: 3, best: 3 },
    { l: 1, r: 4, best: 3 }, { l: 3, r: 4, best: 3 }, { l: 3, r: 6, best: 3 }, { l: 4, r: 6, best: 3 }, { l: 5, r: 7, best: 3, done: true },
  ],
  draw: ({ l, r, done }) => {
    const x = (i: number) => 14 + i * 37;
    const sum = SW_A.slice(l, r + 1).reduce((a, b) => a + b, 0);
    const over = sum > SW_MAX;
    const showL = done ? 0 : l;
    const showR = done ? 2 : r;
    return (
      <>
        <rect className="pd-win" data-over={over || undefined} x={x(showL) - 4} y={26} width={(showR - showL) * 37 + 32 + 8} height={44} rx={9} />
        {SW_A.map((v, i) => (
          <Cell key={i} x={x(i)} y={32} w={32} h={32} v={v}
            tone={done ? (i <= 2 ? "found" : "idle") : i >= l && i <= r ? (over ? "dead" : "soft") : i < l ? "dead" : "idle"} />
        ))}
        <text className="pd-label" x={x(showL) - 2} y={14}>{done ? "longest: 3" : `sum ${sum}`}</text>
      </>
    );
  },
  caption: ({ l, r, done }, i) => {
    if (done) return "One pass, each number in and out once. Longest stretch: 3.";
    const sum = SW_A.slice(l, r + 1).reduce((a, b) => a + b, 0);
    if (sum > SW_MAX) return `Sum ${sum} > ${SW_MAX}: shrink from the left.`;
    return i === 0 ? `Grow the window to the right. Sum ${sum}.` : `Sum ${sum} ≤ ${SW_MAX}, length ${r - l + 1}.`;
  },
};

// ── prefix sums: build P once, then any range sum is one subtraction ──
const PS_A = [3, 1, 4, 1, 5, 2];
const PS_P = PS_A.reduce<number[]>((p, v) => [...p, p.at(-1)! + v], [0]);
const prefixSums: Diagram<{ k: number; query?: boolean }> = {
  summary: `Prefix sums of ${PS_A.join(", ")}: P is built once, then the sum of positions 2 to 4 is P[4] minus P[1].`,
  w: 320, h: 82,
  frames: [...Array.from({ length: PS_P.length }, (_, k) => ({ k })), { k: PS_P.length - 1, query: true }],
  draw: ({ k, query }) => {
    const x = (i: number) => 16 + i * 42;
    return (
      <>
        {PS_A.map((v, i) => (
          <Cell key={`a${i}`} x={x(i) + 21} y={4} w={36} h={28} v={v}
            tone={query ? (i >= 1 && i <= 3 ? "soft" : "idle") : i === k - 1 ? "soft" : i < k ? "idle" : "dead"} />
        ))}
        {PS_P.map((v, i) => (
          <Cell key={`p${i}`} x={x(i)} y={48} w={36} h={30} v={i <= k ? v : ""}
            tone={query ? (i === 1 || i === 4 ? "on" : "idle") : i === k ? "on" : i < k ? "idle" : "blank"} />
        ))}
      </>
    );
  },
  caption: ({ k, query }) => {
    if (query) return `Sum of positions 2..4 = P[4] − P[1] = ${PS_P[4]} − ${PS_P[1]} = ${PS_P[4]! - PS_P[1]!}. One subtraction.`;
    if (k === 0) return "P[0] = 0: the sum of nothing.";
    return `P[${k}] = P[${k - 1}] + ${PS_A[k - 1]} = ${PS_P[k]}`;
  },
};

// ── binary search on the answer: the smallest x that works, when "works" only flips once ──
const BS_N = 12;
const BS_OK = 8; // works(x) is x >= 8
interface BsFrame { lo: number; hi: number; mid?: number; tested: number[] }
const binarySearch: Diagram<BsFrame> = {
  summary: `Binary search on the answer over 1 to ${BS_N}: each check of the middle value rules out half the candidates; the smallest value that works is ${BS_OK}.`,
  w: 320, h: 76,
  frames: [
    { lo: 1, hi: 12, mid: 6, tested: [] },
    { lo: 7, hi: 12, mid: 9, tested: [6] },
    { lo: 7, hi: 9, mid: 8, tested: [6, 9] },
    { lo: 7, hi: 8, mid: 7, tested: [6, 9, 8] },
    { lo: 8, hi: 8, tested: [6, 9, 8, 7] },
  ],
  draw: ({ lo, hi, mid, tested }) => {
    const x = (v: number) => 6 + (v - 1) * 26;
    const done = mid === undefined;
    return (
      <>
        {Array.from({ length: BS_N }, (_, i) => i + 1).map((v) => (
          <Cell key={v} x={x(v)} y={28} w={22} h={28} v={v}
            tone={done && v === BS_OK ? "found" : v === mid ? "on" : v < lo || v > hi ? "dead" : tested.includes(v) ? (v >= BS_OK ? "soft" : "dead") : "idle"} />
        ))}
        <rect className="pd-range" x={x(lo)} width={x(hi) + 22 - x(lo)} y={63} height={3} rx={1.5} />
        {mid !== undefined && <Ptr cx={x(mid) + 11} label="mid" />}
      </>
    );
  },
  caption: ({ mid, tested }) => {
    if (mid === undefined) return `Smallest that works: ${BS_OK}, after ${tested.length} checks instead of ${BS_OK}.`;
    return mid >= BS_OK ? `${mid} works, so the answer is ${mid} or less.` : `${mid} doesn't work, so the answer is bigger than ${mid}.`;
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DIAGRAMS: Record<string, Diagram<any>> = {
  "two-pointers": twoPointers,
  "sliding-window": slidingWindow,
  "prefix-sums": prefixSums,
  "binary-search-answer": binarySearch,
};

export const hasDiagram = (pattern: string) => pattern in DIAGRAMS;

const STEP_MS = 1500;
const HOLD_MS = 3200;
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function PatternDiagram({ pattern, mode = "loop", className }: { pattern: string; mode?: "loop" | "steps"; className?: string }) {
  const d = DIAGRAMS[pattern];
  const last = (d?.frames.length ?? 1) - 1;
  const [i, setI] = useState(() => (mode === "loop" && reduced() ? last : 0));
  const [playing, setPlaying] = useState(mode === "loop");
  const [visible, setVisible] = useState(false);
  const [tabShown, setTabShown] = useState(() => typeof document === "undefined" || !document.hidden);
  const ref = useRef<HTMLElement>(null);

  // Only animate on screen and in a visible tab.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return setVisible(true);
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    const vis = () => setTabShown(!document.hidden);
    document.addEventListener("visibilitychange", vis);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", vis); };
  }, []);

  useEffect(() => {
    if (!d || !playing || !visible || !tabShown) return;
    if (mode === "loop" && reduced()) return;
    // A loop rests on its last frame, then starts over; steps stop at the end.
    if (i === last && mode === "steps") { setPlaying(false); return; }
    const id = setTimeout(() => setI((n) => (n >= last ? 0 : n + 1)), i === last ? HOLD_MS : STEP_MS);
    return () => clearTimeout(id);
  }, [d, i, last, playing, visible, tabShown, mode]);

  if (!d) return null;
  const s = d.frames[i];
  const caption = d.caption(s, i);

  return (
    <figure ref={ref} className={`pd${className ? ` ${className}` : ""}`} data-mode={mode}>
      <svg viewBox={`0 0 ${d.w} ${d.h}`} role="img" aria-label={d.summary}>
        {d.draw(s, i)}
      </svg>
      {mode === "steps" ? (
        <figcaption className="pd-steps">
          <p className="pd-cap" aria-live="polite">{caption}</p>
          <div className="pd-ctrl">
            <button type="button" className="icon-btn" onClick={() => { setPlaying(false); setI((n) => Math.max(0, n - 1)); }} disabled={i === 0} aria-label="Previous step">
              <svg viewBox="0 0 16 16" aria-hidden><path d="M10 3.5L5.5 8l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button type="button" className="btn btn-sm pd-play" onClick={() => { if (i === last) setI(0); setPlaying((p) => !p || i === last); }}>
              {playing && i !== last ? "Pause" : i === last ? "Replay" : "Play"}
            </button>
            <button type="button" className="icon-btn" onClick={() => { setPlaying(false); setI((n) => Math.min(last, n + 1)); }} disabled={i === last} aria-label="Next step">
              <svg viewBox="0 0 16 16" aria-hidden><path d="M6 3.5L10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <span className="pd-count num" aria-label={`Step ${i + 1} of ${last + 1}`}>{i + 1}/{last + 1}</span>
          </div>
        </figcaption>
      ) : (
        <figcaption className="pd-cap" aria-hidden>{caption}</figcaption>
      )}
    </figure>
  );
}
