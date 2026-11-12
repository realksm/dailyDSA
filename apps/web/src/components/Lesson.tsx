// A track lesson (PLAN §2; written in git as problems/_tracks/<pattern>.md). Markdown, where C++ /
// Java / Python code blocks that follow each other (only blank lines between them) become one block
// with a tab per language (lessonParts, shared with the CLI check), shown in a read-only editor like
// the Solutions tab. The tab starts on the language the solver last used in the editor.
import { useState, type ReactNode } from "react";
import { LANG_LABEL, LANGS, lessonParts, type Lang, type LadderStep } from "@dailydsa/shared";
import { fmtDay } from "../format";
import { Link } from "../router";
import { Icon } from "./Icon";
import { CodeEditor } from "./LazyEditor";
import { headingId, Markdown } from "./Markdown";
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

/** The lesson's `##` and `###` headings outside code, for its table of contents. */
export function lessonHeadings(md: string): { id: string; text: string; level: 2 | 3 }[] {
  const out: { id: string; text: string; level: 2 | 3 }[] = [];
  let fence = false;
  for (const line of md.replace(/\r\n/g, "\n").split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    const m = !fence && /^(##|###)\s+(.+?)\s*#*\s*$/.exec(line);
    if (m) out.push({ id: headingId(m[2]!), text: m[2]!, level: m[1]!.length as 2 | 3 });
  }
  return out;
}

/**
 * `ladder`: lets `[Ladder 3](#ladder-3)` in the Markdown link to that ladder problem ("Ladder 3 ·
 * Title") while it's open, or say when it opens while it's locked.
 */
export function Lesson({ md, ladder }: { md: string; ladder?: LadderStep[] }) {
  const link = (href: string): ReactNode | undefined => {
    const m = /^#ladder-(\d+)$/.exec(href);
    if (!m || !ladder) return undefined;
    const s = ladder.find((x) => x.position === Number(m[1]));
    if (!s) return <span className="lesson-rung" data-locked>Ladder {m[1]}</span>;
    if (s.problem) {
      return (
        <Link to={`/p/${s.problem.slug}`} className="lesson-rung" data-locked={!s.open || undefined}>
          Ladder {s.position} · {s.problem.title}
        </Link>
      );
    }
    return (
      <span className="lesson-rung" data-locked title={s.opensOn ? `Opens ${fmtDay(s.opensOn)}` : "Locked"}>
        <Icon name="lock" />Ladder {s.position}{s.opensOn ? ` (opens ${fmtDay(s.opensOn)})` : ""}
      </span>
    );
  };
  return (
    <div className="lesson">
      {lessonParts(md).map((p, i) => ("md" in p ? <Markdown key={i} link={link} headingIds>{p.md}</Markdown> : <CodeTabs key={i} blocks={p.code} />))}
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
