// Problem folder format (PLAN §7). One folder per problem: problems/<slug>/
//
//   problem.yaml     metadata (schema below)
//   statement.md     statement; samples are appended by the site from the first `samples` tests
//   gen.py           `python3 gen.py <i>` prints test i (1-based) to stdout; must be deterministic
//   ref.cpp ref.java ref.py   reference solutions (Java class must be `Main`)
//   naive.cpp        deliberately slow but correct solution; must TLE on some test
//   checker.py       optional: `checker.py input output answer`, exit 0 = pass, 1 = fail
//   wrong.cpp        required with a checker: a wrong solution the checker must reject
//   validation.json  written by `dsa validate` only — never edit by hand
//
// Track problems (`kind: track`) have no `pattern` or `position`: both come from their track's
// ladder file, problems/_tracks/<pattern>.yaml, which lists the ladder in order. The order lives
// in one place, and changing it needs no re-validation.
import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { LANGS, POOLS, PROBLEM_KINDS, RESERVED_NAMES, javaHasMainClass, templateMismatch, type InputSpec, type Lang, type TimeLimits } from "@dailydsa/shared";

export const ROOT = path.resolve(process.env.DSA_ROOT ?? process.cwd());
export const PROBLEMS_DIR = path.join(ROOT, "problems");
export const DATA_DIR = path.resolve(process.env.DATA_DIR ?? path.join(ROOT, ".data"));
export const TRACKS_DIR = path.join(PROBLEMS_DIR, "_tracks");
export const SLUG = /^[a-z0-9][a-z0-9-]*$/;

const ident = z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "must be an identifier");
const inputVar = z.discriminatedUnion("type", [
  z.object({ name: ident, type: z.enum(["int", "long", "string"]) }),
  z.object({ name: ident, type: z.enum(["int[]", "long[]", "string[]"]), length: ident }),
  z.object({ name: ident, type: z.literal("int[][]"), rows: ident, cols: z.union([ident, z.number().int().positive()]) }),
]);

export const problemYaml = z
  .object({
    title: z.string().min(3),
    kind: z.enum(PROBLEM_KINDS),
    pool: z.enum(POOLS).optional(),
    pattern: z.string().regex(/^[a-z0-9-]+$/).optional(),
    /** No longer used; accepted only to say where it went (the ladder file). */
    position: z.unknown().optional(),
    memory_mb: z.number().int().min(16).max(1024).default(256),
    output_mb: z.number().int().min(1).max(64).default(64),
    samples: z.number().int().min(1).default(1),
    tests: z.number().int().min(2).max(100),
    input: z
      .object({
        vars: z.array(inputVar).min(1),
        returns: z.enum(["int", "long", "string", "bool", "int[]", "long[]", "void"]),
        join: z.enum(["lines", "spaces"]).optional(),
        multi: z.boolean().optional(),
      })
      .optional(),
    hints: z.array(z.string().min(1)).max(3).optional(),
  })
  .strict()
  .superRefine((p, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: "custom", message });
    if (p.kind === "daily" && !p.pool) issue("daily problems need `pool: weekday | weekend`");
    if (p.kind === "track" && p.pool) issue("track problems have no pool");
    if (p.pool === "weekend" && !p.pattern) issue("weekend problems need `pattern`");
    if (p.kind === "track" && p.pattern) issue("track problems get their pattern from the ladder in problems/_tracks/<pattern>.yaml: remove `pattern`");
    if (p.position !== undefined) issue("`position` is gone: a track's order is its ladder in problems/_tracks/<pattern>.yaml");
    if (p.kind !== "track" && p.hints) issue("`hints` are only for track problems");
    if (p.samples >= p.tests) issue("`samples` must be fewer than `tests` (some tests must be hidden)");
    if (p.input) {
      const seen = new Set<string>();
      for (const v of p.input.vars) {
        for (const dep of "length" in v ? [v.length] : "rows" in v ? [v.rows, v.cols].filter((d): d is string => typeof d === "string") : []) {
          if (!seen.has(dep)) issue(`input var \`${v.name}\` refers to \`${dep}\`, which must be an earlier int var`);
        }
        if (RESERVED_NAMES.has(v.name)) issue(`input var \`${v.name}\` clashes with a keyword or a name the editor template uses`);
        if (v.name.startsWith("_")) issue(`input var \`${v.name}\`: names starting with _ are reserved for the template`);
        if (seen.has(v.name)) issue(`input var \`${v.name}\` is declared twice`);
        seen.add(v.name);
      }
    }
  });
