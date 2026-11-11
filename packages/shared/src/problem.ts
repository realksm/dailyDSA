import type { Lang } from "./lang.js";

/** daily = the bank (weekday/weekend pools); track = a ladder problem, never picked as daily (PLAN §2). */
export const PROBLEM_KINDS = ["daily", "track"] as const;
export type ProblemKind = (typeof PROBLEM_KINDS)[number];

export const POOLS = ["weekday", "weekend"] as const;
export type Pool = (typeof POOLS)[number];

export const ROLES = ["admin", "setter", "solver"] as const;
export type Role = (typeof ROLES)[number];

/** The 8 starting patterns (PLAN §2). Slugs are stable ids; more are added via the patterns table. */
export const STARTING_PATTERNS = [
  { slug: "two-pointers", name: "Two pointers" },
  { slug: "sliding-window", name: "Sliding window" },
  { slug: "prefix-sums", name: "Prefix sums" },
  { slug: "binary-search-answer", name: "Binary search on the answer" },
  { slug: "monotonic-stack", name: "Monotonic stack" },
  { slug: "bfs-dfs", name: "BFS / DFS" },
  { slug: "dp-1d", name: "Simple 1D DP" },
  { slug: "heaps-top-k", name: "Heaps / top-k" },
] as const;

/**
 * Input description used to generate the editor template (PLAN §3): the template reads these
 * variables, in order, and calls solve(). Absent = generic template with a fast reader.
 */
export type InputVar =
  | { name: string; type: "int" | "long" | "string" }
  | { name: string; type: "int[]" | "long[]"; length: string } // length = name of an earlier int var
  | { name: string; type: "string[]"; length: string }
  | { name: string; type: "int[][]"; rows: string; cols: string | number };

export type ReturnType = "int" | "long" | "string" | "bool" | "int[]" | "long[]" | "void";

export interface InputSpec {
  vars: InputVar[];
  /** What solve() returns; the template prints it. "void" = solve() prints itself. */
  returns: ReturnType;
  /** How an array return is printed: one element per line (default) or space-separated on one line. */
  join?: "lines" | "spaces";
  /** Multiple test cases in one input: first line T, then T copies of vars. */
  multi?: boolean;
}

export type TimeLimits = Record<Lang, number>;
