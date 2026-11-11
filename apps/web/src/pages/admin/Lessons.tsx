// Admin → Tracks (admins and setters, PLAN §2): every track with its ladder, and the lesson editor
// (Markdown on the left, the lesson as solvers see it on the right). Problems come from git via the
// CLI; only the title and lesson are edited here. Weeks are scheduled on the Schedule tab.
import { useEffect, useRef, useState } from "react";
import { LANG_LABEL, LANGS, type StaffTrackDetail } from "@dailydsa/shared";
import { api, ApiErr, errorMessage } from "../../api";
import { fmtStamp } from "../../format";
import { Lesson } from "../../components/Lesson";
import { LoadError, Notice, SkeletonRows, useLoad } from "../../components/ui";
import { Link, useRouter } from "../../router";

/** The five lesson sections (PLAN §2); the ladder (section 5) is added by the track page itself. */
const OUTLINE = `## How to spot it

- Clue in the statement → why it points to this pattern

## Core idea

A few paragraphs.

### Worked example

## Template code

(Use "Insert template code" to add the editor template of a ladder problem in all three languages.)

## Common mistakes

- Off-by-one …
`;

export function TracksTab() {
  const { path } = useRouter();
  const pattern = path.split("/")[3];
  return pattern ? <LessonEditor key={pattern} pattern={decodeURIComponent(pattern)} /> : <TrackList />;
}

function TrackList() {
  const ts = useLoad(() => api.admin.tracks(), []);
  if (ts.error) return <LoadError error={ts.error} retry={ts.reload} />;
  if (!ts.data) return <SkeletonRows n={4} />;
  if (ts.data.length === 0) {
    return <div className="card empty"><h3>No tracks yet</h3><p>A track appears once its first ladder problem is imported with <code>pnpm dsa import</code>.</p></div>;
  }
  return (
    <div className="stack">
      <p className="muted small">Tracks appear when their ladder problems are imported. Write each lesson here; schedule weeks on the Schedule tab.</p>
      <div className="card table-wrap">
        <table className="table">
          <thead><tr><th>Track</th><th>Pattern</th><th className="r">Ladder</th><th>Lesson</th><th>Last edited</th><th /></tr></thead>
          <tbody>
            {ts.data.map((t) => (
              <tr key={t.id}>
                <td><Link to={`/tracks/${t.pattern.slug}`}>{t.title}</Link></td>
                <td className="small muted mono">{t.pattern.slug}</td>
                <td className="r num">{t.ladder}/5</td>
                <td>{t.hasLesson ? <span className="badge badge-ok">Written</span> : <span className="badge badge-warn">Missing</span>}</td>
                <td className="small muted nowrap">{fmtStamp(t.updatedAt)}</td>
                <td className="r"><Link to={`/admin/tracks/${t.pattern.slug}`} className="btn btn-sm">Edit lesson</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LessonEditor({ pattern }: { pattern: string }) {
  const t = useLoad(() => api.admin.track(pattern), [pattern]);
  if (t.error) return <LoadError error={t.error} retry={t.reload} />;
  if (!t.data) return <SkeletonRows n={8} />;
  return <Editor key={t.data.updatedAt} t={t.data} reload={t.reload} />;
}

function Editor({ t, reload }: { t: StaffTrackDetail; reload: () => void }) {
  const [saved, setSaved] = useState(t);
  const [title, setTitle] = useState(t.title);
  const [md, setMd] = useState(t.lessonMd);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ msg: string; stale: boolean } | null>(null);
  const [flash, setFlash] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const dirty = title.trim() !== saved.title || md !== saved.lessonMd;

  // Leaving with unsaved changes asks first (closing the tab or reloading).
  useEffect(() => {
    if (!dirty) return;
    const on = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", on);
    return () => window.removeEventListener("beforeunload", on);
  }, [dirty]);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await api.admin.updateTrack(saved.pattern.slug, { title: title.trim(), lessonMd: md, expectedUpdatedAt: saved.updatedAt });
      setSaved(next);
      setFlash(true);
      setTimeout(() => setFlash(false), 1500);
    } catch (e) {
      setError({ msg: errorMessage(e), stale: e instanceof ApiErr && e.code === "stale" });
    } finally {
      setBusy(false);
    }
  };

  /** Inserts text at the cursor (or the end) and keeps the cursor after it. */
  const insert = (text: string) => {
    const el = area.current;
    const at = el ? el.selectionStart : md.length;
    const before = md.slice(0, at);
    const pad = before && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : "";
    const next = before + pad + text + md.slice(el ? el.selectionEnd : md.length);
    setMd(next);
    requestAnimationFrame(() => {
      if (!el) return;
      const pos = (before + pad + text).length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };
  const insertTemplate = (slug: string) => {
    const p = saved.problems.find((x) => x.slug === slug);
    if (!p) return;
    const fence: Record<(typeof LANGS)[number], string> = { cpp: "cpp", java: "java", py: "python" };
    insert(LANGS.map((l) => `\`\`\`${fence[l]}\n${p.templates[l].trimEnd()}\n\`\`\``).join("\n\n") + "\n");
  };

  return (
    <div className="stack">
      <div className="row between">
        <Link to="/admin/tracks" className="small">← All tracks</Link>
        <span className="row" style={{ gap: 12 }}>
          <span className="muted small">Last saved {fmtStamp(saved.updatedAt)}</span>
          <Link to={`/tracks/${saved.pattern.slug}`} className="btn btn-sm">Open track page</Link>
        </span>
      </div>

      <div className="row" style={{ gap: 12, alignItems: "flex-end" }}>
        <label className="field grow">
          <span>Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
        </label>
        <button className="btn btn-primary" onClick={() => void save()} disabled={busy || !dirty || !title.trim()}>
          {busy ? "Saving…" : flash ? "Saved" : "Save"}
        </button>
      </div>

      {error && (
        <Notice>
          {error.msg}{" "}
          {error.stale && <button className="link-btn" onClick={() => { if (confirm("Discard your changes and load the saved version?")) reload(); }}>Load their version</button>}
        </Notice>
      )}

      <div className="row row-wrap" style={{ gap: 8 }}>
        {!md.trim() && <button className="btn btn-sm" onClick={() => setMd(OUTLINE)}>Start from the outline</button>}
        <label className="sr-only" htmlFor="tpl">Insert template code</label>
        <select id="tpl" value="" onChange={(e) => insertTemplate(e.target.value)} disabled={saved.problems.length === 0}>
          <option value="">Insert template code…</option>
          {saved.problems.map((p) => <option key={p.slug} value={p.slug}>Ladder {p.position}: {p.title}</option>)}
        </select>
        <span className="muted small">
          Markdown with KaTeX maths. {LANGS.map((l) => LANG_LABEL[l]).join(" / ")} code blocks next to each other become one block with a tab per language.
        </span>
      </div>

      <div className="lesson-edit">
        <label className="sr-only" htmlFor="lesson-md">Lesson Markdown</label>
        <textarea id="lesson-md" ref={area} value={md} onChange={(e) => setMd(e.target.value)} spellCheck={false} placeholder="Write the lesson in Markdown…" />
        <div className="lesson-preview" aria-label="Preview">
          <h1>{title || "Untitled"}</h1>
          {md.trim() ? <Lesson md={md} /> : <p className="muted">The preview appears here.</p>}
        </div>
      </div>
    </div>
  );
}
