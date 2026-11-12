// Small helpers over a problem statement (Markdown with $maths$).

/**
 * The statement's first sentence, as Markdown (may hold $maths$ and **bold**), for the one-line
 * hook on Today's card. A sentence ends at ". ", "? " or "! " (or the paragraph's end) outside
 * maths and code. Null when the statement doesn't start with a paragraph of prose.
 */
export function statementHook(md: string, max = 220): string | null {
  const paras = md.replace(/\r\n/g, "\n").trim().split(/\n\s*\n/);
  const first = paras[0]?.trim();
  if (!first || /^(#|[-*+]\s|\d+\.\s|```|\$\$|>|\|)/.test(first)) return null;
  const text = first.replace(/\s*\n\s*/g, " ");
  let inMath = false;
  let inCode = false;
  let end = text.length;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "\\") { i++; continue; }
    if (c === "`" && !inMath) inCode = !inCode;
    else if (c === "$" && !inCode) inMath = !inMath;
    else if (!inMath && !inCode && (c === "." || c === "?" || c === "!") && (i + 1 === text.length || text[i + 1] === " ")) {
      end = i + 1;
      break;
    }
  }
  const s = text.slice(0, end).trim();
  if (s.length <= max) return s;
  // Too long: cut at a word boundary outside maths, and mark the cut.
  let cut = -1;
  inMath = false;
  for (let i = 0; i < max; i++) {
    if (s[i] === "\\") { i++; continue; }
    if (s[i] === "$") inMath = !inMath;
    else if (s[i] === " " && !inMath) cut = i;
  }
  return cut > 40 ? `${s.slice(0, cut).replace(/[,;:]$/, "")}…` : null;
}
