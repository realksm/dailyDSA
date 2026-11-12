// Where a wrong output first parts from the expected one. Compares the way the judge does
// (packages/judge/src/judge.ts): CRLF = LF, trailing spaces on a line and trailing blank lines
// don't count. Values on a line are whitespace-separated tokens.

/** The judge clips stored output at 64 KB and appends this line (judge.ts `clip`). */
const CLIP = /^… \(\d+ more characters\)$/;

export type FirstDiff =
  /** Line `line` differs; `token` is the first differing value (absent = same values, other spacing). */
  | { kind: "line"; line: number; token?: number; yours?: string; expected?: string }
  /** Your output ends before line `line` of the expected one. */
  | { kind: "missing"; line: number }
  /** Your output goes on past the expected one's end, from line `line`. */
  | { kind: "extra"; line: number }
  /** They match as far as both were kept; the difference is past the 64 KB the judge stores. */
  | { kind: "clipped"; line: number };

export function outputLines(s: string): string[] {
  const t = s.replace(/\r\n?/g, "\n").split("\n").map((l) => l.trimEnd()).join("\n").replace(/\n+$/, "");
  return t === "" ? [] : t.split("\n");
}

export const tokens = (line: string): string[] => line.split(/\s+/).filter(Boolean);

/** Start/end of the `i`-th token in `line`, for highlighting it. */
export function tokenSpan(line: string, i: number): [number, number] | null {
  let n = 0;
  for (const m of line.matchAll(/\S+/g)) {
    if (n++ === i) return [m.index, m.index + m[0].length];
  }
  return null;
}

/** null = the same output (as the judge sees it). */
export function firstDiff(output: string, expected: string): FirstDiff | null {
  const a = outputLines(output);
  const b = outputLines(expected);
  const clipAt = (ls: string[]) => (ls.length && CLIP.test(ls[ls.length - 1]!) ? ls.length - 1 : Infinity);
  const clipped = Math.min(clipAt(a), clipAt(b));

  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] === b[i]) continue;
    if (i >= clipped) return { kind: "clipped", line: i };
    const ta = tokens(a[i]!);
    const tb = tokens(b[i]!);
    const m = Math.max(ta.length, tb.length);
    for (let j = 0; j < m; j++) {
      if (ta[j] !== tb[j]) return { kind: "line", line: i, token: j, yours: ta[j], expected: tb[j] };
    }
    return { kind: "line", line: i };
  }
  if (n >= clipped) return a.length === b.length ? null : { kind: "clipped", line: n };
  if (a.length < b.length) return { kind: "missing", line: a.length };
  if (a.length > b.length) return { kind: "extra", line: b.length };
  return null;
}

const show = (t: string) => (t.length > 24 ? `${t.slice(0, 23)}…` : t);
const lines = (n: number) => `${n} line${n === 1 ? "" : "s"}`;

/** One sentence for the solver: where it differs and how. */
export function describeDiff(d: FirstDiff, yourCount: number, expectedCount: number): string {
  const at = `Line ${d.line + 1}`;
  switch (d.kind) {
    case "line":
      if (d.token === undefined) return `${at}: the same values, but spaced differently.`;
      if (d.yours === undefined) return `${at} ends early: expected ${show(d.expected!)} as value ${d.token + 1}.`;
      if (d.expected === undefined) return `${at} has an extra value ${d.token + 1}: ${show(d.yours)}.`;
      return `${at}, value ${d.token + 1}: you printed ${show(d.yours)}, expected ${show(d.expected)}.`;
    case "missing":
      return yourCount === 0
        ? `No output. Expected ${lines(expectedCount)}.`
        : `Your output stops after line ${yourCount}; expected ${lines(expectedCount)}.`;
    case "extra":
      return `${lines(yourCount - expectedCount)} too many: expected ${lines(expectedCount)}, you printed ${yourCount}.`;
    case "clipped":
      return "They match as far as shown; the difference is past the first 64 KB.";
  }
}
