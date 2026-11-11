// Track lessons in git (PLAN §2): problems/_tracks/<pattern>.md, one per track.
//
//   # Two pointers            ← the track's title (first line)
//   ## How to spot it         ← the sections in LESSON_SECTIONS, in order (more are fine)
//   ## Core idea
//   ## Template code          ← C++, Java and Python blocks, each in the editor template of a
//   ## Common mistakes           ladder problem of this track (`pnpm dsa template <slug> <lang>`)
//
// `dsa lesson check` checks a lesson; `dsa lesson import` (and `dsa import --all`) writes it to the
// tracks table. The site draws the practice ladder (section 5) itself.
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import type pg from "pg";
import { LANG_LABEL, LANGS, LESSON_SECTIONS, lessonParts, templateMismatch, type InputSpec, type Lang } from "@dailydsa/shared";
import { PROBLEMS_DIR, ProblemError, listProblems, loadProblem } from "./problem.js";

export const TRACKS_DIR = path.join(PROBLEMS_DIR, "_tracks");
const PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export interface Lesson {
  pattern: string;
  title: string;
  /** The lesson without its title line. */
  body: string;
}

/** A ladder problem's editor template input, for checking the lesson's template code. */
export interface LadderSpec {
  slug: string;
  input: InputSpec | undefined;
}

export const lessonFile = (pattern: string) => path.join(TRACKS_DIR, `${pattern}.md`);

/** Patterns that have a lesson file (files starting with `_` are ignored). */
export async function listLessons(): Promise<string[]> {
  const entries = await readdir(TRACKS_DIR, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".md") && !e.name.startsWith("_"))
    .map((e) => e.name.slice(0, -3))
    .sort();
}

/** The track's ladder problems in git (any that fail to load are skipped; `dsa list` shows those). */
export async function ladderSpecs(pattern: string): Promise<LadderSpec[]> {
  const out: (LadderSpec & { position: number })[] = [];
  for (const slug of await listProblems()) {
    const p = await loadProblem(slug).catch(() => undefined);
    if (p?.meta.kind === "track" && p.meta.pattern === pattern) {
      out.push({ slug, input: p.meta.input as InputSpec | undefined, position: p.meta.position ?? 0 });
    }
  }
  return out.sort((a, b) => a.position - b.position).map(({ slug, input }) => ({ slug, input }));
}

/** Reads and checks problems/_tracks/<pattern>.md against the ladder problems in git. */
export async function loadLesson(pattern: string): Promise<Lesson> {
  if (!PATTERN.test(pattern)) throw new ProblemError(`bad pattern "${pattern}" (lowercase letters, digits, dashes)`);
  const file = lessonFile(pattern);
  if (!(await stat(file).then(() => true, () => false))) throw new ProblemError(`no lesson file problems/_tracks/${pattern}.md (pnpm dsa lesson new ${pattern})`);
  return checkLesson(pattern, await readFile(file, "utf8"), await ladderSpecs(pattern));
}

