import { describe, expect, it } from "vitest";
import { editorTemplate, type InputSpec } from "../src/index.js";

const spec: InputSpec = {
  vars: [
    { name: "n", type: "int" },
    { name: "budget", type: "long" },
    { name: "price", type: "long[]", length: "n" },
  ],
  returns: "long",
};

describe("editorTemplate", () => {
  it("writes typed solve() signatures", () => {
    expect(editorTemplate("cpp", spec)).toContain("long long solve(int n, long long budget, vector<long long>& price) {");
    expect(editorTemplate("java", spec)).toContain("static long solve(int n, long budget, long[] price) {");
    expect(editorTemplate("py", spec)).toContain("def solve(n: int, budget: int, price: list[int]) -> int:");
  });

  it("compiles out of the box: the default body returns a value", () => {
    expect(editorTemplate("cpp", spec)).toMatch(/\/\/ your code here\n {4}return 0;/);
    expect(editorTemplate("py", { ...spec, returns: "void" })).toMatch(/# your code here — print the answer\n {4}pass/);
  });

  it("indents a supplied body", () => {
    expect(editorTemplate("py", spec, "x = 1\nreturn x")).toContain("    x = 1\n    return x\n");
  });

  it("loops over test cases with multi", () => {
    const m = { ...spec, multi: true };
    expect(editorTemplate("cpp", m)).toContain("while (_t--) {");
    expect(editorTemplate("java", m)).toContain("while (_t-- > 0) {");
    expect(editorTemplate("py", m)).toContain("for _ in range(int(next(_it))):");
  });

  it("prints bools as YES/NO and joins arrays as asked", () => {
    expect(editorTemplate("java", { ...spec, returns: "bool" })).toContain('? "YES" : "NO"');
    expect(editorTemplate("py", { ...spec, returns: "int[]" })).toContain("_out.extend(map(str, solve(n, budget, price)))");
    expect(editorTemplate("py", { ...spec, returns: "int[]", join: "spaces" })).toContain('_out.append(" ".join(map(str,');
  });

  it("falls back to a generic fast-reader template", () => {
    expect(editorTemplate("java")).toContain("FastReader in = new FastReader(System.in);");
    expect(editorTemplate("cpp")).not.toContain("solve(");
  });
});
