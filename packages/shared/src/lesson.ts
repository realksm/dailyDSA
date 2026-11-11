// Track lessons (PLAN §2). A lesson is Markdown in git (problems/_tracks/<pattern>.md); the CLI
// checks and imports it, the site renders it. Both split it the same way, with lessonParts().
import type { Lang } from "./lang.js";

/** The `## ` sections every lesson has, in this order. The ladder (section 5) is drawn by the site. */
export const LESSON_SECTIONS = ["How to spot it", "Core idea", "Template code", "Common mistakes"] as const;

const FENCE_LANG: Record<string, Lang> = { cpp: "cpp", "c++": "cpp", java: "java", py: "py", python: "py" };

export type LessonPart = { md: string } | { code: { lang: Lang; code: string }[] };

/**
 * Splits a lesson into Markdown and code groups: C++ / Java / Python code blocks with only blank
 * lines between them form one group, which the site shows as one block with a tab per language.
 * Any other code block stays in the Markdown. An unclosed fence runs to the end (like Markdown).
 */
export function lessonParts(src: string): LessonPart[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const parts: LessonPart[] = [];
  let md: string[] = [];
  let group: { lang: Lang; code: string }[] = [];
  let gap: string[] = []; // blank lines after a code block, kept if the group ends there
  const flushGroup = () => {
    if (group.length) parts.push({ code: group });
    group = [];
    md.push(...gap);
    gap = [];
  };
  const flushMd = () => {
    if (md.join("\n").trim()) parts.push({ md: md.join("\n") });
    md = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const open = /^ {0,3}(`{3,}|~{3,})\s*([^\s`]*)/.exec(line);
    if (open) {
      const fence = open[1]!;
      const lang = FENCE_LANG[open[2]!.toLowerCase()];
      const close = new RegExp(`^ {0,3}${fence[0] === "`" ? "`" : "~"}{${fence.length},}\\s*$`);
      let j = i + 1;
      while (j < lines.length && !close.test(lines[j]!)) j++;
      if (lang) {
        if (!group.length) flushMd();
        gap = [];
        group.push({ lang, code: lines.slice(i + 1, j).join("\n") });
      } else {
        flushGroup();
        md.push(...lines.slice(i, j + 1));
      }
      i = j;
      continue;
    }
    if (group.length && line.trim() === "") {
      gap.push(line);
      continue;
    }
    flushGroup();
    md.push(line);
  }
  flushGroup();
  flushMd();
  return parts;
}
