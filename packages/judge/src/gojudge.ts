// Thin client for go-judge's REST API (POST /run, DELETE /file/:id).
// Units on the wire: nanoseconds and bytes. Everything above this file uses ms / MB.
import type { Lang } from "@dailydsa/shared";

export const MB = 1024 * 1024;
const NS_PER_MS = 1_000_000;
const ENV = ["PATH=/usr/local/bin:/usr/bin:/bin", "HOME=/tmp", "LANG=C.UTF-8"];

type FileIn = { content: string } | { fileId: string };
type Collector = { name: string; max: number };

interface Cmd {
  args: string[];
  env?: string[];
  files: [FileIn, Collector, Collector];
  cpuLimit: number;
  clockLimit: number;
  memoryLimit: number;
  stackLimit?: number;
  procLimit: number;
  copyIn?: Record<string, FileIn>;
  copyOut?: string[];
  copyOutCached?: string[];
}

export interface RawResult {
  status: string; // "Accepted" | "Time Limit Exceeded" | "Nonzero Exit Status" | ...
  exitStatus: number;
  error?: string;
  time: number; // ns CPU
  runTime: number; // ns wall
  memory: number; // bytes
  files?: Record<string, string>;
  fileIds?: Record<string, string>;
}

export interface Limits {
  cpuMs: number;
  memoryMb: number;
  outputMb: number;
}

export interface Program {
  lang: Lang;
  copyIn: Record<string, FileIn>;
  /** Cached file ids to delete when the submission is done. */
  cached: string[];
}

export interface Execution {
  status: "ok" | "tle" | "mle" | "ole" | "re" | "internal";
  cpuMs: number;
  wallMs: number;
  memoryKb: number;
  stdout: string;
  stderr: string;
  detail?: string;
}

interface LangSpec {
  src: string;
  compile: string[] | null;
  artifact: string;
  run: (memoryMb: number) => string[];
  procLimit: number;
  /** Extra cgroup memory above the problem limit (JVM reserves address space outside the heap). */
  memoryHeadroomMb: number;
}

const LANG_SPEC: Record<Lang, LangSpec> = {
  cpp: {
    src: "main.cpp",
    compile: ["/usr/bin/g++", "-O2", "-std=c++17", "-pipe", "-o", "main", "main.cpp"],
    artifact: "main",
    run: () => ["./main"],
    procLimit: 1,
    memoryHeadroomMb: 0,
  },
  java: {
    src: "Main.java",
    // A jar keeps multi-class solutions as one cached file.
    compile: ["/bin/sh", "-c", "javac -J-Xshare:auto -encoding UTF-8 -d out Main.java && jar cfe main.jar Main -C out ."],
    artifact: "main.jar",
    run: (memoryMb) => [
      "/usr/bin/java", "-XX:+UseSerialGC", "-XX:TieredStopAtLevel=1", "-Xshare:auto",
      `-Xmx${Math.floor(memoryMb * 0.8)}m`, "-Xss64m", "-jar", "main.jar",
    ],
    procLimit: 64,
    memoryHeadroomMb: 128,
  },
  py: {
    src: "main.py",
    compile: null,
    artifact: "main.py",
    run: () => ["/usr/bin/python3", "-S", "main.py"],
    procLimit: 1,
    memoryHeadroomMb: 0,
  },
};

/** go-judge didn't answer at all (down, restarting, hung) — not the submission's fault. */
export class JudgeUnavailableError extends Error {
  override name = "JudgeUnavailableError";
}

const COMPILE_LIMITS ={ cpuMs: 15_000, memoryMb: 1024, outputMb: 1 };

export class GoJudge {
  constructor(readonly url: string = process.env.JUDGE_URL ?? "http://127.0.0.1:5050") {}

