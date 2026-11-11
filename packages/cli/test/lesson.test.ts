// Track lessons in git: how they split into Markdown and code groups, what `dsa lesson check`
// demands, and what `dsa lesson import` writes (in a rolled-back transaction).
import type pg from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { createPool } from "@dailydsa/db";
import { editorTemplate, lessonParts, type InputSpec, type Lang } from "@dailydsa/shared";
import { checkLesson, importLesson, lessonOutline, type LadderSpec } from "../src/lesson.js";

const spec: InputSpec = { vars: [{ name: "n", type: "int" }, { name: "a", type: "long[]", length: "n" }], returns: "long" };
const ladder: LadderSpec[] = [{ slug: "budget-pairs", input: spec }];
const BODY: Record<Lang, string> = { cpp: "return 0;", java: "return 0;", py: "return 0" };
const block = (lang: Lang, s: InputSpec | null = spec) =>
  `\`\`\`${lang === "py" ? "python" : lang}\n${editorTemplate(lang, s ?? undefined, BODY[lang]).trimEnd()}\n\`\`\``;
const templateCode = (s: InputSpec | null = spec) => `${block("cpp", s)}\n\n${block("java", s)}\n\n${block("py", s)}`;
const lesson = (o: { template?: string; extra?: string } = {}) => `# Two pointers

## How to spot it

- Pairs in a sorted array.

## Core idea

Move two indices towards each other.
${o.extra ?? ""}
## Template code

${o.template ?? templateCode()}

## Common mistakes

- Off by one.
`;
const issues = (src: string, l = ladder) => {
  try {
    checkLesson("two-pointers", src, l);
    return "";
  } catch (e) {
    return (e as Error).message;
  }
};

describe("lessonParts", () => {
  it("groups C++/Java/Python blocks that follow each other and leaves other blocks in the Markdown", () => {
    const parts = lessonParts("Intro\n\n```cpp\nA\n```\n\n```python\nB\n```\n\nBetween\n\n```text\nC\n```\n\n```java\nD\n```\n");
    expect(parts).toEqual([
      { md: "Intro\n" },
      { code: [{ lang: "cpp", code: "A" }, { lang: "py", code: "B" }] },
      { md: "\nBetween\n\n```text\nC\n```\n" },
      { code: [{ lang: "java", code: "D" }] },
      { md: "\n" },
    ].filter((p) => !("md" in p) || p.md.trim()));
  });
});

describe("checkLesson", () => {
  it("accepts a full lesson and splits off the title", () => {
    const l = checkLesson("two-pointers", lesson(), ladder);
    expect(l.title).toBe("Two pointers");
    expect(l.body.startsWith("## How to spot it")).toBe(true);
  });

  it("allows any code outside Template code, and the generic template only if a ladder problem uses it", () => {
    expect(issues(lesson({ extra: "\n```cpp\nwhile (l < r) l++;\n```\n" }))).toBe("");
    expect(issues(lesson({ template: templateCode(null) }))).toContain("must follow the editor template");
    expect(issues(lesson({ template: templateCode(null) }), [{ slug: "x", input: undefined }])).toBe("");
  });

  it("needs a title line and the four sections in order", () => {
    expect(issues("## How to spot it\n")).toContain("the first line must be the title");
    expect(issues(lesson().replace("## Common mistakes", "## Pitfalls"))).toContain("missing the section `## Common mistakes`");
    const swapped = lesson().replace("## How to spot it", "## TMP").replace("## Core idea", "## How to spot it").replace("## TMP", "## Core idea");
    expect(issues(swapped)).toContain("in this order");
  });

  it("needs the template code in all three languages, each in the editor template", () => {
    expect(issues(lesson({ template: "Nothing here yet." }))).toContain("`## Template code` needs C++, Java and Python code blocks");
    expect(issues(lesson({ template: `${block("cpp")}\n\n${block("java")}` }))).toContain("needs exactly one Python 3 block (has 0)");
    const drifted = lesson({ template: templateCode().replace("int main() {", "int main(void) {") });
    expect(issues(drifted)).toContain("the C++17 code must follow the editor template of a ladder problem (start from `pnpm dsa template budget-pairs cpp`)");
  });

  it("the outline from `dsa lesson new` has every section but still needs template code", () => {
    const msg = issues(lessonOutline("Two pointers"));
    expect(msg).not.toContain("missing the section");
    expect(msg).toContain("`## Template code` needs");
  });
});

const pool = createPool();
const dbUp = await pool.query("SELECT 1 FROM tracks LIMIT 1").then(() => true, () => false);
afterAll(() => pool.end());

describe.skipIf(!dbUp)("importLesson", () => {
  it("creates the track if needed, and only touches it when the lesson changed", async () => {
    const db = await pool.connect();
    try {
      await db.query("BEGIN");
      await db.query("DELETE FROM track_weeks");
      await db.query("DELETE FROM track_problems");
      await db.query("DELETE FROM tracks");
      const p = db as unknown as pg.Pool;
      const l = checkLesson("two-pointers", lesson(), ladder);
      expect(await importLesson(p, l)).toBe("created");
      expect(await importLesson(p, l)).toBe("unchanged");
      expect(await importLesson(p, { ...l, body: `${l.body}\nMore.\n` })).toBe("updated");
      const r = await db.query("SELECT title, lesson_md FROM tracks WHERE pattern_slug = 'two-pointers'");
      expect(r.rows[0]).toEqual({ title: "Two pointers", lesson_md: `${l.body}\nMore.\n` });
      await expect(importLesson(p, { ...l, pattern: "no-such-pattern" })).rejects.toThrow('unknown pattern "no-such-pattern"');
    } finally {
      await db.query("ROLLBACK");
      db.release();
    }
  });
});
