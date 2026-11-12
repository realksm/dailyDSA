// The problem page: statement + samples (or the Solutions tab) on the left; editor, custom input and
// results on the right.
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { JAVA_MAIN_CLASS_MESSAGE, LANG_LABEL, LANGS, javaHasMainClass, type Lang, type ProblemView, type SubmissionKind, type SubmissionView } from "@dailydsa/shared";
import { api, ApiErr, errorMessage } from "../api";
import { fmtDay, fmtStamp, istDay } from "../format";
import { CodeEditor } from "../components/LazyEditor";
import { Markdown } from "../components/Markdown";
import { SolutionsPanel } from "../components/Solutions";
import { ResultView } from "../components/Result";
import { SolvedReveal } from "../components/SolvedReveal";
import { Icon } from "../components/Icon";
import { CopyButton, LoadError, Notice, Skeleton, StatusBadge, useLoad, useTitle, VerdictBadge } from "../components/ui";
import { Link, useRouter } from "../router";
import { draftKey, store } from "../store";
import { usePrefs } from "../prefs";
import { useConfirm } from "../components/Confirm";
import { TabInk } from "../components/TabInk";
import { Select } from "../components/Select";
import { useStreak } from "../streak";

/** Matches the server's one Run/Submit per 5 s. */
const COOLDOWN_MS = 5000;
const POLL_MS = 1000;


const clampNum = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));
/** The modifier shown on the Run/Submit buttons (Monaco maps CtrlCmd to ⌘ on a Mac). */
const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD_ALT = IS_MAC ? "⌥" : "Alt+";
const MOD = IS_MAC ? "⌘" : "Ctrl ";

/** Follows the pointer until release: `move` gets client x/y, `done` runs once at the end. */
function startDrag(e: ReactPointerEvent<HTMLElement>, move: (x: number, y: number) => void, done: () => void, axis: "x" | "y" = "x") {
  if (e.button !== 0) return;
  e.preventDefault();
  const el = e.currentTarget;
  el.setPointerCapture(e.pointerId);
  document.body.dataset.dragging = axis;
  const onMove = (ev: PointerEvent) => move(ev.clientX, ev.clientY);
  const onUp = () => {
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerup", onUp);
    el.removeEventListener("pointercancel", onUp);
    delete document.body.dataset.dragging;
    done();
  };
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", onUp);
  el.addEventListener("pointercancel", onUp);
}

/** The draining fill inside Run/Submit during the cooldown. A negative delay starts it part-way in
 *  (the cooldown begins at send, so judging has usually used some of it); fixed at mount so re-renders don't restart it. */
function CoolFill({ until }: { until: number }) {
  const [delay] = useState(() => Math.min(0, until - COOLDOWN_MS - Date.now()));
  return <span className="cool-fill" style={{ animationDuration: `${COOLDOWN_MS}ms`, animationDelay: `${delay}ms` }} aria-hidden />;
}

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

/**
 * Next to the language picker: what the code on screen is, for that language. Always says something,
 * so switching to a language with no edits doesn't look like saving stopped.
 */
function DraftNote({ dirty, stored, everSent }: { dirty: boolean; stored: boolean; everSent: boolean }) {
  const away = everSent ? "your last Run or Submit" : "the template";
  const [cls, text, title] = dirty
    ? stored
      ? ["draft-saved", "Draft saved", `Kept in this browser only and differs from ${away}. Run or Submit to keep it with your account.`]
      : ["draft-unsaved", "Draft not saved", "This browser won't store it (site data is blocked or full). Run or Submit to keep it."]
    : everSent
      ? ["draft-clean", "Same as your last Run/Submit", "Nothing new to save: this is the code you last sent in this language."]
      : ["draft-clean", "Starting template", "No edits yet. Edits are saved in this browser as you type."];
  return (
    <span className="draft-note" role="status">
      <span key={text} className={cls} title={title}>
        {cls === "draft-saved" && <Icon name="check" />}{text}
      </span>
    </span>
  );
}

