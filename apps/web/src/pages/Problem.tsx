// The problem page: statement + samples (or the Solutions tab) on the left; editor, custom input and
// results on the right.
import { useCallback, useEffect, useRef, useState } from "react";
import { JAVA_MAIN_CLASS_MESSAGE, LANG_LABEL, LANGS, javaHasMainClass, type Lang, type ProblemView, type SubmissionKind, type SubmissionView } from "@dailydsa/shared";
import { api, ApiErr, errorMessage } from "../api";
import { fmtDay, fmtStamp } from "../format";
import { CodeEditor } from "../components/LazyEditor";
import { Markdown } from "../components/Markdown";
import { SolutionsPanel } from "../components/Solutions";
import { ResultView } from "../components/Result";
import { CopyButton, LoadError, Notice, Skeleton, StatusBadge, useLoad, useTitle, VerdictBadge } from "../components/ui";
import { Link } from "../router";

/** Matches the server's one Run/Submit per 5 s. */
const COOLDOWN_MS = 5000;
const POLL_MS = 1000;

// Browser storage is a convenience only (unsent drafts, last language); everything works without it.
const store = {
  get(k: string): string | null {
    try { return localStorage.getItem(k); } catch { return null; }
  },
  set(k: string, v: string | null) {
    try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* ignore */ }
  },
};
const draftKey = (slug: string, lang: Lang) => `dsa.draft.${slug}.${lang}`;

export function ProblemPage({ slug }: { slug: string }) {
  const view = useLoad(() => api.problem(slug), [slug]);
  useTitle(view.data?.title ?? "Problem");

  if (view.error) return <main className="page"><LoadError error={view.error} retry={view.reload} /></main>;
  if (!view.data) {
    return (
      <div className="solve">
        <div className="solve-left"><div className="solve-left-inner stack"><Skeleton h={30} w="60%" /><Skeleton h={18} w="40%" /><Skeleton h={220} /></div></div>
        <div className="solve-right"><div /><div className="editor-host" /><div /></div>
      </div>
    );
  }
  return <Solve p={view.data} refresh={view.reload} replace={(v) => view.setData(() => v)} />;
}

