import { describe, expect, it } from "vitest";
import { describeDiff, firstDiff, outputLines, tokenSpan } from "../src/diff";

describe("firstDiff", () => {
  it("treats outputs the judge accepts as equal", () => {
    expect(firstDiff("1 2\r\n3  \n\n\n", "1 2\n3")).toBeNull();
    expect(firstDiff("", "")).toBeNull();
  });

  it("finds the first differing value on the first differing line", () => {
    const d = firstDiff("1\n2\n3 4 5\n9", "1\n2\n3 7 5\n9");
    expect(d).toEqual({ kind: "line", line: 2, token: 1, yours: "4", expected: "7" });
    expect(describeDiff(d!, 4, 4)).toBe("Line 3, value 2: you printed 4, expected 7.");
  });

  it("tells short and long lines apart", () => {
    expect(firstDiff("1 2", "1 2 3")).toEqual({ kind: "line", line: 0, token: 2, yours: undefined, expected: "3" });
    expect(firstDiff("1 2 3", "1 2")).toEqual({ kind: "line", line: 0, token: 2, yours: "3", expected: undefined });
  });

  it("spots spacing-only differences inside a line", () => {
    const d = firstDiff("1  2", "1 2");
    expect(d).toEqual({ kind: "line", line: 0 });
    expect(describeDiff(d!, 1, 1)).toMatch(/spaced differently/);
  });

  it("reports missing and extra lines", () => {
    expect(firstDiff("1\n2", "1\n2\n3\n4")).toEqual({ kind: "missing", line: 2 });
    expect(describeDiff({ kind: "missing", line: 2 }, 2, 4)).toBe("Your output stops after line 2; expected 4 lines.");
    expect(describeDiff({ kind: "missing", line: 0 }, 0, 1)).toBe("No output. Expected 1 line.");
    expect(firstDiff("1\n2\n3", "1")).toEqual({ kind: "extra", line: 1 });
    expect(describeDiff({ kind: "extra", line: 1 }, 3, 1)).toBe("2 lines too many: expected 1 line, you printed 3.");
  });

  it("doesn't blame the judge's clip marker", () => {
    const clip = "\n… (500 more characters)";
    expect(firstDiff(`1\n2${clip}`, `1\n2\n3`)).toEqual({ kind: "clipped", line: 2 });
    expect(firstDiff(`1\n2${clip}`, `1\n2${clip.replace("500", "800")}`)).toEqual({ kind: "clipped", line: 2 });
    expect(firstDiff(`1\n5${clip}`, `1\n2\n3`)).toMatchObject({ kind: "line", line: 1 });
  });

  it("shortens long values in the sentence", () => {
    const long = "x".repeat(40);
    expect(describeDiff({ kind: "line", line: 0, token: 0, yours: long, expected: "y" }, 1, 1)).toContain(`${"x".repeat(23)}…`);
  });
});

describe("helpers", () => {
  it("outputLines drops trailing blank lines", () => expect(outputLines("a\n\n")).toEqual(["a"]));
  it("tokenSpan finds the i-th value", () => {
    expect(tokenSpan("  10 200  3", 1)).toEqual([5, 8]);
    expect(tokenSpan("1 2", 5)).toBeNull();
  });
});