function Solve({ p, refresh, replace }: { p: ProblemView; refresh: () => void; replace: (v: ProblemView) => void }) {
  const [leftTab, setLeftTab] = useState<"statement" | "solutions">("statement");
  const ask = useConfirm();
  const { prefs } = usePrefs();
  const { search } = useRouter();
  // ?lang= (a submission's "Load into editor"), else the Account page's default language, else the
  // last one used in this browser, else C++.
  const [lang, setLangState] = useState<Lang>(() => {
    const isLang = (l: string | null): l is Lang => (LANGS as readonly string[]).includes(l ?? "");
    const asked = search.get("lang");
    const last = store.get("dsa.lang");
    return isLang(asked) ? asked : prefs.defaultLang ?? (isLang(last) ? last : "cpp");
  });
  // Per language: the local draft, else the last code sent, else the template.
  const [code, setCode] = useState<Record<Lang, string>>(() => {
    const out = {} as Record<Lang, string>;
    for (const l of LANGS) out[l] = store.get(draftKey(p.slug, l)) ?? p.lastCode?.[l] ?? p.templates[l];
    return out;
  });
  // The last code sent per language (server's lastCode, then this session's Runs/Submits). Code that
  // differs from it (or from the template, before anything was sent) is a draft, kept in this browser.
  const [sent, setSent] = useState<Partial<Record<Lang, string>>>(() => ({ ...p.lastCode }));
  const [draftStored, setDraftStored] = useState(true);
  const base = (l: Lang) => sent[l] ?? p.templates[l];
  const saveDraft = (l: Lang, v: string, against = base(l)) => setDraftStored(store.set(draftKey(p.slug, l), v === against ? null : v));
  const [customInput, setCustomInput] = useState(() => p.samples[0]?.input ?? "");
  const [tab, setTab] = useState<"input" | "result">("input");
  const [sub, setSub] = useState<SubmissionView | null>(null);
  const [sending, setSending] = useState<SubmissionKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [, tick] = useState(0);
  const [justSolved, setJustSolved] = useState(false);
  const { refresh: refreshStreak } = useStreak();
  // Layout: the statement/editor split and the bottom panel. Remembered per browser.
  const [leftPct, setLeftPct] = useState(() => clampNum(Number(store.get("dsa.split.left")) || 42, 28, 62));
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [wrap, setWrap] = useState(() => store.get("dsa.editor.wrap") === "1");
  const toggleWrap = () => setWrap((w) => (store.set("dsa.editor.wrap", w ? null : "1"), !w));
  const [consoleH, setConsoleH] = useState(() => clampNum(Number(store.get("dsa.split.console")) || 280, 140, 640));
  const solveRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLElement>(null);
  const consoleBodyRef = useRef<HTMLDivElement>(null);

  const openTab = (t: "input" | "result") => {
    if (consoleOpen && tab === t) setConsoleOpen(false);
    else {
      setTab(t);
      setConsoleOpen(true);
    }
  };

  const setLang = (l: Lang) => {
    setLangState(l);
    store.set("dsa.lang", l);
  };
  const edit = (v: string) => {
    setCode((c) => ({ ...c, [lang]: v }));
    saveDraft(lang, v);
  };
  // "Use as custom input" on a sample: fill the box, open its tab, focus it (once the tab has rendered).
  const customRef = useRef<HTMLTextAreaElement>(null);
  const focusCustom = useRef(false);
  const takeSample = async (input: string) => {
    const ownText = customInput.trim() !== "" && customInput !== input && !p.samples.some((s) => s.input === customInput);
    if (ownText) {
      const ok = await ask({
        title: "Replace your custom input?",
        body: "The custom input box has text of your own. It's replaced with this sample.",
        confirmLabel: "Replace",
      });
      if (!ok) return;
    }
    setCustomInput(input);
    setTab("input");
    setConsoleOpen(true);
    focusCustom.current = true;
  };
  useEffect(() => {
    if (!focusCustom.current || !consoleOpen || tab !== "input") return;
    focusCustom.current = false;
    customRef.current?.focus();
    customRef.current?.setSelectionRange(0, 0);
    customRef.current?.scrollTo({ top: 0 });
  });

  const resetCode = async () => {
    const ok = await ask({
      title: "Reset to the template?",
      body: `Your ${LANG_LABEL[lang]} code is replaced with the starting template. This can't be undone.`,
      confirmLabel: "Reset code",
      danger: true,
    });
    if (!ok) return;
    setCode((c) => ({ ...c, [lang]: p.templates[lang] }));
    saveDraft(lang, p.templates[lang]); // kept as a draft when the last sent code differs, so a reload doesn't bring that back
  };

  // Re-render every 250 ms during the cooldown so the seconds left count down, and once more when it ends.
  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const id = setInterval(() => {
      tick((n) => n + 1);
      if (cooldownUntil <= Date.now()) clearInterval(id);
    }, 250);
    return () => clearInterval(id);
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
            if (v.verdict === "AC") refreshStreak(); // the top-bar chip
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
  }, [subId, subDone, p.status, refresh, refreshStreak]);

  const pending = sending !== null || (sub !== null && sub.status !== "done");
  const coolLeftMs = Math.max(0, cooldownUntil - Date.now());
  const coolingDown = coolLeftMs > 0;
  const coolSecs = Math.ceil(coolLeftMs / 1000);

  const send = useCallback(
    async (kind: SubmissionKind) => {
      if (pending || coolingDown) return;
      const src = code[lang];
      setError(null);
      if (lang === "java" && !javaHasMainClass(src)) {
        setConsoleOpen(true);
        return setError(JAVA_MAIN_CLASS_MESSAGE);
      }
      setSending(kind);
      try {
        const q = kind === "run" ? await api.run(p.slug, lang, src, customInput) : await api.submit(p.slug, lang, src);
        setCooldownUntil(Date.now() + COOLDOWN_MS);
        setJustSolved(false);
        setSent((x) => ({ ...x, [lang]: src }));
        setDraftStored(store.set(draftKey(p.slug, lang), null)); // the server has it now
        setSub({
          id: q.id, problem: { slug: p.slug, title: p.title, anyValidAnswer: p.anyValidAnswer }, kind, lang, code: src, status: "queued",
          queuePosition: null, verdict: null, result: null, createdAt: new Date().toISOString(), finishedAt: null,
        });
        setTab("result");
        setConsoleOpen(true);
      } catch (e) {
        if (e instanceof ApiErr && e.status === 429) setCooldownUntil(Date.now() + COOLDOWN_MS);
        setError(errorMessage(e));
        setConsoleOpen(true);
      } finally {
        setSending(null);
      }
    },
    [pending, coolingDown, code, lang, customInput, p.slug, p.title],
  );

  /** The tallest the bottom panel can be: the editor keeps its 180 px minimum under the editor bar. */
  const consoleMax = () => {
    const right = rightRef.current;
    const bar = right?.querySelector(".editor-bar");
    return right ? right.getBoundingClientRect().height - (bar?.getBoundingClientRect().height ?? 0) - 180 : 640;
  };

  // A first Accepted adds the reveal under the result: grow the panel so both fit (this once; the saved
  // size stays). Runs again when the refresh brings the pattern and its diagram.
  useLayoutEffect(() => {
    const body = consoleBodyRef.current;
    const reveal = body?.querySelector(".reveal");
    if (!justSolved || !body || !reveal) return;
    // Measured from the reveal's own edge: scrollHeight also counts the card's 3D-flipped face.
    const over = reveal.getBoundingClientRect().bottom + parseFloat(getComputedStyle(body).paddingBottom) - body.getBoundingClientRect().bottom;
    // A target from the measured height, not h + over: this can run again before the new size is laid out.
    const panel = body.closest(".console");
    if (over > 0 && panel) {
      const want = clampNum(panel.getBoundingClientRect().height + over, 140, consoleMax());
      setConsoleH((h) => Math.max(h, want));
    }
  }, [justSolved, p, sub]);

  const busyLabel = sending ? "Sending…" : pending ? (sub?.status === "running" ? "Judging…" : "Queued…") : null;

  // Drag handles. Pointer capture keeps the drag going over Monaco; sizes are saved on release.
  const dragLeft = (e: ReactPointerEvent<HTMLDivElement>) => {
    const box = solveRef.current?.getBoundingClientRect();
    if (!box) return;
    startDrag(e, (x) => setLeftPct(clampNum(((x - box.left) / box.width) * 100, 28, 62)), () =>
      setLeftPct((v) => (store.set("dsa.split.left", v.toFixed(1)), v)),
    );
  };
  const dragConsole = (e: ReactPointerEvent<HTMLDivElement>) => {
    const box = rightRef.current?.getBoundingClientRect();
    if (!box) return;
    const max = consoleMax();
    startDrag(e, (_x, y) => setConsoleH(clampNum(box.bottom - y, 140, max)), () =>
      setConsoleH((v) => (store.set("dsa.split.console", String(Math.round(v))), v)),
      "y",
    );
  };
  const nudgeLeft = (e: ReactKeyboardEvent) => {
    const d = e.key === "ArrowLeft" ? -2 : e.key === "ArrowRight" ? 2 : 0;
    if (!d) return;
    e.preventDefault();
    setLeftPct((v) => {
      const n = clampNum(v + d, 28, 62);
      store.set("dsa.split.left", n.toFixed(1));
      return n;
    });
  };
  const nudgeConsole = (e: ReactKeyboardEvent) => {
    const d = e.key === "ArrowUp" ? 24 : e.key === "ArrowDown" ? -24 : 0;
    if (!d) return;
    e.preventDefault();
    setConsoleH((v) => {
      const n = clampNum(v + d, 140, consoleMax());
      store.set("dsa.split.console", String(n));
      return n;
    });
  };

  return (
    <div className="solve fluid" ref={solveRef} style={{ gridTemplateColumns: `${leftPct}% 1fr` }}>
      <section className="solve-left" aria-label="Problem">
        <div className="tabs left-tabs" role="tablist">
          <button role="tab" aria-selected={leftTab === "statement"} onClick={() => setLeftTab("statement")}>Statement</button>
          <button role="tab" aria-selected={leftTab === "solutions"} onClick={() => setLeftTab("solutions")}>
            Solutions{!p.solutionsUnlocked && <span className="count" aria-label="locked">· locked</span>}
          </button>
          <TabInk />
        </div>
        <div className="solve-left-inner">
          <p className="phone-note"><Icon name="laptop" /><span>Read it here, solve it on a laptop: the editor needs a bigger screen.</span></p>
          <div key={leftTab} className="tab-panel">
            {leftTab === "statement" ? <Statement p={p} onChange={replace} justSolved={justSolved} onUseSample={(s) => void takeSample(s)} /> : <SolutionsPanel p={p} lang={lang} onUnlocked={replace} />}
          </div>
        </div>
      </section>

      <section className="solve-right" aria-label="Your solution" ref={rightRef}>
        <div
          className="split-x"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize the statement and the editor"
          aria-valuenow={Math.round(leftPct)}
          aria-valuemin={28}
          aria-valuemax={62}
          tabIndex={0}
          onPointerDown={dragLeft}
          onKeyDown={nudgeLeft}
        />
        <div className="editor-bar">
          <Select id="lang" aria-label="Language" value={lang} onChange={(v) => setLang(v as Lang)} options={LANGS.map((l) => ({
              value: l,
              // Drafts are per language: flag the other languages that hold one (the note covers this one).
              label: l !== lang && code[l] !== base(l) ? <>{LANG_LABEL[l]}<span className="sel-draft"> · draft</span></> : LANG_LABEL[l],
            }))}
          />
          <DraftNote dirty={code[lang] !== base(lang)} stored={draftStored} everSent={sent[lang] !== undefined} />
          <button
            className="btn btn-ghost btn-sm editor-wrap"
            aria-pressed={wrap}
            onClick={toggleWrap}
            title={`Wrap long lines (${MOD_ALT}Z)`}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
              <path d="M2 4h12M2 8h9.5a2.25 2.25 0 0 1 0 4.5H8M9.5 11 8 12.5 9.5 14M2 12.5h3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Wrap
          </button>
          <button className="btn btn-ghost btn-sm editor-reset" onClick={() => void resetCode()} disabled={code[lang] === p.templates[lang]}>Reset to template</button>
        </div>

        <div className="editor-host">
          <CodeEditor lang={lang} value={code[lang]} onChange={edit} onRun={() => void send("run")} onSubmit={() => void send("submit")} wordWrap={wrap} onToggleWrap={toggleWrap} />
        </div>

        <div className="console" data-open={consoleOpen || undefined} style={consoleOpen ? { height: consoleH } : undefined}>
          {consoleOpen && (
            <div
              className="split-y"
              role="separator"
              aria-orientation="horizontal"
              aria-label="Resize the panel under the editor"
              aria-valuenow={Math.round(consoleH)}
              aria-valuemin={140}
              aria-valuemax={640}
              tabIndex={0}
              onPointerDown={dragConsole}
              onKeyDown={nudgeConsole}
            />
          )}
          <div className="console-head">
            <div className="tabs" role="tablist">
              <button role="tab" aria-selected={consoleOpen && tab === "input"} aria-expanded={consoleOpen && tab === "input"} onClick={() => openTab("input")}>Custom input</button>
              <button role="tab" aria-selected={consoleOpen && tab === "result"} aria-expanded={consoleOpen && tab === "result"} onClick={() => openTab("result")}>
                Result
                {sub?.verdict && <span style={{ marginLeft: 6 }}><VerdictBadge verdict={sub.verdict} short /></span>}
                {sub && sub.status !== "done" && <span className="spinner" style={{ display: "inline-block", marginLeft: 8, verticalAlign: -2 }} aria-hidden />}
              </button>
              <TabInk />
            </div>
            <button
              className="icon-btn"
              onClick={() => setConsoleOpen(!consoleOpen)}
              aria-label={consoleOpen ? "Hide the panel" : "Show the panel"}
              title={consoleOpen ? "Hide the panel" : "Show the panel"}
            >
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden style={{ transform: consoleOpen ? "none" : "rotate(180deg)" }}>
                <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="console-actions">
              {busyLabel && <span className="muted small">{busyLabel}</span>}
              {(["run", "submit"] as const).map((kind) => {
                const cooling = !pending && coolingDown; // while judging, the busy label says why
                return (
                  <button
                    key={kind}
                    className={`btn${kind === "submit" ? " btn-primary" : ""}${cooling ? " btn-cooling" : ""}`}
                    onClick={() => void send(kind)}
                    disabled={pending || coolingDown}
                    title={cooling ? `Ready again in ${coolSecs}s (one Run or Submit every ${COOLDOWN_MS / 1000}s)` : kind === "run" ? "Run the samples and your custom input" : "Judge every test"}
                  >
                    {cooling && <CoolFill key={cooldownUntil} until={cooldownUntil} />}
                    {kind === "run" ? "Run" : "Submit"}{" "}
                    {cooling
                      ? <span className="kbd-hint cool-secs">· {coolSecs}s</span>
                      : <span className="kbd-hint">{MOD}{kind === "submit" ? "⇧" : ""}↵</span>}
                  </button>
                );
              })}
            </div>
          </div>
          {consoleOpen && <div className="console-body" ref={consoleBodyRef}>
            {error && <div style={{ marginBottom: 12 }}><Notice>{error}</Notice></div>}
            <div key={tab} className="tab-panel" style={{ height: tab === "input" ? "100%" : undefined }}>
            {tab === "input" ? (
              <div className="stack-sm" style={{ height: "100%" }}>
                <label className="sr-only" htmlFor="custom">Custom input</label>
                <textarea
                  ref={customRef}
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
                {/* The result stays on top: the test squares are the proof, the reveal follows them. */}
                <ResultView key={sub.id} sub={sub} sampleCount={p.samples.length} />
                {sub.status === "done" && (
                  <p className="small" style={{ marginTop: 12 }}>
                    <Link to={`/submissions/${sub.id}`}>Open this {sub.kind === "run" ? "run" : "submission"}</Link>
                  </p>
                )}
                {justSolved && <SolvedReveal p={p} {...(leftTab !== "solutions" ? { onSolutions: () => setLeftTab("solutions") } : {})} />}
              </>
            ) : (
              <p className="muted small">Run or Submit to see results here.</p>
            )}
            </div>
          </div>}
        </div>
      </section>
    </div>
  );
}