export type ProblemMeta = z.infer<typeof problemYaml>;

export interface ValidationRecord {
  formatVersion: 1;
  validatedAt: string;
  machine: string;
  sourceHash: string;
  testsHash: string;
  testCount: number;
  limitsMs: TimeLimits;
  refSlowestMs: TimeLimits;
  naive: { tleTests: number[]; slowestFinishedMs: number };
  checker?: { rejectedTests: number[] };
}

export interface ProblemFolder {
  slug: string;
  dir: string;
  meta: ProblemMeta;
  /** The problem's pattern: from its ladder for track problems, else from problem.yaml. */
  pattern?: string;
  /** Track problems: where their ladder file puts them. */
  track?: { pattern: string; position: number };
  statement: string;
  gen: string;
  refs: Record<Lang, string>;
  naive: string;
  checker?: string;
  wrong?: string;
  validation?: ValidationRecord;
  /** Hash of every input that affects validation (sources, gen, yaml). */
  sourceHash: string;
}

const SOURCE_FILES = ["problem.yaml", "statement.md", "gen.py", "ref.cpp", "ref.java", "ref.py", "naive.cpp", "checker.py", "wrong.cpp"];

const exists = (p: string) => stat(p).then(() => true, () => false);
const read = (p: string) => readFile(p, "utf8").then((s) => s.replace(/\r\n/g, "\n"));

export class ProblemError extends Error {}

