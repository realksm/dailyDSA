// `dsa validate <slug>` — a problem cannot go live until every step passes (PLAN §7).
//
//  1. generate   gen.py makes every input inside the sandbox; spot-check determinism
//  2. answers    ref.cpp produces the reference outputs
//  3. refs       ref.java / ref.py agree with ref.cpp (no checker) or pass the checker
//  4. calibrate  limit(lang) = max(3 × slowest ref test, 500 ms), rounded up to 100 ms, CPU time
//  5. naive      naive.cpp must TLE on ≥1 test at 2× the C++ limit, and be correct wherever it finishes
//  6. checker    (if any) wrong.cpp must be rejected on ≥1 test
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { LANGS, type Lang, type TimeLimits } from "@dailydsa/shared";
import { GoJudge, normalizeOutput, runChecker, type Limits, type Program, writeTests, type StoredTest } from "@dailydsa/judge";
import { DATA_DIR, type ProblemFolder, type ValidationRecord } from "./problem.js";

export class ValidationError extends Error {}

const TIMING_REPEATS = 3;
const FLOOR_MS = 500;
const LIMIT_FACTOR = 3;
const NAIVE_FACTOR = 2;
/** Generous cap while measuring; anything slower is a broken reference, not a tight limit. */
const MEASURE_CAP_MS = 20_000;

export interface Reporter {
  step(name: string): void;
  info(msg: string): void;
}

export async function validate(gj: GoJudge, p: ProblemFolder, log: Reporter): Promise<ValidationRecord> {
  const m = p.meta;
  const measure: Limits = { cpuMs: MEASURE_CAP_MS, memoryMb: m.memory_mb, outputMb: m.output_mb };

  // 1 ─ generate
  log.step(`generate ${m.tests} tests with gen.py`);
  const inputs: string[] = [];
  for (let i = 1; i <= m.tests; i++) inputs.push(await generate(gj, p, i));
  for (const i of new Set([1, m.tests])) {
    if ((await generate(gj, p, i)) !== inputs[i - 1]) throw new ValidationError(`gen.py is not deterministic: test ${i} differs between runs (seed the RNG from the test number)`);
  }
  const totalMb = inputs.reduce((s, x) => s + Buffer.byteLength(x), 0) / 2 ** 20;
  log.info(`inputs: ${totalMb.toFixed(1)} MB total, largest ${(Math.max(...inputs.map((x) => Buffer.byteLength(x))) / 2 ** 20).toFixed(2)} MB`);

  // 2+3+4 ─ answers, cross-check, calibrate
  const slowest = {} as TimeLimits;
  const answers: string[] = [];
  for (const lang of LANGS) {
    log.step(lang === "cpp" ? "ref.cpp → reference answers + timing" : `ref.${lang} → check against answers + timing`);
    const prog = await compileOrFail(gj, lang, p.refs[lang], `ref.${lang}`);
    try {
      let worst = 0;
      for (const [i, input] of inputs.entries()) {
        let best = Infinity; // min over repeats filters out scheduler noise; the max over tests is the limit basis
        for (let rep = 0; rep < TIMING_REPEATS; rep++) {
          const ex = await gj.execute(prog, input, measure);
          if (ex.status !== "ok") throw new ValidationError(`ref.${lang} failed on test ${i + 1}: ${ex.status}${ex.detail ? ` ${ex.detail}` : ""}\n${ex.stderr.slice(0, 2000)}`);
          best = Math.min(best, ex.cpuMs);
          if (rep > 0) continue;
          if (lang === "cpp") {
            if (!ex.stdout.trim()) throw new ValidationError(`ref.cpp printed nothing on test ${i + 1}`);
            answers.push(ex.stdout);
          } else {
            await expectCorrect(gj, p, `ref.${lang}`, i, input, ex.stdout, answers[i]!);
          }
        }
        worst = Math.max(worst, best);
      }
      slowest[lang] = Math.round(worst);
    } finally {
      await gj.release(prog);
    }
  }
  const limitsMs = Object.fromEntries(
    LANGS.map((l) => [l, Math.ceil(Math.max(LIMIT_FACTOR * slowest[l], FLOOR_MS) / 100) * 100]),
  ) as TimeLimits;
  log.info(`slowest ref test (CPU ms): ${fmt(slowest)}`);
  log.info(`calibrated limits (ms):    ${fmt(limitsMs)}`);

  // 5 ─ naive must be too slow, but correct
  log.step(`naive.cpp must exceed ${NAIVE_FACTOR}× the C++ limit (${NAIVE_FACTOR * limitsMs.cpp} ms) on at least one test`);
  const naive = await compileOrFail(gj, "cpp", p.naive, "naive.cpp");
  const tleTests: number[] = [];
  let slowestFinishedMs = 0;
  try {
    for (const [i, input] of inputs.entries()) {
      const ex = await gj.execute(naive, input, { ...measure, cpuMs: NAIVE_FACTOR * limitsMs.cpp });
      if (ex.status === "tle") { tleTests.push(i + 1); continue; }
      if (ex.status !== "ok") throw new ValidationError(`naive.cpp must be slow but correct; it got ${ex.status} on test ${i + 1}\n${ex.stderr.slice(0, 2000)}`);
      slowestFinishedMs = Math.max(slowestFinishedMs, ex.cpuMs);
      await expectCorrect(gj, p, "naive.cpp", i, input, ex.stdout, answers[i]!);
    }
  } finally {
    await gj.release(naive);
  }
  if (!tleTests.length) {
    throw new ValidationError(
      `naive.cpp finished every test (slowest ${Math.round(slowestFinishedMs)} ms vs ${NAIVE_FACTOR * limitsMs.cpp} ms needed) — make the largest tests bigger so brute force can't pass`,
    );
  }
  log.info(`naive TLE on tests ${tleTests.join(", ")}; correct on the rest`);

  // 6 ─ the checker can say no
  let checker: ValidationRecord["checker"];
  if (p.checker && p.wrong) {
    log.step("checker must reject wrong.cpp on at least one test");
    const wrong = await compileOrFail(gj, "cpp", p.wrong, "wrong.cpp");
    const rejectedTests: number[] = [];
    try {
      for (const [i, input] of inputs.entries()) {
        const ex = await gj.execute(wrong, input, { ...measure, cpuMs: limitsMs.cpp });
        if (ex.status !== "ok") continue; // only judge outputs the checker actually sees
        const c = await runChecker(gj, p.checker, input, ex.stdout, answers[i]!);
        if (c === "error") throw new ValidationError(`checker.py crashed on wrong.cpp's output for test ${i + 1}`);
        if (c === "fail") rejectedTests.push(i + 1);
      }
    } finally {
      await gj.release(wrong);
    }
    if (!rejectedTests.length) throw new ValidationError("checker.py accepted wrong.cpp on every test — the checker can't say no");
    log.info(`checker rejected wrong.cpp on tests ${rejectedTests.join(", ")}`);
    checker = { rejectedTests };
  }

  // store
  const tests: StoredTest[] = inputs.map((input, i) => ({ input, answer: answers[i]! }));
  const testsHash = await writeTests(DATA_DIR, p.slug, tests);
  const record: ValidationRecord = {
    formatVersion: 1,
    validatedAt: new Date().toISOString(),
    machine: await machineInfo(gj),
    sourceHash: p.sourceHash,
    testsHash,
    testCount: tests.length,
    limitsMs,
    refSlowestMs: slowest,
    naive: { tleTests, slowestFinishedMs: Math.round(slowestFinishedMs) },
    ...(checker && { checker }),
  };
  await writeFile(path.join(p.dir, "validation.json"), `${JSON.stringify(record, null, 2)}\n`);
  return record;
}

