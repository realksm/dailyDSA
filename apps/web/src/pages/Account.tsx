// Your account: who you are, the streak-saver email, and changing the password (logs out your other devices).
import { useState } from "react";
import { api, ApiErr, errorMessage } from "../api";
import { useAuth, useMe } from "../auth";
import { Field, Notice, Skeleton, useLoad, useTitle } from "../components/ui";

export function Account() {
  useTitle("Account");
  const me = useMe();
  const { logout } = useAuth();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const [done, setDone] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setDone(false);
    if (next !== again) return setErr(new Error("The two new passwords don't match."));
    setBusy(true);
    try {
      await api.changePassword(cur, next);
      setDone(true);
      setCur(""); setNext(""); setAgain("");
    } catch (x) {
      setErr(x);
    } finally {
      setBusy(false);
    }
  }
  const field = (n: string) => (err instanceof ApiErr ? err.field(n) : undefined);
  const top = err && !(err instanceof ApiErr && err.code === "invalid_request") ? errorMessage(err) : null;

  return (
    <main className="page page-narrow">
      <div className="page-head">
        <div>
          <h1>Account</h1>
          <p>{me.name} · {me.email} · <span style={{ textTransform: "capitalize" }}>{me.role}</span></p>
        </div>
        <button className="btn" onClick={() => void logout()}>Log out</button>
      </div>

      <Reminders />

      <section className="card card-pad" style={{ marginTop: 24 }}>
        <h2 style={{ marginBottom: 4 }}>Change password</h2>
        <p className="muted small" style={{ marginBottom: 20 }}>Your other devices will be logged out. This one stays signed in.</p>
        <form className="stack" onSubmit={save} style={{ maxWidth: 360 }}>
          {done && <Notice tone="ok">Password changed.</Notice>}
          {top && <Notice>{top}</Notice>}
          <Field label="Current password" type="password" name="currentPassword" autoComplete="current-password" required value={cur} onChange={(e) => setCur(e.target.value)} error={field("currentPassword")} />
          <Field label="New password" type="password" name="newPassword" autoComplete="new-password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} error={field("newPassword")} hint="At least 8 characters." />
          <Field label="Repeat new password" type="password" name="again" autoComplete="new-password" required value={again} onChange={(e) => setAgain(e.target.value)} />
          <div><button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Change password"}</button></div>
        </form>
      </section>
    </main>
  );
}

/** The streak-saver email (server: reminders.ts). Saves on change, no separate button. */
function Reminders() {
  const settings = useLoad(() => api.settings(), []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const on = settings.data?.remindStreak;
  const toggle = async () => {
    if (on === undefined) return;
    setBusy(true);
    setErr(null);
    try {
      const next = await api.saveSettings({ remindStreak: !on });
      settings.setData(() => next);
    } catch (e) {
      setErr(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="card card-pad">
      <h2 style={{ marginBottom: 4 }}>Streak reminder</h2>
      <p className="muted small" style={{ marginBottom: 16 }}>
        One email at 9 pm IST on days you have a streak going and today's problem is still open. Never more than one a day.
      </p>
      {settings.error ? <Notice>{errorMessage(settings.error)}</Notice> : on === undefined ? <Skeleton h={24} w={220} /> : (
        <label className="check-row">
          <input type="checkbox" checked={on} disabled={busy} onChange={() => void toggle()} />
          <span>Email me before my streak breaks</span>
        </label>
      )}
      {err ? <div style={{ marginTop: 12 }}><Notice>{errorMessage(err)}</Notice></div> : null}
    </section>
  );
}
