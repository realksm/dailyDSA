// A Run/Submit result: overall verdict, per-test pass/fail with time and memory, and the
// input/output of every visible test (samples, custom input, the first failing hidden test).
import { useState } from "react";
import { VERDICT_LABEL, type SubmissionView, type TestResult } from "@dailydsa/shared";
import { fmtKb, fmtMs, verdictTone } from "../format";
import { CopyButton, Spinner, VerdictBadge } from "./ui";

export function ResultView({ sub, sampleCount }: { sub: SubmissionView; sampleCount?: number }) {
  if (sub.status !== "done" || !sub.result || !sub.verdict) {
    return (
      <div className="row muted" style={{ padding: "8px 0" }}>
        <Spinner />
        {sub.status === "running"
          ? <span>{sub.kind === "run" ? "Running your code…" : "Judging every test…"}</span>
          : sub.queuePosition && sub.queuePosition > 1
            ? <span>Queued · {sub.queuePosition - 1} ahead of you</span>
            : <span>Queued · next in line</span>}
      </div>
    );
  }

  const r = sub.result;
  const tone = verdictTone(r.verdict);
  const passed = r.tests.filter((t) => t.verdict === "AC").length;
  const failed = r.tests.find((t) => t.verdict !== "AC");
  const summary =
    r.verdict === "CE" ? "Your code didn't compile."
    : r.verdict === "IE" ? "Something went wrong on the judge, not in your code. Try again; if it keeps happening, tell the admin."
    : sub.kind === "run"
      ? `${passed} of ${r.tests.length} ${r.tests.some((t) => t.custom) ? "tests (samples + your input)" : "sample tests"} passed`
      : r.verdict === "AC" ? `All ${r.tests.length} tests passed` : `Failed on test ${(failed?.index ?? 0) + 1} after ${passed} passed`;

  return (
    <div className="fade-in">
      <div className="verdict-head">
        <span className="v" data-tone={tone}>{VERDICT_LABEL[r.verdict]}</span>
        <span className="muted small">{summary}</span>
        {r.tests.length > 0 && <span className="m">max {fmtMs(r.maxCpuMs)} · {fmtKb(r.maxMemoryKb)}</span>}
      </div>

      {r.compileLog && (
        <pre className="io compile-log" style={{ maxHeight: 220, marginBottom: 12 }}>{r.compileLog}</pre>
      )}

      {sub.kind === "submit" && r.tests.length > 8 && (
        <div className="pips" aria-hidden>
          {r.tests.map((t) => <span key={t.index} className="pip" data-tone={verdictTone(t.verdict)} title={`Test ${t.index + 1}: ${t.verdict}`} />)}
        </div>
      )}

      <div className="tests">
        {r.tests.map((t) => (
          <TestRow
            key={t.index}
            t={t}
            label={t.custom ? "Your input" : sub.kind === "run" ? `Sample ${t.index + 1}` : `Test ${t.index + 1}`}
            hiddenNote={sub.kind === "submit" && sampleCount !== undefined && t.index >= sampleCount && t.input !== undefined}
            // Open the first failing visible test, or the custom one, straight away.
            open={(t === failed && t.input !== undefined) || (!failed && !!t.custom)}
          />
        ))}
      </div>
    </div>
  );
}

function TestRow({ t, label, open: initial, hiddenNote }: { t: TestResult; label: string; open: boolean; hiddenNote: boolean }) {
  const [open, setOpen] = useState(initial);
  const hasBody = t.input !== undefined || t.output !== undefined || !!t.stderr;
  const verdict = t.custom && t.verdict === "AC" ? "ran cleanly" : null;
  return (
    <div className="test">
      <button type="button" onClick={() => setOpen(!open)} disabled={!hasBody} aria-expanded={hasBody ? open : undefined}>
        <span className="small" style={{ fontWeight: 500 }}>{label}</span>
        <span>{verdict ? <span className="badge badge-ok">Ran cleanly</span> : <VerdictBadge verdict={t.verdict} />}</span>
        <span className="tm">{fmtMs(t.cpuMs)}</span>
        <span className="tm" style={{ minWidth: 64, textAlign: "right" }}>{fmtKb(t.memoryKb)}</span>
      </button>
      {open && hasBody && (
        <div className="test-body">
          {hiddenNote && <p className="muted small">A hidden test. Only the first failing one shows its data.</p>}
          {t.input !== undefined && <IO title="Input" text={t.input} />}
          <div className="pair">
            {t.output !== undefined && <IO title="Your output" text={t.output || "(no output)"} />}
            {t.expected !== undefined && <IO title="Expected" text={t.expected} />}
          </div>
          {t.stderr && <IO title="stderr" text={t.stderr} />}
        </div>
      )}
    </div>
  );
}

function IO({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h5 className="row between">
        <span>{title}</span>
        <CopyButton text={text} />
      </h5>
      <pre className="io">{text}</pre>
    </div>
  );
}
