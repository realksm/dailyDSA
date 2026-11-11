import { describe, expect, it } from "vitest";
import { editorTemplate, javaHasMainClass } from "../src/index.js";

describe("javaHasMainClass", () => {
  it("accepts a Main class, with or without public/final and helper classes around it", () => {
    expect(javaHasMainClass("public class Main { }")).toBe(true);
    expect(javaHasMainClass("class Helper {}\nfinal class Main{}")).toBe(true);
    expect(javaHasMainClass(editorTemplate("java"))).toBe(true);
  });

  it("rejects other names and a Main that only appears in a comment", () => {
    expect(javaHasMainClass("public class Solution { }")).toBe(false);
    expect(javaHasMainClass("class MainSolver { }")).toBe(false);
    expect(javaHasMainClass("// class Main\npublic class Solution {}")).toBe(false);
    expect(javaHasMainClass("/* class Main */ public class Solution {}")).toBe(false);
  });
});