/** "Daily · Mon, 9 Nov · Thu, 12 Nov": each day links to Today (today's) or to its row in the archive. */
function DailyDays({ days }: { days: string[] }) {
  const today = istDay(new Date());
  return (
    <span className="badge badge-days">
      Daily ·{" "}
      {days.map((d, i) => (
        <Fragment key={d}>
          {i > 0 && <span aria-hidden> · </span>}
          {d === today
            ? <Link to="/" title="Today's problem">Today</Link>
            : <Link to={`/archive?day=${d}`} title="Show this day in the archive">{fmtDay(d)}</Link>}
        </Fragment>
      ))}
    </span>
  );
}

function Statement({ p, onChange, justSolved, onUseSample }: {
  p: ProblemView; onChange: (v: ProblemView) => void; justSolved?: boolean; onUseSample?: (input: string) => void;
}) {
  const lim = p.limits;
  const sameTime = LANGS.every((l) => lim.timeMs[l] === lim.timeMs[LANGS[0]]);
  const jumpToHints = () => {
    const h = document.getElementById("hints-h");
    if (!h) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    h.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
    h.focus({ preventScroll: true });
  };
  return (
    <>
      {p.track && p.pattern && (
        <div className="eyebrow crumb">
          <Link to="/tracks">Tracks</Link>
          <span aria-hidden>/</span>
          <Link to={`/tracks/${p.pattern.slug}`}>{p.pattern.name}</Link>
          <span aria-hidden>/</span>
          <span>Ladder {p.track.position}</span>
        </div>
      )}
      <h1>{p.title}</h1>
      <div className="prob-meta">
        <StatusBadge status={p.status} />
        {p.track && <span className="badge">Ladder {p.track.position} of 5</span>}
        {p.pattern ? <span className={`badge badge-primary${justSolved && !p.track ? " badge-reveal" : ""}`}>{p.pattern.name}</span> : <span className="badge">Pattern hidden until solved</span>}
        {p.dailyDays.length > 0 && <DailyDays days={p.dailyDays} />}
        {p.track && p.track.hints > 0 && (
          <button className="badge badge-btn" onClick={jumpToHints} aria-label={`Hints: ${p.track.hintsUsed} of ${p.track.hints} used. Go to hints`}>
            Hints <span className="num">{p.track.hintsUsed}/{p.track.hints}</span>
            <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden><path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        )}
        {p.solvedAt && <span className="muted small">Solved {fmtStamp(p.solvedAt)}</span>}
      </div>
      <div className="limits">
        <span>Time <b>{sameTime ? `${lim.timeMs[LANGS[0]]} ms` : LANGS.map((l) => `${LANG_LABEL[l].split(" ")[0]} ${lim.timeMs[l]} ms`).join(" · ")}</b></span>
        <span>Memory <b>{lim.memoryMb} MB</b></span>
      </div>

      {p.status === "solved" && p.note !== undefined && <NoteBox p={p} onChange={onChange} />}

      <Markdown>{p.statementMd}</Markdown>

      {p.samples.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 16 }}>Examples</h2>
          {p.anyValidAnswer && <p className="muted small" style={{ marginTop: 4 }}>Any valid answer is accepted, not only the one shown.</p>}
          {p.samples.map((s, i) => (
            <div className="sample" key={i}>
              <div>
                <h4>
                  <span>Input {p.samples.length > 1 ? i + 1 : ""}</span>
                  <span className="sample-actions">
                    {onUseSample && (
                      <button type="button" className="copy-btn" onClick={() => onUseSample(s.input)} title="Put this input in the Custom input box to edit and Run it"
                        aria-label={`Use input${p.samples.length > 1 ? ` ${i + 1}` : ""} as custom input`}>
                        Use as input
                      </button>
                    )}
                    <CopyButton text={s.input} />
                  </span>
                </h4>
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

      {p.track && p.track.hints > 0 && <Hints p={p} track={p.track} onChange={onChange} />}
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


/**
 * The private note on a solved problem: what gave the pattern away, a trap, anything to remember.
 * Shown on History and its pattern map. Only the member sees it.
 */
function NoteBox({ p, onChange }: { p: ProblemView; onChange: (v: ProblemView) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(p.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (editing) area.current?.focus(); }, [editing]);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      onChange(await api.saveNote(p.slug, text));
      setEditing(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const cancel = () => { setText(p.note ?? ""); setEditing(false); setError(null); };

  if (!editing && !p.note) {
    return (
      <button type="button" className="note-add" onClick={() => setEditing(true)}>
        <Icon name="pen" />
        <span><b>Add a note</b><span className="muted"> · what gave it away? Only you see it.</span></span>
      </button>
    );
  }
  return (
    <section className="note-box" aria-labelledby="note-h">
      <div className="note-head">
        <h2 id="note-h"><Icon name="pen" />Your note</h2>
        <span className="muted small">Only you see it</span>
        {!editing && <button type="button" className="copy-btn" onClick={() => setEditing(true)}>Edit</button>}
      </div>
      {editing ? (
        <form onSubmit={(e) => { e.preventDefault(); void save(); }} className="stack-sm">
          <textarea
            ref={area}
            className="note-text"
            aria-labelledby="note-h"
            rows={3}
            maxLength={2000}
            value={text}
            placeholder="What gave it away? E.g. “sorted input and pairs → two pointers”, or a trap to remember."
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") cancel();
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void save(); }
            }}
          />
          {error && <Notice>{error}</Notice>}
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-sm btn-primary" disabled={busy}>{busy ? "Saving…" : "Save note"}</button>
            <button type="button" className="btn btn-sm" onClick={cancel} disabled={busy}>Cancel</button>
            <span className="muted small num" style={{ marginLeft: "auto" }}>{text.length}/2000</span>
          </div>
        </form>
      ) : (
        <p className="note-body">{p.note}</p>
      )}
    </section>
  );
}

/** Progressive hints on ladder problems (PLAN §2): one at a time, recorded in history. */
function Hints({ p, track, onChange }: { p: ProblemView; track: NonNullable<ProblemView["track"]>; onChange: (v: ProblemView) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next = track.hintsUsed + 1;
  const ask = useConfirm();
  const take = async () => {
    if (track.hintsUsed === 0 && p.status !== "solved") {
      const ok = await ask({
        title: "Take a hint?",
        body: "Hints open one at a time, and your history shows that you used them.",
        confirmLabel: "Show hint 1",
        cancelLabel: "Not yet",
      });
      if (!ok) return;
    }
    setBusy(true);
    setError(null);
    try {
      onChange(await api.takeHint(p.slug, next));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="hints" aria-labelledby="hints-h">
      <h2 id="hints-h" tabIndex={-1}>Hints <span className="muted small num">{track.hintsUsed}/{track.hints} used</span></h2>
      {track.revealed.map((h, i) => (
        <div className="hint" key={i}>
          <div className="hint-k">Hint {i + 1}</div>
          <Markdown>{h}</Markdown>
        </div>
      ))}
      {error && <Notice>{error}</Notice>}
      {next <= track.hints ? (
        <p>
          <button className="btn btn-sm" onClick={() => void take()} disabled={busy}>
            {busy ? "Opening…" : `Show hint ${next}${track.hints > 1 ? ` of ${track.hints}` : ""}`}
          </button>
          {track.hintsUsed === 0 && <span className="muted small" style={{ marginLeft: 12 }}>Stuck? Hint 1 shows how the pattern applies here; later ones get more specific.</span>}
        </p>
      ) : null}
    </section>
  );
}
