// One Run/Submit: its code and full result. Polls while it's still being judged. From here the code can
// go back into the editor, or be compared with the one sent just before it.
import { useEffect, useState } from "react";
import { LANG_LABEL, type SubmissionSummary, type SubmissionView } from "@dailydsa/shared";
import { api, errorMessage } from "../api";
import { fmtStamp } from "../format";
import { CodeDiff, CodeEditor } from "../components/LazyEditor";
import { ResultView } from "../components/Result";
import { useConfirm } from "../components/Confirm";
import { Icon } from "../components/Icon";
import { CopyButton, LoadError, Notice, SkeletonRows, useLoad, useTitle, VerdictBadge } from "../components/ui";
import { Link, useRouter } from "../router";
import { draftKey, store } from "../store";

export function SubmissionPage({ id }: { id: number }) {
  useTitle(`Submission ${id}`);
  const s = useLoad(() => api.submission(id), [id]);
  const pending = s.data && s.data.status !== "done";
  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(s.reload, 1000);
    return () => clearTimeout(t);
  }, [pending, s.data, s.reload]);

  if (s.error) return <main className="page"><LoadError error={s.error} retry={s.reload} /></main>;
  const v = s.data;
  return (
    <main className="page">
      {!v ? <SkeletonRows n={6} /> : (
        <div className="stack" style={{ gap: 24 }}>
          <div className="page-head" style={{ marginBottom: 0 }}>
            <div>
              <p className="small" style={{ marginTop: 0 }}><Link to="/history?tab=submissions">← Submissions</Link></p>
              <h1 style={{ marginTop: 8 }}>{v.kind === "run" ? "Run" : "Submission"} #{v.id}</h1>
              <p>
                <Link to={`/p/${v.problem.slug}`}>{v.problem.title}</Link> · {LANG_LABEL[v.lang]} · {fmtStamp(v.createdAt)}
              </p>
            </div>
            <LoadIntoEditor v={v} />
          </div>
          <section className="card card-pad">
            <ResultView sub={v} />
          </section>
          <CodeSection key={v.id} v={v} />
        </div>
      )}
    </main>
  );
}

/**
 * Opens the problem with this code in its language. The code becomes that language's local draft, so
 * an unsent draft that differs would be lost: ask first.
 */
function LoadIntoEditor({ v }: { v: SubmissionView }) {
  const ask = useConfirm();
  const { navigate } = useRouter();
  const go = async () => {
    const key = draftKey(v.problem.slug, v.lang);
    const draft = store.get(key);
    if (draft !== null && draft !== v.code) {
      const ok = await ask({
        title: "Replace your draft?",
        body: `You have unsent ${LANG_LABEL[v.lang]} code for ${v.problem.title} in this browser. It's replaced with the code of this ${v.kind === "run" ? "run" : "submission"}.`,
        confirmLabel: "Replace draft",
      });
      if (!ok) return;
    }
    store.set(key, v.code);
    navigate(`/p/${v.problem.slug}?lang=${v.lang}`);
  };
  return (
    <button type="button" className="btn" onClick={() => void go()}>
      <Icon name="code" />Load into editor
    </button>
  );
}

/** The code, or (on request) a diff against the previous Run/Submit of the same problem. */
function CodeSection({ v }: { v: SubmissionView }) {
  const [compare, setCompare] = useState(false);
  const [prev, setPrev] = useState<{ sum: SubmissionSummary; code: string } | null | undefined>(undefined); // null = none
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!compare || prev !== undefined) return;
    let live = true;
    (async () => {
      try {
        // The one sent just before this one (any language; a different language is still worth seeing).
        const list = await api.submissions({ problem: v.problem.slug, before: v.id, limit: 1 });
        const sum = list.submissions[0];
        if (!sum) return live && setPrev(null);
        const full = await api.submission(sum.id);
        if (live) setPrev({ sum, code: full.code });
      } catch (e) {
        if (live) setErr(errorMessage(e));
      }
    })();
    return () => { live = false; };
  }, [compare, prev, v.id, v.problem.slug]);

  return (
    <section className="card" style={{ overflow: "hidden" }}>
      <div className="row between row-wrap code-head" style={{ padding: "10px 16px", borderBottom: "1px solid var(--line)", gap: 8 }}>
        <h2 style={{ fontSize: 15 }}>{compare ? "Changes since the previous one" : "Code"}</h2>
        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="btn btn-sm" aria-pressed={compare} onClick={() => setCompare((c) => !c)}>
            <Icon name="compare" />{compare ? "Show code" : "Compare with previous"}
          </button>
          <CopyButton text={v.code} label="Copy code" />
        </div>
      </div>
      {!compare ? (
        <CodeEditor lang={v.lang} value={v.code} onChange={() => {}} readOnly autoHeight />
      ) : err ? (
        <div style={{ padding: 16 }}><Notice>{err}</Notice></div>
      ) : prev === undefined ? (
        <p className="muted small" style={{ padding: 16 }}>Loading the previous one…</p>
      ) : prev === null ? (
        <p className="muted small" style={{ padding: 16 }}>This is your first Run or Submit of {v.problem.title}: nothing earlier to compare with.</p>
      ) : (
        <>
          <div className="diff-legend small">
            <span>
              <span className="diff-old">Before</span>{" "}
              <Link to={`/submissions/${prev.sum.id}`}>{prev.sum.kind === "run" ? "Run" : "Submit"} #{prev.sum.id}</Link>
              {" · "}{LANG_LABEL[prev.sum.lang]} · {fmtStamp(prev.sum.createdAt)}
              {prev.sum.verdict && <> · <VerdictBadge verdict={prev.sum.verdict} /></>}
            </span>
            <span><span className="diff-new">After</span> #{v.id} (this one)</span>
          </div>
          {prev.code === v.code ? (
            <p className="muted small" style={{ padding: 16 }}>Same code as the previous one.</p>
          ) : (
            <CodeDiff lang={v.lang} before={prev.code} after={v.code} />
          )}
        </>
      )}
    </section>
  );
}
