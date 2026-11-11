// One Run/Submit: its code and full result. Polls while it's still being judged.
import { useEffect } from "react";
import { LANG_LABEL } from "@dailydsa/shared";
import { api } from "../api";
import { fmtStamp } from "../format";
import { CodeEditor } from "../components/LazyEditor";
import { ResultView } from "../components/Result";
import { CopyButton, LoadError, SkeletonRows, useLoad, useTitle } from "../components/ui";
import { Link } from "../router";

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
          </div>
          <section className="card card-pad">
            <ResultView sub={v} />
          </section>
          <section className="card" style={{ overflow: "hidden" }}>
            <div className="row between" style={{ padding: "10px 16px", borderBottom: "1px solid var(--line)" }}>
              <h2 style={{ fontSize: 15 }}>Code</h2>
              <CopyButton text={v.code} label="Copy code" />
            </div>
            <CodeEditor lang={v.lang} value={v.code} onChange={() => {}} readOnly autoHeight />
          </section>
        </div>
      )}
    </main>
  );
}
