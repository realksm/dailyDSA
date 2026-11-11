// The Solutions tab on the problem page (PLAN §4): locked until solved, or opened early with the
// Show solutions button after a real attempt. Then: the reference code pinned on top, followed by
// everyone's accepted code (latest per author and language), filterable by language.
import { useEffect, useState, type ReactNode } from "react";
import { LANG_LABEL, LANGS, type AcceptedSolution, type Lang, type ProblemView, type Solutions } from "@dailydsa/shared";
import { api, errorMessage } from "../api";
import { fmtKb, fmtMs, fmtStamp } from "../format";
import { CodeEditor } from "./LazyEditor";
import { CopyButton, LoadError, Notice, SkeletonRows } from "./ui";
import { useConfirm } from "./Confirm";

const PAGE = 20;

export function SolutionsPanel({ p, lang, onUnlocked }: { p: ProblemView; lang: Lang; onUnlocked: (v: ProblemView) => void }) {
  if (!p.solutionsUnlocked) return <Locked p={p} onUnlocked={onUnlocked} />;
  return <SolutionList slug={p.slug} initialLang={lang} />;
}

function Locked({ p, onUnlocked }: { p: ProblemView; onUnlocked: (v: ProblemView) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ask = useConfirm();
  const unlock = async () => {
    const ok = await ask({
      title: "Open the solutions now?",
      body: "You can still solve it afterwards, but your history will mark it as solved after viewing solutions.",
      confirmLabel: "Open solutions",
      cancelLabel: "Keep trying",
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      onUnlocked(await api.unlockSolutions(p.slug));
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <div className="sol-locked">
      <h2>Solutions are locked</h2>
      {p.canUnlockSolutions ? (
        <>
          <p className="muted">
            They open by themselves once you solve this problem. Stuck? You can open them now, and your history will
            say you solved it after viewing solutions.
          </p>
          {error && <Notice>{error}</Notice>}
          <p><button className="btn" onClick={() => void unlock()} disabled={busy}>{busy ? "Opening…" : "Show solutions"}</button></p>
        </>
      ) : (
        <p className="muted">
          They open once you solve this problem. After one real attempt (a Submit that compiles) you can also open them
          early.
        </p>
      )}
    </div>
  );
}

function SolutionList({ slug, initialLang }: { slug: string; initialLang: Lang }) {
  const [filter, setFilter] = useState<Lang | "all">(initialLang);
  const [data, setData] = useState<Solutions | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let stop = false;
    setData(null);
    setError(null);
    api.solutions(slug, { lang: filter === "all" ? undefined : filter, limit: PAGE }).then(
      (s) => !stop && setData(s),
      (e: unknown) => !stop && setError(e),
    );
    return () => {
      stop = true;
    };
  }, [slug, filter, attempt]);

  const more = async () => {
    if (!data?.nextBefore) return;
    setLoadingMore(true);
    try {
      const s = await api.solutions(slug, { lang: filter === "all" ? undefined : filter, before: data.nextBefore, limit: PAGE });
      setData((d) => (d ? { ...d, accepted: [...d.accepted, ...s.accepted], nextBefore: s.nextBefore } : s));
    } catch (e) {
      setError(e);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="seg" role="radiogroup" aria-label="Language">
        {(["all", ...LANGS] as const).map((l) => (
          <button key={l} role="radio" aria-checked={filter === l} onClick={() => setFilter(l)}>
            {l === "all" ? "All languages" : LANG_LABEL[l]}
          </button>
        ))}
      </div>

      {error ? <LoadError error={error} retry={() => setAttempt((n) => n + 1)} /> : !data ? <SkeletonRows n={4} /> : (
        <>
          {data.official.length > 0 && (
            <section className="stack-sm">
              <h2 className="sol-h">Official solution</h2>
              {data.official.map((s) => (
                <CodeCard
                  key={s.lang}
                  lang={s.lang}
                  code={s.code}
                  title={<span className="badge badge-primary">Reference</span>}
                  defaultOpen={filter !== "all"}
                />
              ))}
            </section>
          )}

          <section className="stack-sm">
            <h2 className="sol-h">Accepted solutions</h2>
            {data.accepted.length === 0 ? (
              <p className="muted small">
                No accepted code {filter === "all" ? "" : `in ${LANG_LABEL[filter]} `}yet.
              </p>
            ) : (
              data.accepted.map((s) => <Accepted key={s.id} s={s} />)
            )}
            {data.nextBefore !== null && (
              <p><button className="btn btn-sm" onClick={() => void more()} disabled={loadingMore}>{loadingMore ? "Loading…" : "Show more"}</button></p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Accepted({ s }: { s: AcceptedSolution }) {
  return (
    <CodeCard
      lang={s.lang}
      code={s.code}
      title={
        <>
          <b>{s.mine ? "You" : s.author}</b>
          <span className="muted small">{fmtStamp(s.createdAt)}</span>
        </>
      }
      stats={[s.maxCpuMs !== null ? fmtMs(s.maxCpuMs) : null, s.maxMemoryKb !== null ? fmtKb(s.maxMemoryKb) : null]}
    />
  );
}

/** A collapsible code block; Monaco (read-only) only mounts while it's open. */
function CodeCard(o: { lang: Lang; code: string; title: ReactNode; stats?: (string | null)[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!o.defaultOpen);
  const lines = o.code.split("\n").length;
  return (
    <div className="sol" data-open={open || undefined}>
      <div className="sol-head">
        <button className="sol-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span className="chev" aria-hidden>{open ? "▾" : "▸"}</span>
          {o.title}
          <span className="badge">{LANG_LABEL[o.lang]}</span>
          {o.stats?.filter(Boolean).map((t) => <span key={t} className="tm">{t}</span>)}
          <span className="grow" />
          <span className="muted small">{lines} line{lines === 1 ? "" : "s"}</span>
        </button>
        <CopyButton text={o.code} />
      </div>
      {open && (
        <CodeEditor lang={o.lang} value={o.code} onChange={() => {}} readOnly autoHeight />
      )}
    </div>
  );
}
