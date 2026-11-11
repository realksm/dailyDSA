// dailyDSA problem tool.
//   pnpm dsa list                     problems and tracks, and their state
//   pnpm dsa new <slug>               copy problems/_template to problems/<slug> (a daily problem)
//   pnpm dsa template <slug> <lang>   print the editor template (start ref.<lang> from it)
//   pnpm dsa validate <slug>|--all    run the full validation (needs go-judge)
//   pnpm dsa import <slug>|--all      upsert validated problems into the database (--all: every track's ladder + lesson too)
//   pnpm dsa track new|add|check|import …   tracks: ladder file + lesson in problems/_tracks/ (see track.ts)
//   pnpm dsa admin create|reset-password …, pnpm dsa invite create …   (see accounts.ts)
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { createPool, withJudgeLock } from "@dailydsa/db";
import { GoJudge } from "@dailydsa/judge";
import { LANGS, editorTemplate, type InputSpec, type Lang } from "@dailydsa/shared";
import { parse as parseYaml } from "yaml";
import { accountsCommand } from "./accounts.js";
import { importProblem } from "./importer.js";
import { PROBLEMS_DIR, ProblemError, listProblems, loadProblem } from "./problem.js";
import { allTracks, checkTrack, createProblemFolder, importTrack, importTrackParts, scaffoldTrack, trackSummary, validationState } from "./track.js";
import { ValidationError, validate } from "./validate.js";

const [cmd, ...args] = process.argv.slice(2);
const c = { green: (s: string) => `\x1b[32m${s}\x1b[0m`, red: (s: string) => `\x1b[31m${s}\x1b[0m`, dim: (s: string) => `\x1b[2m${s}\x1b[0m`, bold: (s: string) => `\x1b[1m${s}\x1b[0m` };

async function targets(): Promise<string[]> {
  if (args.includes("--all")) return listProblems();
  const slugs = args.filter((a) => !a.startsWith("--"));
  if (!slugs.length) throw new ProblemError(`usage: pnpm dsa ${cmd} <slug>... | --all`);
  return slugs;
}

const logLine = (ok: boolean, line: string) => console.log(ok ? c.green(`✔ ${line}`) : c.red(`✘ ${line}`));

/** `--weekend a b` → the slugs after the flag; everything else before it. */
function splitWeekend(rest: string[]): { ladder: string[]; weekend: string[] } {
  const at = rest.indexOf("--weekend");
  return at < 0 ? { ladder: rest, weekend: [] } : { ladder: rest.slice(0, at), weekend: rest.slice(at + 1) };
}

async function main(): Promise<number> {
  switch (cmd) {
    case "list": {
      for (const slug of await listProblems()) {
        try {
          const p = await loadProblem(slug);
          const v = validationState(p);
          const where = p.track ? `track ${p.track.pattern} #${p.track.position}` : `${p.meta.pool}${p.pattern ? ` (${p.pattern})` : ""}`;
          console.log(`${slug.padEnd(28)} ${where.padEnd(30)} ${v.ok ? c.green(v.text) : c.red(v.text)}`);
        } catch (e) {
          console.log(`${slug.padEnd(28)} ${c.red((e as Error).message.split("\n")[0]!)}`);
        }
      }
      for (const pattern of await allTracks()) {
        const r = await checkTrack(pattern);
        const text = `${trackSummary(r)}${r.errors.length ? " — pnpm dsa track check " + pattern : ""}`;
        console.log(`${`_tracks/${pattern}`.padEnd(28)} ${"track".padEnd(30)} ${r.errors.length ? c.red(text) : r.warnings.length ? text : c.green(text)}`);
      }
      return 0;
    }
    case "new": {
      const slug = args[0];
      if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new ProblemError("usage: pnpm dsa new <slug>  (lowercase letters, digits, dashes)");
      const dest = path.join(PROBLEMS_DIR, slug);
      if (await stat(dest).then(() => true, () => false)) throw new ProblemError(`problems/${slug} already exists`);
      await createProblemFolder(slug);
      console.log(`created problems/${slug} (a daily problem; track problems come from pnpm dsa track new|add) — fill in every file, then: pnpm dsa validate ${slug}
(the refs are the editor template of the example input; after changing \`input:\` regenerate them with pnpm dsa template ${slug} cpp|java|py)`);
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
        // Each track problem's import already synced its ladder; this also catches removed
        // problems and imports every lesson.
        if (args.includes("--all")) for (const pattern of await allTracks()) failed += await importTrackParts(db, pattern, logLine);
      } finally {
        await db.end();
      }
      return failed ? 1 : 0;
    }
    case "track": {
      const [sub, ...rest] = args;
      const usage = "usage: pnpm dsa track new|add <pattern> <slug>... [--weekend <slug>...] | track check|import <pattern>... | --all";
      if (sub === "new" || sub === "add") {
        const [pattern, ...slugs] = rest;
        if (!pattern) throw new ProblemError(usage);
        const { ladder, weekend } = splitWeekend(slugs);
        for (const line of await scaffoldTrack(sub, pattern, ladder, weekend)) console.log(c.green(`✔ ${line}`));
        console.log(c.dim(`next: write each problem (pnpm dsa template <slug> cpp|java|py for the refs), then pnpm dsa validate <slug>,
      the lesson in problems/_tracks/${pattern}.md, then pnpm dsa track check ${pattern} and pnpm dsa track import ${pattern}`));
        return 0;
      }
      const patterns = rest.includes("--all") ? await allTracks() : rest.filter((a) => !a.startsWith("--"));
      if ((sub !== "check" && sub !== "import") || !patterns.length) throw new ProblemError(usage);
      if (sub === "import") {
        const db = createPool();
        let failed = 0;
        try {
          for (const pattern of patterns) {
            console.log(c.bold(`▶ ${pattern}`));
            failed += await importTrack(db, pattern, logLine);
          }
        } finally {
          await db.end();
        }
        return failed ? 1 : 0;
      }
      let failed = 0;
      for (const pattern of patterns) {
        const r = await checkTrack(pattern);
        console.log(c.bold(`▶ ${pattern}`) + `  ${trackSummary(r)}`);
        for (const row of r.rows) console.log(`  ${row.label.padEnd(8)} ${row.slug.padEnd(26)} ${row.ok ? c.green(row.text) : c.red(row.text)}`);
        console.log(`  ${"lesson".padEnd(8)} ${`_tracks/${pattern}.md`.padEnd(26)} ${r.lesson.ok ? c.green(r.lesson.text) : c.red("see below")}`);
        for (const w of r.warnings) console.log(`  ⚠ ${w}`);
        for (const e of r.errors) console.log(c.red(`  ✘ ${e.replace(/\n/g, "\n    ")}`));
        if (r.errors.length) failed++;
        else console.log(c.green(r.warnings.length ? "  ✔ no errors (the warnings must be fixed before the track runs)" : "  ✔ ready"));
      }
      return failed ? 1 : 0;
    }
    case "admin":
    case "invite":
      return accountsCommand(cmd, args, (s) => console.log(c.green(s)));
    default:
      console.log("usage: pnpm dsa list | new <slug> | template <slug> <lang> | validate <slug>|--all | import <slug>|--all | track new|add|check|import … | admin create|reset-password | invite create");
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
