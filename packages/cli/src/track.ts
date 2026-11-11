// Tracks in git (PLAN §2): problems/_tracks/<pattern>.yaml is the ladder (its problems in order,
// easiest first) and problems/_tracks/<pattern>.md the lesson (lesson.ts). Track problems are
// ordinary problem folders with `kind: track`; their pattern and position come from the ladder.
//
//   pnpm dsa track new <pattern> <slug>... [--weekend <slug>...]   ladder file + lesson outline + problem folders
//   pnpm dsa track add <pattern> <slug>... [--weekend <slug>...]   more ladder problems (appended) or weekend ones
//   pnpm dsa track check <pattern>... | --all                       ladder, lesson, each problem's state, weekend count
//   pnpm dsa track import <pattern>... | --all                      its problems, the ladder order, the lesson
import { cp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type pg from "pg";
import { parse as parseYaml } from "yaml";
import { LANGS, STARTING_PATTERNS, editorTemplate, type InputSpec } from "@dailydsa/shared";
import { importProblem, syncLadder } from "./importer.js";
import { importLesson, lessonFile, lessonOutline, listLessons, loadLesson } from "./lesson.js";
import { PROBLEMS_DIR, ProblemError, SLUG, TRACKS_DIR, ladderFile, listProblems, listTracks, loadProblem, readLadder, type ProblemFolder } from "./problem.js";

export const LADDER_SIZE = 5;
/** Saturday and Sunday each need their own weekend problem of the week's pattern (PLAN §12). */
export const WEEKEND_MIN = 2;
const HINT_TODO = "TODO:";

const exists = (p: string) => stat(p).then(() => true, () => false);
const patternName = (pattern: string) => STARTING_PATTERNS.find((p) => p.slug === pattern)?.name ?? pattern;

/** Every track the repo knows about: a ladder file, a lesson, or both. */
export async function allTracks(): Promise<string[]> {
  return [...new Set([...(await listTracks()), ...(await listLessons())])].sort();
}

export function ladderFileText(pattern: string, ladder: string[]): string {
  return `# The ${patternName(pattern)} track's ladder, easiest first: #1 opens on Monday of the track's week,
# #2 on Tuesday, … #5 on Friday. Reordering needs no re-validation; then run: pnpm dsa track import ${pattern}
ladder:
${ladder.map((s) => `  - ${s}`).join("\n")}
`;
}

/**
 * A new problems/<slug>/ from problems/_template with the given problem.yaml (default: the
 * template's), and ref.cpp/java/py written as the editor template of its `input:`, so the folder
 * loads at once and only solve() needs filling in. Used by `dsa new` and `dsa track new|add`.
 */
export async function createProblemFolder(slug: string, yaml?: string): Promise<void> {
  const src = path.join(PROBLEMS_DIR, "_template");
  const dir = path.join(PROBLEMS_DIR, slug);
  await cp(src, dir, { recursive: true });
  const text = yaml ?? (await readFile(path.join(src, "problem.yaml"), "utf8"));
  await writeFile(path.join(dir, "problem.yaml"), text);
  const input = (parseYaml(text) as { input?: InputSpec } | null)?.input;
  for (const lang of LANGS) await writeFile(path.join(dir, `ref.${lang}`), editorTemplate(lang, input));
}

/** problems/_template/problem.yaml turned into a track or weekend problem of `pattern`. */
export function scaffoldYaml(template: string, slug: string, as: "track" | "weekend", pattern: string): string {
  const title = slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  const out: string[] = [];
  for (const line of template.replace(/\r\n/g, "\n").split("\n")) {
    if (/^title:/.test(line)) out.push(`title: ${title}`);
    else if (/^kind:/.test(line)) out.push(as === "track" ? `kind: track               # pattern + position: problems/_tracks/${pattern}.yaml` : "kind: daily");
    else if (/^pool:/.test(line)) { if (as === "weekend") out.push("pool: weekend"); }
    else if (/^pattern:/.test(line)) { if (as === "weekend") out.push(`pattern: ${pattern}     # hidden until solved`); }
    else out.push(line);
  }
  let yaml = out.join("\n").trimEnd() + "\n";
  if (as === "track") {
    yaml += `hints:                    # up to 3, revealed one at a time
  - "${HINT_TODO} how the pattern applies to this problem"
  - "${HINT_TODO} what to keep track of"
  - "${HINT_TODO} the key idea"
`;
  }
  return yaml;
}

/**
 * `track new` / `track add`: checks everything first, then writes the ladder file, the lesson
 * outline (if missing) and a folder from _template for each new slug. Existing folders are
 * kept when they already are what they're listed as. Returns what it did, one line each.
 */
export async function scaffoldTrack(mode: "new" | "add", pattern: string, ladderAdd: string[], weekendAdd: string[]): Promise<string[]> {
  if (!SLUG.test(pattern)) throw new ProblemError(`bad pattern "${pattern}" (lowercase letters, digits, dashes)`);
  const all = [...ladderAdd, ...weekendAdd];
  if (mode === "add" && !all.length) throw new ProblemError(`usage: pnpm dsa track add ${pattern} <slug>... [--weekend <slug>...]`);
  if (mode === "new" && !ladderAdd.length) throw new ProblemError(`usage: pnpm dsa track new ${pattern} <slug1> … <slug5> [--weekend <slug>...]`);
  for (const s of all) if (!SLUG.test(s)) throw new ProblemError(`bad slug "${s}" (lowercase letters, digits, dashes)`);
  const dup = all.find((s, i) => all.indexOf(s) !== i);
  if (dup) throw new ProblemError(`${dup} is listed twice`);

  const hasLadder = await exists(ladderFile(pattern));
  if (mode === "new" && hasLadder) throw new ProblemError(`problems/_tracks/${pattern}.yaml already exists: use pnpm dsa track add ${pattern} <slug>...`);
  if (mode === "add" && !hasLadder) throw new ProblemError(`no problems/_tracks/${pattern}.yaml yet: start with pnpm dsa track new ${pattern} <slug>...`);
  const ladder = hasLadder ? await readLadder(pattern) : [];
  const inLadder = ladderAdd.find((s) => ladder.includes(s));
  if (inLadder) throw new ProblemError(`${inLadder} is already in the ${pattern} ladder`);
  const next = [...ladder, ...ladderAdd];
  if (next.length > LADDER_SIZE) throw new ProblemError(`a ladder has at most ${LADDER_SIZE} problems; ${pattern} would have ${next.length}`);
  const otherLadders = new Map<string, string[]>();
  for (const other of await listTracks()) if (other !== pattern) otherLadders.set(other, await readLadder(other).catch(() => []));
  for (const s of all) {
    for (const [other, l] of otherLadders) if (l.includes(s)) throw new ProblemError(`${s} is in the ${other} ladder already`);
  }
  const both = weekendAdd.find((s) => ladder.includes(s));
  if (both) throw new ProblemError(`${both} is in the ${pattern} ladder, so it can't be a weekend problem`);

  // Existing folders must already be what they're listed as.
  const create: { slug: string; as: "track" | "weekend" }[] = [];
  const kept: string[] = [];
  for (const [slug, as] of [...ladderAdd.map((s) => [s, "track"] as const), ...weekendAdd.map((s) => [s, "weekend"] as const)]) {
    const dir = path.join(PROBLEMS_DIR, slug);
    if (!(await exists(dir))) {
      create.push({ slug, as });
      continue;
    }
    const raw = await rawYaml(slug);
    const fits = as === "track" ? raw.kind === "track" : raw.kind === "daily" && raw.pool === "weekend" && raw.pattern === pattern;
    if (!fits) {
      const want = as === "track" ? "`kind: track`" : `\`kind: daily\`, \`pool: weekend\`, \`pattern: ${pattern}\``;
      throw new ProblemError(`problems/${slug} already exists and isn't a ${as === "track" ? "track" : "weekend"} problem (its problem.yaml needs ${want})`);
    }
    kept.push(slug);
  }

  const done: string[] = [];
  const template = await readFile(path.join(PROBLEMS_DIR, "_template", "problem.yaml"), "utf8");
  for (const { slug, as } of create) {
    await createProblemFolder(slug, scaffoldYaml(template, slug, as, pattern));
    done.push(`created problems/${slug} (${as === "track" ? `ladder #${next.indexOf(slug) + 1}` : "weekend"})`);
  }
  for (const slug of kept) done.push(`kept problems/${slug} (already exists)`);
  await mkdir(TRACKS_DIR, { recursive: true });
  if (ladderAdd.length) {
    await writeFile(ladderFile(pattern), ladderFileText(pattern, next));
    done.push(`${hasLadder ? "updated" : "created"} problems/_tracks/${pattern}.yaml (ladder ${next.length}/${LADDER_SIZE})`);
  }
  if (!(await exists(lessonFile(pattern)))) {
    await writeFile(lessonFile(pattern), lessonOutline(patternName(pattern)));
    done.push(`created problems/_tracks/${pattern}.md (lesson outline)`);
  }
  return done;
}

/** problems/<slug>/problem.yaml as plain data, or {} if it's missing or not YAML. */
async function rawYaml(slug: string): Promise<Record<string, unknown>> {
  const text = await readFile(path.join(PROBLEMS_DIR, slug, "problem.yaml"), "utf8").catch(() => "");
  try {
    const v = parseYaml(text) as unknown;
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** The weekend daily problems of a pattern, by their problem.yaml alone (so unfinished ones count). */
export async function weekendSlugs(pattern: string): Promise<string[]> {
  const out: string[] = [];
  for (const slug of await listProblems()) {
    const y = await rawYaml(slug);
    if (y.kind === "daily" && y.pool === "weekend" && y.pattern === pattern) out.push(slug);
  }
  return out;
}

export function validationState(p: ProblemFolder): { ok: boolean; text: string } {
  if (!p.validation) return { ok: false, text: "not validated" };
  if (p.validation.sourceHash !== p.sourceHash) return { ok: false, text: "stale — re-validate" };
  return { ok: true, text: `valid ${JSON.stringify(p.validation.limitsMs)}` };
}

export interface TrackReport {
  pattern: string;
  /** Ladder problems, then weekend problems; `ok` = loads and is validated. */
  rows: { label: string; slug: string; ok: boolean; text: string }[];
  ladderSize: number;
  weekendCount: number;
  lesson: { ok: boolean; text: string };
  /** Things to fix before the track can be imported. */
  errors: string[];
  /** Fine for now, but needed before the track runs. */
  warnings: string[];
}

/** Everything about one track, for `track check` and `dsa list`. Never throws for content problems. */
export async function checkTrack(pattern: string): Promise<TrackReport> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rows: TrackReport["rows"] = [];
  const firstLine = (e: unknown) => (e as Error).message;

  let ladder: string[] = [];
  try {
    ladder = await readLadder(pattern);
  } catch (e) {
    errors.push(firstLine(e));
  }
  for (const [i, slug] of ladder.entries()) {
    try {
      const p = await loadProblem(slug);
      const v = validationState(p);
      rows.push({ label: `#${i + 1}`, slug, ...v });
      if (!v.ok) warnings.push(`${slug}: ${v.text}`);
      if ((p.meta.hints ?? []).some((h) => h.startsWith(HINT_TODO))) warnings.push(`${slug}: hints still say ${HINT_TODO}`);
      if (!(p.meta.hints ?? []).length) warnings.push(`${slug}: no hints`);
    } catch (e) {
      rows.push({ label: `#${i + 1}`, slug, ok: false, text: firstLine(e).split("\n")[0]! });
      errors.push(firstLine(e));
    }
  }
  if (ladder.length && ladder.length < LADDER_SIZE) warnings.push(`the ladder has ${ladder.length} of ${LADDER_SIZE} problems`);

  const weekend = await weekendSlugs(pattern);
  const weekendCount = weekend.length;
  for (const slug of weekend) {
    try {
      const v = validationState(await loadProblem(slug));
      rows.push({ label: "weekend", slug, ...v });
      if (!v.ok) warnings.push(`${slug}: ${v.text}`);
    } catch (e) {
      rows.push({ label: "weekend", slug, ok: false, text: firstLine(e).split("\n")[0]! });
      warnings.push(firstLine(e));
    }
  }
  if (weekendCount < WEEKEND_MIN) {
    warnings.push(`${weekendCount} weekend problem${weekendCount === 1 ? "" : "s"} with this pattern; Saturday and Sunday need ${WEEKEND_MIN} (pnpm dsa track add ${pattern} --weekend <slug>)`);
  }

  let lesson: TrackReport["lesson"];
  try {
    const l = await loadLesson(pattern);
    lesson = { ok: true, text: `"${l.title}" ok` };
  } catch (e) {
    lesson = { ok: false, text: firstLine(e).split("\n").slice(1).join(" ").trim() || firstLine(e) };
    errors.push(firstLine(e));
  }
  return { pattern, rows, ladderSize: ladder.length, weekendCount, lesson, errors, warnings };
}

/** One line for `dsa list`. */
export function trackSummary(r: TrackReport): string {
  return `ladder ${r.ladderSize}/${LADDER_SIZE} · weekend ${r.weekendCount} · lesson ${r.lesson.ok ? "ok" : "not ok"}`;
}

/**
 * `track import`: the track's ladder and weekend problems (each must be validated), then the
 * ladder order and the lesson. Logs one line per item; returns how many failed.
 */
export async function importTrack(db: pg.Pool, pattern: string, log: (ok: boolean, line: string) => void): Promise<number> {
  const ladder = await readLadder(pattern);
  let failed = 0;
  for (const slug of [...ladder, ...(await weekendSlugs(pattern))]) {
    try {
      const r = await importProblem(db, await loadProblem(slug));
      log(true, `${slug} ${r.created ? "created" : "updated"} (id ${r.id})`);
    } catch (e) {
      if (!(e instanceof ProblemError)) throw e;
      failed++;
      log(false, e.message);
    }
  }
  return failed + (await importTrackParts(db, pattern, log));
}

/** The ladder order and the lesson (problems imported separately). Returns how many failed. */
export async function importTrackParts(db: pg.Pool, pattern: string, log: (ok: boolean, line: string) => void): Promise<number> {
  let failed = 0;
  try {
    const ladder = await readLadder(pattern);
    const missing = await syncLadder(db, pattern, ladder);
    if (missing.length) {
      failed++;
      log(false, `${pattern} ladder: ${missing.join(", ")} not imported yet, so ${missing.length === 1 ? "its slot is" : "their slots are"} empty`);
    } else log(true, `${pattern} ladder: ${ladder.join(" → ")}`);
  } catch (e) {
    if (!(e instanceof ProblemError)) throw e;
    failed++;
    log(false, e.message);
  }
  try {
    log(true, `lesson ${pattern} ${await importLesson(db, await loadLesson(pattern))}`);
  } catch (e) {
    if (!(e instanceof ProblemError)) throw e;
    failed++;
    log(false, e.message);
  }
  return failed;
}