/** Every problem with the lesson at once, so one run shows all of them. Pure: tests call it directly. */
export function checkLesson(pattern: string, src: string, ladder: LadderSpec[]): Lesson {
  const where = `_tracks/${pattern}.md`;
  const text = src.replace(/\r\n/g, "\n").replace(/^﻿/, "");
  const lines = text.split("\n");
  const first = lines.findIndex((l) => l.trim() !== "");
  const m = first >= 0 ? /^# (.+)$/.exec(lines[first]!) : null;
  if (!m) throw new ProblemError(`${where}: the first line must be the title, as \`# Title\``);
  const title = m[1]!.trim();
  const body = lines.slice(first + 1).join("\n").replace(/^\n+/, "").trimEnd() + "\n";

  const issues: string[] = [];
  if (title.length < 3 || title.length > 100) issues.push("the title must be 3 to 100 characters");

  // Walk the parts, keeping track of the current `## ` section.
  const headings: string[] = [];
  const groupsIn = new Map<string, { lang: Lang; code: string }[][]>();
  let section = "";
  for (const part of lessonParts(body)) {
    if ("code" in part) {
      groupsIn.set(section, [...(groupsIn.get(section) ?? []), part.code]);
      continue;
    }
    let fenced = false;
    for (const line of part.md.split("\n")) {
      if (/^ {0,3}(`{3,}|~{3,})/.test(line)) fenced = !fenced;
      const h = !fenced && /^## (.+?)\s*#*\s*$/.exec(line);
      if (h) headings.push((section = h[1]!.trim()));
    }
  }

  let at = 0;
  for (const want of LESSON_SECTIONS) {
    const i = headings.findIndex((h, k) => k >= at && h.toLowerCase() === want.toLowerCase());
    if (i < 0) issues.push(`missing the section \`## ${want}\`${headings.some((h) => h.toLowerCase() === want.toLowerCase()) ? " in this order: " + LESSON_SECTIONS.join(", ") : ""}`);
    else at = i + 1;
  }

  // Template code: C++, Java and Python, each in the editor template of a ladder problem.
  const tplKey = [...groupsIn.keys()].find((k) => k.toLowerCase() === "template code");
  const groups = tplKey === undefined ? [] : groupsIn.get(tplKey)!;
  if (headings.some((h) => h.toLowerCase() === "template code") && groups.length === 0) {
    issues.push("`## Template code` needs C++, Java and Python code blocks (```cpp, ```java, ```python), one after the other");
  }
  // The generic template only counts when a ladder problem uses it (it matches almost any program).
  const specs: (InputSpec | undefined)[] = ladder.length ? ladder.map((l) => l.input) : [undefined];
  for (const [n, g] of groups.entries()) {
    const label = groups.length > 1 ? `template code block ${n + 1}` : "the template code";
    const langs = g.map((b) => b.lang);
    for (const l of LANGS) {
      const count = langs.filter((x) => x === l).length;
      if (count !== 1) issues.push(`${label} needs exactly one ${LANG_LABEL[l]} block (has ${count})`);
    }
    for (const b of g) {
      if (specs.some((s) => templateMismatch(b.lang, s, b.code) === null)) continue;
      const hint = ladder[0] ? ` (start from \`pnpm dsa template ${ladder[0].slug} ${b.lang}\`)` : "";
      const why = templateMismatch(b.lang, ladder[0]?.input, b.code);
      issues.push(`${label}: the ${LANG_LABEL[b.lang]} code must follow the editor template of a ladder problem${hint}: ${why}`);
    }
  }

  if (issues.length) throw new ProblemError(`${where}:\n${[...new Set(issues)].map((i) => `  - ${i}`).join("\n")}`);
  return { pattern, title, body };
}

/** The file `dsa lesson new` writes: the title and the sections to fill in. */
export function lessonOutline(title: string): string {
  return `# ${title}

## How to spot it

- A clue in the statement → why it points to this pattern.

## Core idea

A few paragraphs.

### Worked example

## Template code

Paste the editor template of a ladder problem in all three languages (\`pnpm dsa template <slug> cpp|java|py\`)
and fill in solve(), as \`\`\`cpp, \`\`\`java and \`\`\`python blocks one after the other.

## Common mistakes

- Off-by-one: …
`;
}

/** Writes the lesson to its track (creating the track row if no ladder problem was imported yet). */
export async function importLesson(db: pg.Pool, l: Lesson): Promise<"created" | "updated" | "unchanged"> {
  const ok = await db.query("SELECT 1 FROM patterns WHERE slug = $1", [l.pattern]);
  if (!ok.rowCount) throw new ProblemError(`_tracks/${l.pattern}.md: unknown pattern "${l.pattern}" (add it to the patterns table first)`);
  const r = await db.query<{ created: boolean }>(
    `INSERT INTO tracks (pattern_slug, title, lesson_md) VALUES ($1, $2, $3)
     ON CONFLICT (pattern_slug) DO UPDATE SET title = EXCLUDED.title, lesson_md = EXCLUDED.lesson_md, updated_at = now()
       WHERE (tracks.title, tracks.lesson_md) IS DISTINCT FROM (EXCLUDED.title, EXCLUDED.lesson_md)
     RETURNING (xmax = 0) AS created`,
    [l.pattern, l.title, l.body],
  );
  const row = r.rows[0];
  return !row ? "unchanged" : row.created ? "created" : "updated";
}
