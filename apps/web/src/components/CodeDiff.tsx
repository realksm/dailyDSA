// Two versions of code side by side (inline on narrow screens), read-only: Monaco's diff editor with the
// same theme and font as the other editors. Load through LazyEditor's CodeDiff, never directly.
import { DiffEditor } from "@monaco-editor/react";
import { useEffect, useState } from "react";
import type { Lang } from "@dailydsa/shared";
import { DEFAULT_FONT, usePrefs } from "../prefs";
import { MONACO_LANG, useEditorTheme } from "./CodeEditor";

export function CodeDiff({ lang, before, after }: { lang: Lang; before: string; after: string }) {
  const font = useEditorTheme();
  const { prefs } = usePrefs();
  const size = (prefs.editorFontSize ?? DEFAULT_FONT) - 1;
  const [narrow, setNarrow] = useState(() => window.matchMedia("(max-width: 760px)").matches);
  useEffect(() => {
    const q = window.matchMedia("(max-width: 760px)");
    const on = () => setNarrow(q.matches);
    q.addEventListener("change", on);
    return () => q.removeEventListener("change", on);
  }, []);
  const lines = Math.max(before.split("\n").length, after.split("\n").length);
  return (
    <DiffEditor
      height={Math.min(720, Math.max(160, lines * Math.round(size * 1.5) + 48))}
      language={MONACO_LANG[lang]}
      original={before}
      modified={after}
      theme="dsa"
      loading={<span className="muted small" style={{ padding: 16 }}>Loading the comparison…</span>}
      options={{
        readOnly: true,
        originalEditable: false,
        domReadOnly: true,
        renderSideBySide: !narrow,
        fontFamily: font,
        fontSize: size,
        lineHeight: Math.round(size * 1.5),
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        renderLineHighlight: "none",
        renderOverviewRuler: false,
        wordWrap: "on",
        diffWordWrap: "on",
        scrollbar: { alwaysConsumeMouseWheel: false, horizontalScrollbarSize: 8 },
        padding: { top: 10, bottom: 10 },
      }}
    />
  );
}