async function generate(gj: GoJudge, p: ProblemFolder, i: number): Promise<string> {
  const ex = await gj.python(p.gen, [String(i)], { cpuMs: 30_000, memoryMb: 1024, outputMb: 64 });
  if (ex.status !== "ok") throw new ValidationError(`gen.py ${i} failed: ${ex.status}${ex.detail ? ` ${ex.detail}` : ""}\n${ex.stderr.slice(0, 2000)}`);
  if (!ex.stdout.trim()) throw new ValidationError(`gen.py ${i} printed nothing`);
  return ex.stdout.endsWith("\n") ? ex.stdout : `${ex.stdout}\n`;
}

async function compileOrFail(gj: GoJudge, lang: Lang, code: string, what: string): Promise<Program> {
  const c = await gj.compile(lang, code);
  if (!c.ok) throw new ValidationError(`${what} does not compile:\n${c.log.slice(0, 4000)}`);
  return c.program;
}

async function expectCorrect(gj: GoJudge, p: ProblemFolder, who: string, i: number, input: string, output: string, answer: string) {
  if (p.checker) {
    const c = await runChecker(gj, p.checker, input, output, answer);
    if (c !== "pass") throw new ValidationError(`checker.py ${c === "fail" ? "rejected" : "crashed on"} ${who}'s output for test ${i + 1}`);
  } else if (normalizeOutput(output) !== normalizeOutput(answer)) {
    throw new ValidationError(
      `${who} disagrees with ref.cpp on test ${i + 1} — either a solution is wrong, or the answer isn't unique and the problem needs a checker.py\n` +
        `  ref.cpp: ${preview(answer)}\n  ${who}: ${preview(output)}`,
    );
  }
}

async function machineInfo(gj: GoJudge): Promise<string> {
  const script = `import os\nm=[l.split(":",1)[1].strip() for l in open("/proc/cpuinfo") if l.startswith("model name")]\nprint(f"{m[0] if m else 'unknown cpu'} x{os.cpu_count()}")`;
  const ex = await gj.python(script, []);
  return ex.status === "ok" ? `${ex.stdout.trim()} via ${gj.url}` : `unknown via ${gj.url}`;
}

const fmt = (t: TimeLimits) => LANGS.map((l) => `${l}=${t[l]}`).join("  ");
const preview = (s: string) => JSON.stringify(s.length > 200 ? `${s.slice(0, 200)}…` : s);
