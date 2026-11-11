// A track lesson (PLAN §2): Markdown, where C++ / Java / Python code blocks that follow each other
// (only blank lines between them) become one block with a tab per language, shown in a read-only
// editor like the Solutions tab. The tab starts on the language the solver last used in the editor.
import { useState } from "react";
import { LANG_LABEL, LANGS, type Lang } from "@dailydsa/shared";
import { CodeEditor } from "./LazyEditor";
import { Markdown } from "./Markdown";
import { CopyButton } from "./ui";

const FENCE_LANG: Record<string, Lang> = { cpp: "cpp", "c++": "cpp", java: "java", py: "py", python: "py" };

export type LessonPart = { md: string } | { code: { lang: Lang; code: string }[] };

/** Splits a lesson into Markdown and code groups. Exported for the admin preview. */
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
      let j = i + 1;
      const body: string[] = [];
      while (j < lines.length && !new RegExp(`^ {0,3}${fence[0] === "`" ? "`" : "~"}{${fence.length},}\\s*$`).test(lines[j]!)) body.push(lines[j++]!);
      if (lang) {
        if (!group.length) flushMd();
        gap = [];
        group.push({ lang, code: body.join("\n") });
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

function preferredLang(): Lang | null {
  try {
    const l = localStorage.getItem("dsa.lang");
    return (LANGS as readonly string[]).includes(l ?? "") ? (l as Lang) : null;
  } catch {
    return null;
  }
}

export function Lesson({ md }: { md: string }) {
  return (
    <div className="lesson">
      {lessonParts(md).map((p, i) => ("md" in p ? <Markdown key={i}>{p.md}</Markdown> : <CodeTabs key={i} blocks={p.code} />))}
    </div>
  );
}

function CodeTabs({ blocks }: { blocks: { lang: Lang; code: string }[] }) {
  const [pick, setPick] = useState(() => {
    const want = preferredLang();
    return Math.max(0, blocks.findIndex((b) => b.lang === want));
  });
  const b = blocks[Math.min(pick, blocks.length - 1)]!;
  const lines = b.code.split("\n").length;
  return (
    <div className="code-tabs">
      <div className="code-tabs-head">
        {blocks.length > 1 ? (
          <div className="tabs" role="tablist" aria-label="Language">
            {blocks.map((x, i) => (
              <button key={i} role="tab" aria-selected={i === pick} onClick={() => setPick(i)}>{LANG_LABEL[x.lang]}</button>
            ))}
          </div>
        ) : (
          <span className="badge">{LANG_LABEL[b.lang]}</span>
        )}
        <span className="grow" />
        <CopyButton text={b.code} />
      </div>
      <div style={{ height: Math.min(560, Math.max(80, lines * 21 + 24)) }}>
        <CodeEditor key={pick} lang={b.lang} value={b.code} onChange={() => {}} readOnly />
      </div>
    </div>
  );
}