export async function loadProblem(slug: string): Promise<ProblemFolder> {
  if (!SLUG.test(slug)) throw new ProblemError(`bad slug "${slug}" (lowercase letters, digits, dashes)`);
  const dir = path.join(PROBLEMS_DIR, slug);
  if (!(await exists(dir))) throw new ProblemError(`no folder ${path.relative(ROOT, dir)}`);
  const f = (name: string) => path.join(dir, name);

  const missing = [];
  for (const name of ["problem.yaml", "statement.md", "gen.py", "ref.cpp", "ref.java", "ref.py", "naive.cpp"]) {
    if (!(await exists(f(name)))) missing.push(name);
  }
  if (missing.length) throw new ProblemError(`${slug}: missing ${missing.join(", ")}`);

  const parsed = problemYaml.safeParse(parseYaml(await read(f("problem.yaml"))));
  if (!parsed.success) {
    throw new ProblemError(`${slug}/problem.yaml:\n${parsed.error.issues.map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`).join("\n")}`);
  }
  const meta = parsed.data;
  const track = await ladderSpot(slug, meta.kind === "track");
  const pattern = track?.pattern ?? meta.pattern;
  const hasChecker = await exists(f("checker.py"));
  const hasWrong = await exists(f("wrong.cpp"));
  if (hasChecker && !hasWrong) throw new ProblemError(`${slug}: checker.py needs a wrong.cpp the checker must reject`);

  const hash = createHash("sha256");
  for (const name of SOURCE_FILES) if (await exists(f(name))) hash.update(`${name}\0${await read(f(name))}\0`);

  const refs = { cpp: await read(f("ref.cpp")), java: await read(f("ref.java")), py: await read(f("ref.py")) };
  if (!javaHasMainClass(refs.java)) throw new ProblemError(`${slug}/ref.java: the class must be named Main`);
  // The refs are the official solutions on the Solutions tab, so they follow the editor template.
  for (const lang of LANGS) {
    const why = templateMismatch(lang, parsed.data.input as InputSpec | undefined, refs[lang]);
    if (why) throw new ProblemError(`${slug}/ref.${lang} must follow the editor template (pnpm dsa template ${slug} ${lang}): ${why}`);
  }

  return {
    slug,
    dir,
    meta,
    ...(pattern && { pattern }),
    ...(track && { track }),
    statement: await read(f("statement.md")),
    gen: await read(f("gen.py")),
    refs,
    naive: await read(f("naive.cpp")),
    ...(hasChecker && { checker: await read(f("checker.py")), wrong: await read(f("wrong.cpp")) }),
    ...((await exists(f("validation.json"))) && { validation: JSON.parse(await read(f("validation.json"))) as ValidationRecord }),
    sourceHash: hash.digest("hex"),
  };
}

export async function listProblems(): Promise<string[]> {
  if (!(await exists(PROBLEMS_DIR))) return [];
  const entries = await readdir(PROBLEMS_DIR, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory() && !e.name.startsWith("_")).map((e) => e.name).sort();
}

// ── track ladders: problems/_tracks/<pattern>.yaml ──

export const ladderYaml = z
  .object({
    ladder: z
      .array(z.string().regex(SLUG, "must be a problem slug (lowercase letters, digits, dashes)"))
      .min(1, "list at least one problem")
      .max(5, "a ladder has at most 5 problems (Monday to Friday)")
      .refine((l) => new Set(l).size === l.length, "a problem can only be in the ladder once"),
  })
  .strict();

export const ladderFile = (pattern: string) => path.join(TRACKS_DIR, `${pattern}.yaml`);

/** Patterns that have a ladder file (files starting with `_` are ignored). */
export async function listTracks(): Promise<string[]> {
  const entries = await readdir(TRACKS_DIR, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".yaml") && !e.name.startsWith("_"))
    .map((e) => e.name.slice(0, -".yaml".length))
    .sort();
}

/** A track's ladder, easiest first (position = index + 1). */
export async function readLadder(pattern: string): Promise<string[]> {
  if (!SLUG.test(pattern)) throw new ProblemError(`bad pattern "${pattern}" (lowercase letters, digits, dashes)`);
  const file = ladderFile(pattern);
  if (!(await exists(file))) throw new ProblemError(`no ladder file problems/_tracks/${pattern}.yaml (pnpm dsa track new ${pattern} <slug>...)`);
  const parsed = ladderYaml.safeParse(parseYaml(await read(file)) ?? {});
  if (!parsed.success) {
    throw new ProblemError(`_tracks/${pattern}.yaml:\n${parsed.error.issues.map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`).join("\n")}`);
  }
  return parsed.data.ladder;
}

/**
 * Where the ladder files put a problem. A track problem must be in exactly one ladder, any other
 * problem in none. A broken ladder file only stops track problems (`dsa track check` reports it).
 */
async function ladderSpot(slug: string, isTrack: boolean): Promise<{ pattern: string; position: number } | undefined> {
  const spots: { pattern: string; position: number }[] = [];
  for (const pattern of await listTracks()) {
    const ladder = await readLadder(pattern).catch((e: unknown) => {
      if (isTrack) throw e;
      return [] as string[];
    });
    const i = ladder.indexOf(slug);
    if (i >= 0) spots.push({ pattern, position: i + 1 });
  }
  const files = spots.map((s) => `_tracks/${s.pattern}.yaml`).join(", ");
  if (!isTrack) {
    if (spots.length) throw new ProblemError(`${slug}: it is in the ladder of ${files}, so problem.yaml needs \`kind: track\` (and no pool or pattern)`);
    return undefined;
  }
  if (!spots.length) throw new ProblemError(`${slug}: a track problem must be in a ladder: pnpm dsa track add <pattern> ${slug}`);
  if (spots.length > 1) throw new ProblemError(`${slug}: it is in more than one ladder (${files}); a problem belongs to one track`);
  return spots[0];
}

