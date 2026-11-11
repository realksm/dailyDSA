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
}

export function CodeEditor({ lang, value, onChange, onRun, onSubmit, readOnly, height = "100%" }: Props) {
  const dark = useDark();
  // Keybindings are registered once; keep the latest callbacks in refs.
  const run = useRef(onRun);
  const submit = useRef(onSubmit);
  run.current = onRun;
  submit.current = onSubmit;

  const mount: OnMount = (ed, m) => {
    if (readOnly) return;
    // Monaco's addCommand keybindings are shared by every editor on the page (the last one
    // registered wins), so only the real editor registers them; read-only viewers stay out.
    ed.addCommand(m.KeyMod.CtrlCmd | m.KeyCode.Enter, () => run.current?.());
    ed.addCommand(m.KeyMod.CtrlCmd | m.KeyMod.Shift | m.KeyCode.Enter, () => submit.current?.());
    ed.focus();
  };

  return (
    <Editor
      height={height}
      language={MONACO_LANG[lang]}
      value={value}
      theme={dark ? "vs-dark" : "vs"}
      onChange={(v) => onChange(v ?? "")}
      onMount={mount}
      loading={<span className="muted small" style={{ padding: 16 }}>Loading editor…</span>}
      options={{
        readOnly,
        fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
        fontSize: 14,
        lineHeight: 21,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        tabSize: 4,
        detectIndentation: false,
        automaticLayout: true,
        renderLineHighlight: readOnly ? "none" : "line",
        // Read-only viewers sit inside a scrolling page: let the wheel scroll the page at their ends.
        scrollbar: { alwaysConsumeMouseWheel: !readOnly },
        padding: { top: 12, bottom: 12 },
        smoothScrolling: false,
        cursorBlinking: "solid",
        stickyScroll: { enabled: false },
        fixedOverflowWidgets: true,
      }}
    />
  );
}
