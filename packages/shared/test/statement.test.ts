import { describe, expect, it } from "vitest";
import { statementHook } from "../src/statement.js";

describe("statementHook", () => {
  it("takes the first sentence, not stopping inside maths", () => {
    expect(statementHook("A lab logs $n$ readings $a_1, \ldots, a_n$. During calibration, more.\n\n## Input")).toBe(
      "A lab logs $n$ readings $a_1, \ldots, a_n$.",
    );
    expect(statementHook("Costs $1.5$ rupees each. Then")).toBe("Costs $1.5$ rupees each.");
    expect(statementHook("Who wins? Nobody knows.")).toBe("Who wins?");
  });
  it("joins wrapped lines and keeps a paragraph with no full stop", () => {
    expect(statementHook("One line\nwrapped here\n\nNext")).toBe("One line wrapped here");
  });
  it("has no hook for a heading, list or empty statement", () => {
    expect(statementHook("")).toBeNull();
    expect(statementHook("## Input\n\nx")).toBeNull();
    expect(statementHook("- a\n- b")).toBeNull();
  });
  it("cuts a very long sentence at a word outside maths", () => {
    const long = `${"word ".repeat(60)}$x + y$ end.`;
    const h = statementHook(long, 100)!;
    expect(h.endsWith("…")).toBe(true);
    expect(h.length).toBeLessThanOrEqual(101);
  });
});