function Solve({ p, refresh, replace }: { p: ProblemView; refresh: () => void; replace: (v: ProblemView) => void }) {
  const [leftTab, setLeftTab] = useState<"statement" | "solutions">("statement");
  const [lang, setLangState] = useState<Lang>(() => {
    const l = store.get("dsa.lang");
    return (LANGS as readonly string[]).includes(l ?? "") ? (l as Lang) : "cpp";
  });
  // Per language: the local draft, else the last code sent, else the template.
  const [code, setCode] = useState<Record<Lang, string>>(() => {
    const out = {} as Record<Lang, string>;
    for (const l of LANGS) out[l] = store.get(draftKey(p.slug, l)) ?? p.lastCode?.[l] ?? p.templates[l];
    return out;
  });
  const [customInput, setCustomInput] = useState(() => p.samples[0]?.input ?? "");
  const [tab, setTab] = useState<"input" | "result">("input");
  const [sub, setSub] = useState<SubmissionView | null>(null);
  const [sending, setSending] = useState<SubmissionKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [, tick] = useState(0);
  const [justSolved, setJustSolved] = useState(false);

  const setLang = (l: Lang) => {
    setLangState(l);
    store.set("dsa.lang", l);
  };
  const edit = (v: string) => {
    setCode((c) => ({ ...c, [lang]: v }));
    store.set(draftKey(p.slug, lang), v === p.templates[lang] ? null : v);
  };
  const resetCode = () => {
    if (!confirm(`Replace your ${LANG_LABEL[lang]} code with the starting template?`)) return;
    setCode((c) => ({ ...c, [lang]: p.templates[lang] }));
    store.set(draftKey(p.slug, lang), null);
  };

  // Re-render once the cooldown ends so the buttons come back.
  useEffect(() => {
    const ms = cooldownUntil - Date.now();
    if (ms <= 0) return;
    const id = setTimeout(() => tick((n) => n + 1), ms + 20);
    return () => clearTimeout(id);
  }, [cooldownUntil]);

  // Poll the submission about once a second until it's done (PLAN §8).
  const subId = sub?.id;
  const subDone = sub?.status === "done";
  useEffect(() => {
    if (subId === undefined || subDone) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const v = await api.submission(subId);
        if (stop) return;
        setSub(v);
        if (v.status === "done") {
          if (v.kind === "submit") {
            if (v.verdict === "AC" && p.status !== "solved") setJustSolved(true);
            refresh(); // status, solved time, pattern reveal
          }
          return;
        }
      } catch (e) {
        if (stop) return;
        if (e instanceof ApiErr && e.status === 404) return setError("That submission disappeared.");
      }
      timer = setTimeout(poll, POLL_MS);
    };
    timer = setTimeout(poll, POLL_MS);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [subId, subDone, p.status, refresh]);

  const pending = sending !== null || (sub !== null && sub.status !== "done");
  const coolingDown = cooldownUntil > Date.now();

  const send = useCallback(
    async (kind: SubmissionKind) => {
      if (pending || coolingDown) return;
      const src = code[lang];
      setError(null);
      if (lang === "java" && !javaHasMainClass(src)) return setError(JAVA_MAIN_CLASS_MESSAGE);
      setSending(kind);
      try {
        const q = kind === "run" ? await api.run(p.slug, lang, src, customInput) : await api.submit(p.slug, lang, src);
        setCooldownUntil(Date.now() + COOLDOWN_MS);
        setJustSolved(false);
        setSub({
          id: q.id, problem: { slug: p.slug, title: p.title }, kind, lang, code: src, status: "queued",
          queuePosition: null, verdict: null, result: null, createdAt: new Date().toISOString(), finishedAt: null,
        });
        setTab("result");
      } catch (e) {
        if (e instanceof ApiErr && e.status === 429) setCooldownUntil(Date.now() + COOLDOWN_MS);
        setError(errorMessage(e));
      } finally {
        setSending(null);
      }
    },
    [pending, coolingDown, code, lang, customInput, p.slug, p.title],
  );

  const busyLabel = sending ? "Sending…" : pending ? (sub?.status === "running" ? "Judging…" : "Queued…") : null;

  return (
    <div className="solve">
      <section className="solve-left" aria-label="Problem">
        <div className="tabs left-tabs" role="tablist">
          <button role="tab" aria-selected={leftTab === "statement"} onClick={() => setLeftTab("statement")}>Statement</button>
          <button role="tab" aria-selected={leftTab === "solutions"} onClick={() => setLeftTab("solutions")}>
            Solutions{!p.solutionsUnlocked && <span className="count" aria-label="locked">· locked</span>}
          </button>
        </div>
        <div className="solve-left-inner">
          {leftTab === "statement" ? <Statement p={p} /> : <SolutionsPanel p={p} lang={lang} onUnlocked={replace} />}
        </div>
      </section>

      <section className="solve-right" aria-label="Your solution">
        <div className="editor-bar">
          <label className="sr-only" htmlFor="lang">Language</label>
          <select id="lang" value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
            {LANGS.map((l) => <option key={l} value={l}>{LANG_LABEL[l]}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={resetCode} disabled={code[lang] === p.templates[lang]}>Reset to template</button>
          <span className="grow" />
          <span className="muted small">
            <kbd>Ctrl</kbd> <kbd>Enter</kbd> run · <kbd>Ctrl</kbd> <kbd>Shift</kbd> <kbd>Enter</kbd> submit
          </span>
        </div>

        <div className="editor-host">
          <CodeEditor lang={lang} value={code[lang]} onChange={edit} onRun={() => void send("run")} onSubmit={() => void send("submit")} />
        </div>

        <div className="console">
          <div className="console-head">
            <div className="tabs" role="tablist">
              <button role="tab" aria-selected={tab === "input"} onClick={() => setTab("input")}>Custom input</button>
              <button role="tab" aria-selected={tab === "result"} onClick={() => setTab("result")}>
                Result
                {sub?.verdict && <span style={{ marginLeft: 6 }}><VerdictBadge verdict={sub.verdict} short /></span>}
                {sub && sub.status !== "done" && <span className="spinner" style={{ display: "inline-block", marginLeft: 8, verticalAlign: -2 }} aria-hidden />}
              </button>
            </div>
            <div className="console-actions">
              {busyLabel && <span className="muted small">{busyLabel}</span>}
              {!busyLabel && coolingDown && <span className="muted small">Wait a few seconds…</span>}
              <button className="btn" onClick={() => void send("run")} disabled={pending || coolingDown} title="Run the samples and your custom input (Ctrl+Enter)">
                Run
              </button>
              <button className="btn btn-primary" onClick={() => void send("submit")} disabled={pending || coolingDown} title="Judge every test (Ctrl+Shift+Enter)">
                Submit
              </button>
            </div>
          </div>
          <div className="console-body">
            {error && <div style={{ marginBottom: 12 }}><Notice>{error}</Notice></div>}
            {tab === "input" ? (
              <div className="stack-sm" style={{ height: "100%" }}>
                <label className="sr-only" htmlFor="custom">Custom input</label>
                <textarea
                  id="custom"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  spellCheck={false}
                  placeholder="Input for Run, on top of the samples. Leave empty to run the samples only."
                />
                <span className="muted small">Run checks every sample plus this input. Submit checks all tests, including hidden ones.</span>
              </div>
            ) : sub ? (
              <>
                {justSolved && (
                  <div style={{ marginBottom: 12 }}>
                    <Notice tone="ok">
                      Solved{p.pattern && !p.track ? <>. This was a <b>{p.pattern.name}</b> problem</> : ""}. Nicely done.{" "}
                      {leftTab !== "solutions" && (
                        <button className="link-btn" onClick={() => setLeftTab("solutions")}>See how others solved it</button>
                      )}
                    </Notice>
                  </div>
                )}
                <ResultView sub={sub} sampleCount={p.samples.length} />
                {sub.status === "done" && (
                  <p className="small" style={{ marginTop: 12 }}>
                    <Link to={`/submissions/${sub.id}`}>Open this {sub.kind === "run" ? "run" : "submission"}</Link>
                  </p>
                )}
              </>
            ) : (
              <p className="muted small">Run or Submit to see results here.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Statement({ p }: { p: ProblemView }) {
  const lim = p.limits;
  return (
    <>
      <h1>{p.title}</h1>
      <div className="prob-meta">
        <StatusBadge status={p.status} />
        {p.track && <span className="badge">Ladder {p.track.position} of 5</span>}
        {p.pattern ? <span className="badge badge-primary">{p.pattern.name}</span> : <span className="badge">Pattern hidden until solved</span>}
        {p.dailyDays.length > 0 && <span className="badge">Daily · {p.dailyDays.map(fmtDay).join(", ")}</span>}
        {p.solvedAt && <span className="muted small">Solved {fmtStamp(p.solvedAt)}</span>}
      </div>
      <div className="limits">
        <span>Time <b>{LANGS.map((l) => `${LANG_LABEL[l].split(" ")[0]} ${lim.timeMs[l]} ms`).join(" · ")}</b></span>
        <span>Memory <b>{lim.memoryMb} MB</b></span>
      </div>

      <Markdown>{p.statementMd}</Markdown>

      {p.samples.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 16 }}>Examples</h2>
          {p.anyValidAnswer && <p className="muted small" style={{ marginTop: 4 }}>Any valid answer is accepted, not only the one shown.</p>}
          {p.samples.map((s, i) => (
            <div className="sample" key={i}>
              <div>
                <h4><span>Input {p.samples.length > 1 ? i + 1 : ""}</span><CopyButton text={s.input} /></h4>
                <pre className="io">{s.input}</pre>
              </div>
              <div>
                <h4><span>Output {p.samples.length > 1 ? i + 1 : ""}</span><CopyButton text={s.output} /></h4>
                <pre className="io">{s.output}</pre>
              </div>
            </div>
          ))}
        </section>
      )}

      {p.track && p.track.hints > 0 && (
        <p className="muted small" style={{ marginTop: 28 }}>
          This ladder problem has {p.track.hints} hint{p.track.hints === 1 ? "" : "s"}. Hints arrive with the tracks update.
        </p>
      )}
      {p.pattern && !p.track && (
        <p className="small" style={{ marginTop: 28 }}>
          {p.pattern.trackOpen ? (
            <>This was a {p.pattern.name.toLowerCase()} problem. <Link to={`/tracks/${p.pattern.slug}`}>Practise more in the {p.pattern.name} track →</Link></>
          ) : (
            <span className="muted">This was a {p.pattern.name.toLowerCase()} problem. A track for this pattern is coming.</span>
          )}
        </p>
      )}
      {p.status !== "new" && (
        <p className="small" style={{ marginTop: 28 }}>
          <Link to={`/history?problem=${encodeURIComponent(p.slug)}`}>Your submissions for this problem</Link>
        </p>
      )}
    </>
  );
}

