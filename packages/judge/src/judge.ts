import type { JudgeResult, Lang, TestResult, Verdict } from "@dailydsa/shared";
import { GoJudge, type Execution, type Limits } from "./gojudge.js";

export interface JudgeTest {
  input: string;
  /** Reference output. Absent for custom input on Run (no verdict beyond RE/TLE/...). */
  answer?: string;
  /** Visible to the solver (sample or custom). Hidden tests only reveal input when they are the first failure. */
  visible: boolean;
}

export interface JudgeRequest {
  lang: Lang;
  code: string;
  tests: JudgeTest[];
  limits: Limits;
  /** Python checker source (PLAN §6). Absent = trailing-whitespace-insensitive comparison. */
  checker?: string;
  /** Stop at the first failing test (Submit). Run evaluates every test so samples all show. */
  stopOnFailure: boolean;
}

/** Ignore trailing whitespace on every line and trailing blank lines; normalise CRLF. */
export function normalizeOutput(s: string): string {
  return s.replace(/\r\n?/g, "\n").split("\n").map((l) => l.trimEnd()).join("\n").replace(/\n+$/, "");
}

export type CheckOutcome = "pass" | "fail" | "error";

/** Checker contract: `python3 checker.py input.txt output.txt answer.txt`, exit 0 = pass, 1 = fail, else checker error. */
export async function runChecker(gj: GoJudge, checker: string, input: string, output: string, answer: string): Promise<CheckOutcome> {
  const r = await gj.python(checker, ["input.txt", "output.txt", "answer.txt"], {
    files: { "input.txt": input, "output.txt": output, "answer.txt": answer },
    cpuMs: 10_000,
    memoryMb: 1024,
    outputMb: 1,
  });
  if (r.status === "ok") return "pass";
  if (r.status === "re" && r.detail?.includes("(1)")) return "fail";
  return "error";
}

const EXEC_VERDICT: Record<Exclude<Execution["status"], "ok">, Verdict> = {
  tle: "TLE", mle: "MLE", ole: "OLE", re: "RE", internal: "IE",
};

export async function judge(gj: GoJudge, req: JudgeRequest): Promise<JudgeResult> {
  const compiled = await gj.compile(req.lang, req.code);
  if (!compiled.ok) return { verdict: "CE", compileLog: compiled.log, tests: [], maxCpuMs: 0, maxMemoryKb: 0 };
  const prog = compiled.program;
  const tests: TestResult[] = [];
  let overall: Verdict = "AC";
  try {
    for (const [index, t] of req.tests.entries()) {
      const ex = await gj.execute(prog, t.input, req.limits);
      let verdict: Verdict = ex.status === "ok" ? "AC" : EXEC_VERDICT[ex.status];
      if (verdict === "AC" && t.answer !== undefined) {
        if (req.checker) {
          const c = await runChecker(gj, req.checker, t.input, ex.stdout, t.answer);
          verdict = c === "pass" ? "AC" : c === "fail" ? "WA" : "IE";
        } else if (normalizeOutput(ex.stdout) !== normalizeOutput(t.answer)) {
          verdict = "WA";
        }
      }
      const firstFailure = verdict !== "AC" && overall === "AC";
      const reveal = t.visible || firstFailure;
      tests.push({
        index,
        verdict,
        cpuMs: Math.round(ex.cpuMs),
        memoryKb: ex.memoryKb,
        ...(reveal && {
          input: clip(t.input),
          output: clip(ex.stdout),
          ...(t.answer !== undefined && { expected: clip(t.answer) }),
          stderr: clip(ex.stderr, 8 * 1024),
        }),
      });
      if (firstFailure) overall = verdict;
      if (verdict !== "AC" && req.stopOnFailure) break;
    }
  } finally {
    await gj.release(prog); // step 3: drop the cached binary
  }
  return {
    verdict: overall,
    tests,
    maxCpuMs: Math.max(0, ...tests.map((t) => t.cpuMs)),
    maxMemoryKb: Math.max(0, ...tests.map((t) => t.memoryKb)),
  };
}

/** Keep stored/returned blobs bounded; a hidden test's input can be many MB. */
function clip(s: string, max = 64 * 1024): string {
  return s.length <= max ? s : `${s.slice(0, max)}\n… (${s.length - max} more characters)`;
}
