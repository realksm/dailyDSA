// A track lesson (PLAN §2; written in git as problems/_tracks/<pattern>.md). Markdown, where C++ /
// Java / Python code blocks that follow each other (only blank lines between them) become one block
// with a tab per language (lessonParts, shared with the CLI check), shown in a read-only editor like
// the Solutions tab. The tab starts on the language the solver last used in the editor.
import { useState } from "react";
import { LANG_LABEL, LANGS, lessonParts, type Lang } from "@dailydsa/shared";
import { CodeEditor } from "./LazyEditor";
import { Markdown } from "./Markdown";
import { CopyButton } from "./ui";
import { TabInk } from "./TabInk";

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
  return (
    <div className="code-tabs">
      <div className="code-tabs-head">
        {blocks.length > 1 ? (
          <div className="tabs" role="tablist" aria-label="Language">
            {blocks.map((x, i) => (
              <button key={i} role="tab" aria-selected={i === pick} onClick={() => setPick(i)}>{LANG_LABEL[x.lang]}</button>
            ))}
            <TabInk />
          </div>
        ) : (
          <span className="badge">{LANG_LABEL[b.lang]}</span>
        )}
        <span className="grow" />
        <CopyButton text={b.code} />
      </div>
      <CodeEditor key={pick} lang={b.lang} value={b.code} onChange={() => {}} readOnly autoHeight />
    </div>
  );
}