  async run(cmd: Cmd): Promise<RawResult> {
    const res = await this.fetch("/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cmd: [{ env: ENV, ...cmd }] }),
    });
    if (!res.ok) throw new Error(`go-judge ${res.status}: ${await res.text()}`);
    const [r] = (await res.json()) as RawResult[];
    if (!r) throw new Error("go-judge returned no result");
    return r;
  }

  async deleteFile(id: string): Promise<void> {
    await this.fetch(`/file/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  /** Network failures and hangs become JudgeUnavailableError, so the queue can wait and retry. */
  private async fetch(pathname: string, init: RequestInit): Promise<Response> {
    try {
      // Every command has its own wall-clock limit (≤ ~45 s); this only catches a stuck go-judge.
      return await fetch(`${this.url}${pathname}`, { ...init, signal: AbortSignal.timeout(120_000) });
    } catch (e) {
      throw new JudgeUnavailableError(`go-judge unreachable at ${this.url}: ${(e as Error).message}`, { cause: e });
    }
  }

  async release(prog: Program): Promise<void> {
    await Promise.all(prog.cached.map((id) => this.deleteFile(id)));
  }

  /** Step 1 of the pipeline: compile once and cache the binary inside go-judge. */
  async compile(lang: Lang, code: string): Promise<{ ok: true; program: Program } | { ok: false; log: string }> {
    const spec = LANG_SPEC[lang];
    if (!spec.compile) return { ok: true, program: { lang, copyIn: { [spec.artifact]: { content: code } }, cached: [] } };
    const r = await this.run({
      args: spec.compile,
      files: [{ content: "" }, { name: "stdout", max: 64 * 1024 }, { name: "stderr", max: 64 * 1024 }],
      cpuLimit: COMPILE_LIMITS.cpuMs * NS_PER_MS,
      clockLimit: COMPILE_LIMITS.cpuMs * 2 * NS_PER_MS,
      memoryLimit: COMPILE_LIMITS.memoryMb * MB,
      procLimit: 64,
      copyIn: { [spec.src]: { content: code } },
      copyOut: ["stdout", "stderr"],
      copyOutCached: [spec.artifact],
    });
    const id = r.fileIds?.[spec.artifact];
    if (r.status !== "Accepted" || !id) {
      if (id) await this.deleteFile(id);
      const log = [r.files?.stdout, r.files?.stderr, r.status !== "Accepted" && r.status !== "Nonzero Exit Status" ? r.status : ""]
        .filter(Boolean).join("\n");
      return { ok: false, log: log || r.error || r.status };
    }
    return { ok: true, program: { lang, copyIn: { [spec.artifact]: { fileId: id } }, cached: [id] } };
  }

  /** Step 2: one fresh process per test. */
  async execute(prog: Program, input: string, limits: Limits): Promise<Execution> {
    const spec = LANG_SPEC[prog.lang];
    const r = await this.run({
      args: spec.run(limits.memoryMb),
      files: [{ content: input }, { name: "stdout", max: limits.outputMb * MB }, { name: "stderr", max: 64 * 1024 }],
      cpuLimit: limits.cpuMs * NS_PER_MS,
      clockLimit: Math.max(limits.cpuMs * 3, 2000) * NS_PER_MS,
      memoryLimit: (limits.memoryMb + spec.memoryHeadroomMb) * MB,
      stackLimit: limits.memoryMb * MB,
      procLimit: spec.procLimit,
      copyIn: prog.copyIn,
      copyOut: ["stdout", "stderr"],
    });
    return toExecution(prog.lang, r, limits);
  }

  /**
   * Run a trusted helper Python script (generator, checker) in the sandbox.
   * Extra files are placed next to it in the working directory.
   */
  async python(
    script: string,
    args: string[],
    opts: { stdin?: string; files?: Record<string, string>; cpuMs?: number; memoryMb?: number; outputMb?: number } = {},
  ): Promise<Execution> {
    const limits = { cpuMs: opts.cpuMs ?? 10_000, memoryMb: opts.memoryMb ?? 1024, outputMb: opts.outputMb ?? 64 };
    const copyIn: Record<string, FileIn> = { "script.py": { content: script } };
    for (const [name, content] of Object.entries(opts.files ?? {})) copyIn[name] = { content };
    const r = await this.run({
      args: ["/usr/bin/python3", "-S", "script.py", ...args],
      files: [{ content: opts.stdin ?? "" }, { name: "stdout", max: limits.outputMb * MB }, { name: "stderr", max: 64 * 1024 }],
      cpuLimit: limits.cpuMs * NS_PER_MS,
      clockLimit: limits.cpuMs * 2 * NS_PER_MS,
      memoryLimit: limits.memoryMb * MB,
      procLimit: 1,
      copyIn,
      copyOut: ["stdout", "stderr"],
    });
    return toExecution("py", r, limits);
  }
}

function toExecution(lang: Lang, r: RawResult, limits: Limits): Execution {
  const stdout = r.files?.stdout ?? "";
  const stderr = r.files?.stderr ?? "";
  const base = { cpuMs: r.time / NS_PER_MS, wallMs: r.runTime / NS_PER_MS, memoryKb: Math.round(r.memory / 1024), stdout, stderr };
  // go-judge truncates stdout at `max`; the program then usually dies on the closed pipe,
  // so "output reached the cap" must win over a runtime error.
  if (Buffer.byteLength(stdout) >= limits.outputMb * MB || r.status === "Output Limit Exceeded") return { ...base, status: "ole" };
  // The JVM hits -Xmx before the cgroup limit and exits cleanly with OutOfMemoryError.
  if (lang === "java" && r.status !== "Accepted" && /java\.lang\.OutOfMemoryError/.test(stderr)) return { ...base, status: "mle" };
  switch (r.status) {
    case "Accepted": return { ...base, status: "ok" };
    case "Time Limit Exceeded": return { ...base, status: "tle" };
    case "Memory Limit Exceeded": return { ...base, status: "mle" };
    case "Nonzero Exit Status":
    case "Signalled": return { ...base, status: "re", detail: `${r.status} (${r.exitStatus})` };
    default: return { ...base, status: "internal", detail: r.error ?? r.status };
  }
}
