import { useCallback, useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { VERDICT_LABEL, type SolveStatus, type Verdict } from "@dailydsa/shared";
import { ApiErr, errorMessage } from "../api";
import { verdictTone } from "../format";

/** Load data on mount / when deps change. `reload` refetches; `setData` patches locally after a mutation. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data?: T; error?: unknown; loading: boolean }>({ loading: true });
  const seq = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);
  const reload = useCallback(() => {
    const n = ++seq.current;
    setState((s) => ({ ...s, loading: true }));
    run().then(
      (data) => n === seq.current && setState({ data, loading: false }),
      (error: unknown) => n === seq.current && setState({ error, loading: false }),
    );
  }, [run]);
  useEffect(reload, [reload]);
  const setData = useCallback((f: (d: T) => T) => setState((s) => (s.data === undefined ? s : { ...s, data: f(s.data) })), []);
  return { ...state, reload, setData };
}

export function useTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · dailyDSA` : "dailyDSA";
  }, [title]);
}

export const Spinner = ({ label }: { label?: string }) => (
  <span className="row" style={{ gap: 8 }} role="status">
    <span className="spinner" aria-hidden />
    {label && <span>{label}</span>}
  </span>
);

export function Notice({ tone = "bad", children }: { tone?: "bad" | "ok" | "info" | "warn"; children: ReactNode }) {
  return (
    <div className={`notice notice-${tone}`} role={tone === "bad" ? "alert" : "status"}>
      {children}
    </div>
  );
}

/** A failed load: the server's message plus a retry. 404s read as "not found" without a retry. */
export function LoadError({ error, retry }: { error: unknown; retry?: () => void }) {
  const notFound = error instanceof ApiErr && error.status === 404;
  return (
    <div className="empty">
      <h3>{notFound ? "Not found" : "Couldn't load this"}</h3>
      <p>{errorMessage(error)}</p>
      {!notFound && retry && (
        <p style={{ marginTop: 16 }}>
          <button className="btn" onClick={retry}>Try again</button>
        </p>
      )}
    </div>
  );
}

export function Skeleton({ h = 16, w = "100%" }: { h?: number; w?: number | string }) {
  return <div className="skeleton" style={{ height: h, width: w }} aria-hidden />;
}

export function SkeletonRows({ n = 5 }: { n?: number }) {
  return (
    <div className="stack-sm" aria-busy="true" aria-label="Loading">
      {Array.from({ length: n }, (_, i) => <Skeleton key={i} h={36} />)}
    </div>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: ReactNode; error?: string | undefined };

export function Field({ label, hint, error, id, ...input }: FieldProps) {
  const fid = id ?? `f-${input.name ?? label.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <label className="field" htmlFor={fid}>
      <span>{label}</span>
      <input id={fid} aria-invalid={error ? true : undefined} aria-describedby={error ? `${fid}-err` : undefined} {...input} />
      {error ? <span className="err" id={`${fid}-err`}>{error}</span> : hint && <span className="hint">{hint}</span>}
    </label>
  );
}

export function StatusDot({ status }: { status: SolveStatus }) {
  const label = status === "solved" ? "Solved" : status === "attempted" ? "Attempted" : "Not attempted";
  return <span className="status-dot" data-s={status} title={label} aria-label={label} role="img" />;
}

export function StatusBadge({ status }: { status: SolveStatus }) {
  if (status === "solved") return <span className="badge badge-ok"><span className="dot" />Solved</span>;
  if (status === "attempted") return <span className="badge badge-warn"><span className="dot" />Attempted</span>;
  return <span className="badge">New</span>;
}

export function VerdictBadge({ verdict, short }: { verdict: Verdict; short?: boolean }) {
  return (
    <span className={`badge badge-${verdictTone(verdict)}`} title={VERDICT_LABEL[verdict]}>
      {short ? verdict : VERDICT_LABEL[verdict]}
    </span>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="copy-btn"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        });
      }}
    >
      {done ? "Copied" : label}
    </button>
  );
}

export const BrandMark = () => (
  <svg viewBox="0 0 32 32" aria-hidden>
    <rect width="32" height="32" rx="7" fill="var(--primary)" />
    <rect x="7" y="18" width="4" height="7" rx="1" fill="var(--on-primary)" />
    <rect x="14" y="12" width="4" height="13" rx="1" fill="var(--on-primary)" />
    <rect x="21" y="7" width="4" height="18" rx="1" fill="var(--on-primary)" opacity=".55" />
  </svg>
);
