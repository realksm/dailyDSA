// dailyDSA problem tool.
//   pnpm dsa list                     problems and their validation state
//   pnpm dsa new <slug>               copy problems/_template to problems/<slug>
//   pnpm dsa template <slug> <lang>   print the editor template (start ref.<lang> from it)
//   pnpm dsa validate <slug>|--all    run the full validation (needs go-judge)
//   pnpm dsa import <slug>|--all      upsert validated problems into the database (--all: lessons too)
//   pnpm dsa lesson new|check|import <pattern>|--all   track lessons in problems/_tracks/ (see lesson.ts)
//   pnpm dsa admin create|reset-password …, pnpm dsa invite create …   (see accounts.ts)
import { cp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { createPool, withJudgeLock } from "@dailydsa/db";
import { GoJudge } from "@dailydsa/judge";
import { LANGS, STARTING_PATTERNS, editorTemplate, type InputSpec, type Lang } from "@dailydsa/shared";
import { parse as parseYaml } from "yaml";
import { accountsCommand } from "./accounts.js";
import { importProblem } from "./importer.js";
import { TRACKS_DIR, importLesson, lessonFile, lessonOutline, listLessons, loadLesson } from "./lesson.js";
import { PROBLEMS_DIR, ProblemError, listProblems, loadProblem } from "./problem.js";
import { ValidationError, validate } from "./validate.js";

const [cmd, ...args] = process.argv.slice(2);
const c = { green: (s: string) => `\x1b[32m${s}\x1b[0m`, red: (s: string) => `\x1b[31m${s}\x1b[0m`, dim: (s: string) => `\x1b[2m${s}\x1b[0m`, bold: (s: string) => `\x1b[1m${s}\x1b[0m` };

async function targets(): Promise<string[]> {
  if (args.includes("--all")) return listProblems();
  const slugs = args.filter((a) => !a.startsWith("--"));
  if (!slugs.length) throw new ProblemError(`usage: pnpm dsa ${cmd} <slug>... | --all`);
  return slugs;
}

/** Checks and imports lessons; returns how many failed. */
async function importLessons(db: ReturnType<typeof createPool>, patterns: string[]): Promise<number> {
  let failed = 0;
  for (const pattern of patterns) {
    try {
      const r = await importLesson(db, await loadLesson(pattern));
      console.log(c.green(`✔ lesson ${pattern} ${r}`));
    } catch (e) {
      if (!(e instanceof ProblemError)) throw e;
      failed++;
      console.log(c.red(`✘ ${e.message}`));
    }
  }
  return failed;
}

async function main(): Promise<number> {
  switch (cmd) {
    case "list": {
      for (const slug of await listProblems()) {
        try {
          const p = await loadProblem(slug);
          const state = !p.validation ? c.red("not validated") : p.validation.sourceHash !== p.sourceHash ? c.red("stale — re-validate") : c.green(`valid ${JSON.stringify(p.validation.limitsMs)}`);
          const where = p.meta.kind === "track" ? `track ${p.meta.pattern} #${p.meta.position}` : `${p.meta.pool}${p.meta.pattern ? ` (${p.meta.pattern})` : ""}`;
          console.log(`${slug.padEnd(28)} ${where.padEnd(30)} ${state}`);
        } catch (e) {
          console.log(`${slug.padEnd(28)} ${c.red((e as Error).message.split("\n")[0]!)}`);
        }
      }
      for (const pattern of await listLessons()) {
        const state = await loadLesson(pattern).then(
          () => c.green("ok"),
          (e: Error) => c.red(e.message.split("\n")[1]?.trim() ?? e.message),
        );
        console.log(`${`_tracks/${pattern}.md`.padEnd(28)} ${"lesson".padEnd(30)} ${state}`);
      }
      return 0;
    }
    case "new": {
      const slug = args[0];
      if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new ProblemError("usage: pnpm dsa new <slug>  (lowercase letters, digits, dashes)");
      const dest = path.join(PROBLEMS_DIR, slug);
      if (await stat(dest).then(() => true, () => false)) throw new ProblemError(`problems/${slug} already exists`);
      await cp(path.join(PROBLEMS_DIR, "_template"), dest, { recursive: true });
      console.log(`created problems/${slug} — fill in every file, then: pnpm dsa validate ${slug}`);
      return 0;
    }
    case "template": {
      // Reads problem.yaml directly: loadProblem would refuse a ref that doesn't fit the template yet.
      const [slug, lang] = args;
      if (!slug || !(LANGS as readonly string[]).includes(lang ?? "")) throw new ProblemError("usage: pnpm dsa template <slug> cpp|java|py");
      const yaml = await readFile(path.join(PROBLEMS_DIR, slug, "problem.yaml"), "utf8").catch(() => {
        throw new ProblemError(`no problems/${slug}/problem.yaml`);
      });
      const input = (parseYaml(yaml) as { input?: InputSpec } | null)?.input;
      process.stdout.write(editorTemplate(lang as Lang, input));
      return 0;
    }
    case "validate": {
      const gj = new GoJudge();
      // Hold the judge lock per problem, so live submissions get judged between problems and
      // never alongside calibration. No database (e.g. a laptop with only go-judge up) = no lock.
      const pool = createPool();
      const lockConn = await pool.connect().catch(() => undefined);
      if (!lockConn) console.log(c.dim("(database not reachable — validating without the judge lock)"));
      const locked = <T,>(fn: () => Promise<T>) => (lockConn ? withJudgeLock(lockConn, fn) : fn());
      let failed = 0;
      try {
        for (const slug of await targets()) {
          console.log(c.bold(`\n▶ ${slug}`));
          const t0 = Date.now();
          try {
            const p = await loadProblem(slug);
            const r = await locked(() => validate(gj, p, {
              step: (s) => console.log(`  • ${s}`),
              info: (s) => console.log(c.dim(`      ${s}`)),
            }));
            console.log(c.green(`  ✔ valid in ${((Date.now() - t0) / 1000).toFixed(1)}s — limits ${JSON.stringify(r.limitsMs)}, wrote validation.json`));
          } catch (e) {
            failed++;
            if (!(e instanceof ValidationError || e instanceof ProblemError)) throw e;
            console.log(c.red(`  ✘ ${e.message.replace(/\n/g, "\n    ")}`));
          }
        }
      } finally {
        lockConn?.release();
        await pool.end();
      }
      return failed ? 1 : 0;
    }
    case "import": {
      const db = createPool();
      let failed = 0;
      try {
        for (const slug of await targets()) {
          try {
            const r = await importProblem(db, await loadProblem(slug));
            console.log(c.green(`✔ ${slug} ${r.created ? "created" : "updated"} (id ${r.id})`));
          } catch (e) {
            if (!(e instanceof ProblemError)) throw e;
            failed++;
            console.log(c.red(`✘ ${e.message}`));
          }
        }
        if (args.includes("--all")) failed += await importLessons(db, await listLessons());
      } finally {
        await db.end();
      }
      return failed ? 1 : 0;
    }
    case "lesson": {
      const [sub, ...rest] = args;
      const patterns = rest.includes("--all") ? await listLessons() : rest.filter((a) => !a.startsWith("--"));
      if (sub === "new") {
        const pattern = rest[0];
        if (!pattern || !/^[a-z0-9][a-z0-9-]*$/.test(pattern)) throw new ProblemError("usage: pnpm dsa lesson new <pattern>");
        const file = lessonFile(pattern);
        if (await stat(file).then(() => true, () => false)) throw new ProblemError(`problems/_tracks/${pattern}.md already exists`);
        await mkdir(TRACKS_DIR, { recursive: true });
        await writeFile(file, lessonOutline(STARTING_PATTERNS.find((p) => p.slug === pattern)?.name ?? pattern));
        console.log(`created problems/_tracks/${pattern}.md — write it, then: pnpm dsa lesson check ${pattern}`);
        return 0;
      }
      if ((sub !== "check" && sub !== "import") || !patterns.length) {
        throw new ProblemError("usage: pnpm dsa lesson new <pattern> | lesson check|import <pattern>... | --all");
      }
      if (sub === "import") {
        const db = createPool();
        try {
          return (await importLessons(db, patterns)) ? 1 : 0;
        } finally {
          await db.end();
        }
      }
      let failed = 0;
      for (const pattern of patterns) {
        try {
          const l = await loadLesson(pattern);
          console.log(c.green(`✔ ${pattern}: "${l.title}" is fine`));
        } catch (e) {
          if (!(e instanceof ProblemError)) throw e;
          failed++;
          console.log(c.red(`✘ ${e.message}`));
        }
      }
      return failed ? 1 : 0;
    }
    case "admin":
    case "invite":
      return accountsCommand(cmd, args, (s) => console.log(c.green(s)));
    default:
      console.log("usage: pnpm dsa list | new <slug> | template <slug> <lang> | validate <slug>|--all | import <slug>|--all | lesson new|check|import <pattern>|--all | admin create|reset-password | invite create");
      return cmd ? 1 : 0;
  }
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error(c.red(e instanceof ProblemError ? e.message : (e as Error).stack ?? String(e)));
    process.exit(1);
  },
);
