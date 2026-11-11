/** Per-test and overall verdicts. Order = severity when summarising a submission (first failing test wins). */
export const VERDICTS = ["AC", "WA", "TLE", "MLE", "OLE", "RE", "CE", "IE"] as const;
export type Verdict = (typeof VERDICTS)[number];

export const VERDICT_LABEL: Record<Verdict, string> = {
  AC: "Accepted",
  WA: "Wrong Answer",
  TLE: "Time Limit Exceeded",
  MLE: "Memory Limit Exceeded",
  OLE: "Output Limit Exceeded",
  RE: "Runtime Error",
  CE: "Compile Error",
  IE: "Internal Error", // judge/checker failure — never the solver's fault
};

export interface TestResult {
  index: number;
  verdict: Verdict;
  cpuMs: number;
  memoryKb: number;
  /** Only for sample tests, custom input, or the first failing hidden test (see PLAN §3). */
  input?: string;
  output?: string;
  expected?: string;
  stderr?: string;
  /** Run only: this test is the solver's custom input (no expected output, so AC = it ran cleanly). */
  custom?: boolean;
}

export interface JudgeResult {
  verdict: Verdict;
  compileLog?: string;
  tests: TestResult[];
  maxCpuMs: number;
  maxMemoryKb: number;
}
