// Your account: who you are, preferences (follow you to every browser), the streak-saver email, and
// changing the password (logs out your other devices).
import { useState } from "react";
import { LANG_LABEL, LANGS } from "@dailydsa/shared";
import { api, ApiErr, errorMessage } from "../api";
import { DEFAULT_FONT, usePrefs, type Prefs } from "../prefs";
import { Select } from "../components/Select";
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

      <Preferences />

      <div style={{ marginTop: 24 }}><Reminders /></div>

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

const FONT_SIZES = [12, 13, 14, 15, 16, 18, 20];

/** Default language, editor font size, theme. Each saves when changed; the theme also applies at once. */
function Preferences() {
  const { prefs, save } = usePrefs();
  const [err, setErr] = useState<unknown>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const set = async (p: Partial<Prefs>, what: string) => {
    setErr(null);
    setSaved(null);
    try {
      await save(p);
      setSaved(what);
    } catch (e) {
      setErr(e);
    }
  };
  const size = prefs.editorFontSize ?? DEFAULT_FONT;
  return (
    <section className="card card-pad" aria-labelledby="prefs-h">
      <h2 id="prefs-h" style={{ marginBottom: 4 }}>Preferences</h2>
      <p className="muted small" style={{ marginBottom: 20 }}>Saved with your account, so they follow you to every browser.</p>
      <div className="prefs">
        <label className="pref" htmlFor="pref-lang">
          <span className="pref-k">Default language</span>
          <span className="pref-hint muted small">The editor opens in it.</span>
        </label>
        <Select
          id="pref-lang"
          value={prefs.defaultLang ?? ""}
          onChange={(v) => void set({ defaultLang: v ? (v as Prefs["defaultLang"]) : null }, "Default language")}
          options={[{ value: "", label: "The last one I used" }, ...LANGS.map((l) => ({ value: l, label: LANG_LABEL[l] }))]}
        />

        <label className="pref" htmlFor="pref-font">
          <span className="pref-k">Editor font size</span>
          <span className="pref-hint muted small">Code viewers use one size smaller.</span>
        </label>
        <div className="row" style={{ gap: 12 }}>
          <Select
            id="pref-font"
            value={String(size)}
            onChange={(v) => void set({ editorFontSize: Number(v) === DEFAULT_FONT ? null : Number(v) }, "Font size")}
            options={FONT_SIZES.map((n) => ({ value: String(n), label: `${n} px${n === DEFAULT_FONT ? " (default)" : ""}` }))}
          />
          <code className="pref-sample" style={{ fontSize: size }} aria-hidden>for (int i = 0; i &lt; n; i++)</code>
        </div>

        <span className="pref" id="pref-theme">
          <span className="pref-k">Theme</span>
          <span className="pref-hint muted small">Also the button in the top bar.</span>
        </span>
        <div className="seg" role="radiogroup" aria-labelledby="pref-theme">
          {(["auto", "light", "dark"] as const).map((t) => (
            <button key={t} type="button" role="radio" aria-checked={prefs.theme === t} className="seg-btn"
              onClick={() => void set({ theme: t }, "Theme")}>
              {t === "auto" ? "System" : t === "light" ? "Light" : "Dark"}
            </button>
          ))}
        </div>
      </div>
      <div aria-live="polite" style={{ marginTop: 16 }}>
        {err ? <Notice>{errorMessage(err)}</Notice> : saved ? <p className="small muted">{saved} saved.</p> : null}
      </div>
    </section>
  );
}
