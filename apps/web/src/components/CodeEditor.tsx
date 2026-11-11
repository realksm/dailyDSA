// Monaco, bundled locally (no CDN): only the editor worker is needed for C++/Java/Python.
import Editor, { loader, type OnMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor/editor/editor.main.js";
import EditorWorker from "monaco-editor/editor/editor.worker.js?worker";
import { useEffect, useRef, useState } from "react";
import type { Lang } from "@dailydsa/shared";

self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco });

const MONACO_LANG: Record<Lang, string> = { cpp: "cpp", java: "java", py: "python" };

function useDark() {
  const q = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  const [dark, setDark] = useState(() => !!q?.matches);
  useEffect(() => {
    if (!q) return;
    const on = () => setDark(q.matches);
    q.addEventListener("change", on);
    return () => q.removeEventListener("change", on);
  }, [q]);
  return dark;
}

interface Props {
  lang: Lang;
  value: string;
  onChange: (v: string) => void;
  /** Ctrl/Cmd+Enter and Ctrl/Cmd+Shift+Enter. */
  onRun?: () => void;
  onSubmit?: () => void;
  readOnly?: boolean;
  height?: string | number;
  /**
   * Read-only viewers inside a page (lessons, submissions, solutions): as tall as the code, no
   * vertical scrollbar, so the page scrolls instead of a box inside it.
   */
  autoHeight?: boolean;
}

/** Read-only viewers: smaller type and a narrow gutter, so code reads like a figure, not an IDE. */
const VIEW = { fontSize: 13, lineHeight: 20, pad: 10 };
const EDIT = { fontSize: 14, lineHeight: 21, pad: 12 };

export function CodeEditor({ lang, value, onChange, onRun, onSubmit, readOnly, height = "100%", autoHeight }: Props) {
  const dark = useDark();
  const m = readOnly ? VIEW : EDIT;
  const [fitH, setFitH] = useState(() => value.split("\n").length * m.lineHeight + 2 * m.pad);
  // Keybindings are registered once; keep the latest callbacks in refs.
  const run = useRef(onRun);
  const submit = useRef(onSubmit);
  run.current = onRun;
  submit.current = onSubmit;

  const mount: OnMount = (ed, mon) => {
    if (autoHeight) {
      // Content height includes a horizontal scrollbar when a line is too long.
      const fit = () => setFitH(ed.getContentHeight());
      ed.onDidContentSizeChange(fit);
      fit();
    }
    if (readOnly) return;
    // Monaco's addCommand keybindings are shared by every editor on the page (the last one
    // registered wins), so only the real editor registers them; read-only viewers stay out.
    ed.addCommand(mon.KeyMod.CtrlCmd | mon.KeyCode.Enter, () => run.current?.());
    ed.addCommand(mon.KeyMod.CtrlCmd | mon.KeyMod.Shift | mon.KeyCode.Enter, () => submit.current?.());
    ed.focus();
  };

  return (
    <Editor
      height={autoHeight ? fitH : height}
      language={MONACO_LANG[lang]}
      value={value}
      theme={dark ? "vs-dark" : "vs"}
      onChange={(v) => onChange(v ?? "")}
      onMount={mount}
      loading={<span className="muted small" style={{ padding: 16 }}>Loading editor…</span>}
      options={{
        readOnly,
        domReadOnly: readOnly,
        fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
        fontSize: m.fontSize,
        lineHeight: m.lineHeight,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        tabSize: 4,
        detectIndentation: false,
        automaticLayout: true,
        renderLineHighlight: readOnly ? "none" : "line",
        // Read-only viewers sit inside a scrolling page: let the wheel scroll the page.
        scrollbar: {
          alwaysConsumeMouseWheel: !readOnly,
          vertical: autoHeight ? "hidden" : "auto",
          horizontalScrollbarSize: 8,
        },
        padding: { top: m.pad, bottom: m.pad },
        smoothScrolling: false,
        cursorBlinking: "solid",
        stickyScroll: { enabled: false },
        fixedOverflowWidgets: true,
        ...(readOnly && {
          lineNumbersMinChars: 3,
          lineDecorationsWidth: 16,
          folding: false,
          glyphMargin: false,
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          occurrencesHighlight: "off" as const,
          selectionHighlight: false,
          matchBrackets: "never" as const,
          contextmenu: false,
        }),
      }}
    />
  );
}
