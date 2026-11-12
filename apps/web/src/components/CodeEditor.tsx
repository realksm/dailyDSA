// Monaco, bundled locally (no CDN): only the editor worker is needed for C++/Java/Python.
import Editor, { loader, type OnMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor/editor/editor.main.js";
import EditorWorker from "monaco-editor/editor/editor.worker.js?worker";
import { useEffect, useRef, useState } from "react";
import type { Lang } from "@dailydsa/shared";

self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco });

const MONACO_LANG: Record<Lang, string> = { cpp: "cpp", java: "java", py: "python" };

/**
 * One Monaco theme built from the page's CSS tokens, so the editor sits on the same surface and
 * uses the same mono font as the rest of the page. Rebuilt when the OS colour scheme changes.
 */
function useEditorTheme() {
  const build = () => {
    const css = getComputedStyle(document.documentElement);
    const v = (name: string) => css.getPropertyValue(name).trim();
    const dark = css.colorScheme.includes("dark");
    monaco.editor.defineTheme("dsa", {
      base: dark ? "vs-dark" : "vs",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": v("--surface"),
        "editor.foreground": v("--text"),
        "editorLineNumber.foreground": v("--line-strong"),
        "editorLineNumber.activeForeground": v("--text"),
        "editor.lineHighlightBackground": v("--sunk"),
        "editor.lineHighlightBorder": "#00000000",
        "editorCursor.foreground": v("--primary-text"),
        "editorGutter.background": v("--surface"),
        "editorWidget.background": v("--surface"),
        "editorIndentGuide.background1": v("--line"),
      },
    });
    return v("--mono") || "'IBM Plex Mono', ui-monospace, monospace";
  };
  const [font, setFont] = useState(build);
  useEffect(() => {
    const q = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => { setFont(build()); monaco.editor.setTheme("dsa"); };
    q.addEventListener("change", on);
    // A forced theme (html data-theme, which the CSS tokens honour) also recolours the editor.
    const mo = new MutationObserver(on);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => { q.removeEventListener("change", on); mo.disconnect(); };
  }, []);
  return font;
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
  /** Soft-wrap long lines. Defaults to on for read-only viewers, off for the real editor. */
  wordWrap?: boolean;
  /** Alt+Z in the real editor (the VS Code shortcut). */
  onToggleWrap?: () => void;
}

/** Read-only viewers: smaller type and a narrow gutter, so code reads like a figure, not an IDE. */
const VIEW = { fontSize: 13, lineHeight: 20, pad: 10 };
const EDIT = { fontSize: 14, lineHeight: 21, pad: 12 };

export function CodeEditor({ lang, value, onChange, onRun, onSubmit, readOnly, height = "100%", autoHeight, wordWrap = !!readOnly, onToggleWrap }: Props) {
  const font = useEditorTheme();
  const m = readOnly ? VIEW : EDIT;
  const [fitH, setFitH] = useState(() => value.split("\n").length * m.lineHeight + 2 * m.pad);
  // Keybindings are registered once; keep the latest callbacks in refs.
  const run = useRef(onRun);
  const submit = useRef(onSubmit);
  const toggleWrap = useRef(onToggleWrap);
  run.current = onRun;
  submit.current = onSubmit;
  toggleWrap.current = onToggleWrap;

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
    ed.addCommand(mon.KeyMod.Alt | mon.KeyCode.KeyZ, () => toggleWrap.current?.());
    ed.focus();
  };

  return (
    <Editor
      height={autoHeight ? fitH : height}
      language={MONACO_LANG[lang]}
      value={value}
      theme="dsa"
      onChange={(v) => onChange(v ?? "")}
      onMount={mount}
      loading={<span className="muted small" style={{ padding: 16 }}>Loading editor…</span>}
      options={{
        readOnly,
        domReadOnly: readOnly,
        fontFamily: font,
        fontSize: m.fontSize,
        lineHeight: m.lineHeight,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        tabSize: 4,
        wordWrap: wordWrap ? "on" : "off",
        // Wrapped lines keep their indent, so wrapped code still reads as the block it belongs to.
        wrappingIndent: "same",
        // Monaco's default breaks before "+" and "(", which splits "l++" and "solve(" in code; break after only.
        wordWrapBreakBeforeCharacters: "",
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
