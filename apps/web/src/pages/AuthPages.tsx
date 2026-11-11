// Login, signup (invite code), forgot password and the emailed reset link (/reset-password?token=).
// Layout: the form on the left; on wide screens an ink side panel (auth/AuthAside.tsx, lazy-loaded with GSAP)
// shows a piece of the product. Phones get the form only. Styles: "auth pages" in styles.css.
import {
  lazy, Suspense, useEffect, useRef, useState,
  type FormEvent, type InputHTMLAttributes, type KeyboardEvent, type ReactNode, type Ref,
} from "react";
import { api, ApiErr, errorMessage } from "../api";
import { useAuth } from "../auth";
import { safeNext } from "../App";
import { BrandMark, Notice, useTitle } from "../components/ui";
import { Link, useRouter } from "../router";
import { AuthIcon as Icon } from "./auth/AuthIcon";
import type { Celebrate } from "./auth/AuthAside";

const AuthAside = lazy(() => import("./auth/AuthAside"));

const MIN_PASSWORD = 8;
const WIDE = "(min-width: 900px)";

function useMedia(query: string) {
  const [on, setOn] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setOn(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [query]);
  return on;
}

function AuthLayout({ title, sub, children, foot, aside = "login", celebrate }: {
  title: string; sub?: ReactNode; children: ReactNode; foot?: ReactNode; aside?: "login" | "signup"; celebrate?: Celebrate;
}) {
  useTitle(title);
  // The side panel (and the GSAP chunk with it) only loads where it's shown.
  const wide = useMedia(WIDE);
  return (
    <div className="auth">
      <main className="auth-main">
        <Link to="/" className="brand" aria-label="dailyDSA, about the site"><BrandMark /><span>daily<b>DSA</b></span></Link>
        <div className="auth-body">
          <h1>{title}</h1>
          {sub && <p className="auth-sub">{sub}</p>}
          {children}
        </div>
        {foot && <p className="auth-foot">{foot}</p>}
      </main>
      {wide && (
        <Suspense fallback={<div className="auth-aside" aria-hidden="true" />}>
          <AuthAside kind={aside} celebrate={celebrate} />
        </Suspense>
      )}
    </div>
  );
}

/** Server errors that belong to one field rather than the whole form. */
const FIELD_OF_CODE: Record<string, string> = { invalid_invite: "inviteCode", email_taken: "email" };

/** Form state shared by the four pages: busy flag, top-level error, per-field errors, and a nudge on failure. */
function useForm() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiErr | Error | null>(null);
  const [fails, setFails] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const fieldErr = (name: string) => {
    if (!(err instanceof ApiErr)) return undefined;
    return err.code === "invalid_request" ? err.field(name) : FIELD_OF_CODE[err.code] === name ? err.message : undefined;
  };
  const topErr = !err ? null
    : !(err instanceof ApiErr) ? errorMessage(err)
    : Object.hasOwn(FIELD_OF_CODE, err.code) ? null
    : err.code === "invalid_request" ? "Please fix the fields below."
    : errorMessage(err);

  // After a failure, take the keyboard to the first field that needs fixing.
  useEffect(() => {
    if (err) formRef.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus();
  }, [err]);

  async function run(e: FormEvent, fn: () => Promise<void>) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await fn();
    } catch (x) {
      setErr(x instanceof Error ? x : new Error("Something went wrong."));
      setFails((n) => n + 1);
    } finally {
      setBusy(false);
    }
  }
  const formProps = { ref: formRef, className: "auth-form", "data-shake": fails ? (fails % 2 ? "a" : "b") : undefined };
  return { busy, run, fieldErr, topErr, formProps, setErr };
}

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string; hint?: ReactNode; error?: string | undefined; labelEnd?: ReactNode; inputRef?: Ref<HTMLInputElement>;
};

/** A labelled input. Password inputs get a show/hide toggle and a Caps Lock warning. */
function AuthField({ label, hint, error, labelEnd, inputRef, id, type, ...input }: AuthFieldProps) {
  const fid = id ?? `f-${input.name}`;
  const isPw = type === "password";
  const [shown, setShown] = useState(false);
  const [caps, setCaps] = useState(false);
  const note = error ? `${fid}-err` : hint ? `${fid}-hint` : null;
  const describedBy = [note, caps ? `${fid}-caps` : null].filter(Boolean).join(" ") || undefined;
  const checkCaps = (e: KeyboardEvent<HTMLInputElement>) => setCaps(e.getModifierState?.("CapsLock") ?? false);
  return (
    <div className="afield">
      <div className="afield-top">
        <label htmlFor={fid}>{label}</label>
        {labelEnd}
      </div>
      <div className={`afield-box${isPw ? " afield-pw" : ""}`}>
        <input
          {...input}
          ref={inputRef}
          id={fid}
          type={isPw && shown ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onKeyDown={isPw ? checkCaps : undefined}
          onKeyUp={isPw ? checkCaps : undefined}
          onBlur={isPw ? () => setCaps(false) : undefined}
        />
        {isPw && (
          <button type="button" className="afield-eye" aria-label="Show password" aria-pressed={shown} aria-controls={fid} onClick={() => setShown((s) => !s)}>
            <Icon name={shown ? "hidden" : "show"} />
          </button>
        )}
      </div>
      {caps && <p className="afield-caps" id={`${fid}-caps`}><Icon name="caps" />Caps Lock is on</p>}
      {error ? <p className="afield-err" id={`${fid}-err`}>{error}</p> : hint && <p className="afield-hint" id={`${fid}-hint`}>{hint}</p>}
    </div>
  );
}

function Submit({ busy, done, label, busyLabel }: { busy: boolean; done?: string | false; label: string; busyLabel: string }) {
  return (
    <button className="btn btn-primary btn-lg auth-submit" disabled={busy} aria-busy={busy || undefined}>
      {done ? <><Icon name="check" />{done}</> : busy ? <><span className="spinner" aria-hidden="true" />{busyLabel}</> : label}
    </button>
  );
}

export function Login() {
  const { setUser } = useAuth();
  const { search, navigate } = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const f = useForm();
  const reset = search.get("reset") === "1";

  return (
    <AuthLayout
      title="Log in"
      sub="One problem a day, one pattern a week."
      foot={<>Have an invite code? <Link to="/signup">Create an account</Link></>}
    >
      <form {...f.formProps} onSubmit={(e) => f.run(e, async () => {
        const me = await api.login(email, password);
        setUser(me);
        navigate(safeNext(search.get("next")), { replace: true });
      })}>
        {reset && <Notice tone="ok">Your password was changed. Log in with the new one.</Notice>}
        {f.topErr && <Notice>{f.topErr}</Notice>}
        <AuthField label="Email" type="email" name="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} error={f.fieldErr("email")} />
        <AuthField
          label="Password" type="password" name="password" autoComplete="current-password" required value={password}
          onChange={(e) => setPassword(e.target.value)} error={f.fieldErr("password")}
          labelEnd={<Link to="/forgot-password">Forgot password?</Link>}
        />
        <Submit busy={f.busy} label="Log in" busyLabel="Logging in…" />
      </form>
    </AuthLayout>
  );
}

/** Invite codes look like DSA-XXXX-XXXX; anything else in ?code= is ignored. */
function linkCode(raw: string | null): string | null {
  const code = raw?.trim().toUpperCase() ?? "";
  return /^[A-Z0-9-]{4,40}$/.test(code) ? code : null;
}

/** Tidies what's typed or pasted into the invite field: a pasted invite link gives its code, letters go
 *  upper case, and DSA codes get their dashes. Mid-text edits are only upper-cased, so the caret stays put. */
function formatInvite(value: string, caretAtEnd: boolean): string {
  const fromLink = value.match(/[?&]code=([^&#\s]+)/);
  const v = (fromLink ? decodeURIComponent(fromLink[1]!) : value).toUpperCase();
  if (!caretAtEnd && !fromLink) return v;
  const raw = v.replace(/[^A-Z0-9]/g, "");
  if (!raw.startsWith("DSA") || raw.length <= 3) return v.replace(/\s+/g, "");
  return ["DSA", ...(raw.slice(3).match(/.{1,4}/g) ?? [])].join("-");
}

export function Signup() {
  const { setUser } = useAuth();
  const { search, navigate } = useRouter();
  const fromLink = linkCode(search.get("code"));
  const [form, setForm] = useState({ name: "", email: "", password: "", inviteCode: fromLink ?? "" });
  const [editCode, setEditCode] = useState(!fromLink);
  const [joined, setJoined] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  const celebrate: Celebrate = useRef(null);
  const f = useForm();
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const codeErr = f.fieldErr("inviteCode");

  // The server turned the linked code down: open the field so it can be fixed.
  useEffect(() => {
    if (codeErr && !editCode) setEditCode(true);
  }, [codeErr, editCode]);

  return (
    <AuthLayout
      title="Create your account"
      sub={editCode ? "dailyDSA is a small, invite-only group. Your code is in the message your invite came with." : "You're invited. Pick a name and you're in."}
      foot={<>Already have an account? <Link to="/login">Log in</Link></>}
      aside="signup"
      celebrate={celebrate}
    >
      <form {...f.formProps} onSubmit={(e) => f.run(e, async () => {
        const me = await api.signup(form);
        setJoined(true);
        await celebrate.current?.();
        setUser(me);
        navigate("/", { replace: true });
      })}>
        {f.topErr && <Notice>{f.topErr}</Notice>}
        {editCode ? (
          <AuthField
            label="Invite code" name="inviteCode" required placeholder="DSA-XXXX-XXXX" autoComplete="off" spellCheck={false}
            autoCapitalize="characters" autoFocus={!fromLink || !!codeErr} className="mono" inputRef={codeRef}
            value={form.inviteCode} error={codeErr}
            onChange={(e) => {
              const el = e.target;
              setForm({ ...form, inviteCode: formatInvite(el.value, el.selectionStart === el.value.length) });
            }}
          />
        ) : (
          <div className="afield">
            <span className="afield-label" id="invite-label">Invite code</span>
            <div className="ticket" role="group" aria-labelledby="invite-label">
              <Icon name="invite" />
              <span className="ticket-code">{form.inviteCode}</span>
              <span className="ticket-note">from your link</span>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => {
                setEditCode(true);
                requestAnimationFrame(() => codeRef.current?.focus());
              }}>Change<span className="sr-only"> invite code</span></button>
            </div>
          </div>
        )}
        <AuthField label="Name" name="name" required autoComplete="name" autoFocus={!editCode} maxLength={60} value={form.name}
          onChange={set("name")} error={f.fieldErr("name")} hint="Shown to other solvers." />
        <AuthField label="Email" type="email" name="email" required autoComplete="email" value={form.email} onChange={set("email")}
          error={f.fieldErr("email")} />
        <AuthField label="Password" type="password" name="password" required minLength={MIN_PASSWORD} autoComplete="new-password"
          value={form.password} onChange={set("password")} error={f.fieldErr("password")} hint={`At least ${MIN_PASSWORD} characters.`} />
        <Submit
          busy={f.busy}
          label="Create account"
          busyLabel="Creating your account…"
          done={joined && "You're in"}
        />
      </form>
    </AuthLayout>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const f = useForm();

  if (sent) {
    return (
      <AuthLayout title="Check your email" foot={<Link to="/login">Back to log in</Link>}>
        <div className="auth-form">
          <p>
            If <b>{email}</b> has an account, a reset link is on its way. It works once and expires in 60 minutes.
          </p>
          <p className="muted small">Nothing after a few minutes? Check spam, or ask the admin to reset it for you.</p>
        </div>
      </AuthLayout>
    );
  }
  return (
    <AuthLayout title="Reset your password" sub="We'll email you a link to choose a new one." foot={<Link to="/login">Back to log in</Link>}>
      <form {...f.formProps} onSubmit={(e) => f.run(e, async () => {
        await api.forgotPassword(email);
        setSent(true);
      })}>
        {f.topErr && <Notice>{f.topErr}</Notice>}
        <AuthField label="Email" type="email" name="email" required autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={f.fieldErr("email")} />
        <Submit busy={f.busy} label="Send reset link" busyLabel="Sending…" />
      </form>
    </AuthLayout>
  );
}

export function ResetPassword() {
  const { search, navigate } = useRouter();
  const token = search.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const f = useForm();

  if (!token) {
    return (
      <AuthLayout title="Reset link incomplete" foot={<Link to="/forgot-password">Ask for a new link</Link>}>
        <p className="auth-form">This page needs the full link from the email. Open it again from the email, or ask for a new one.</p>
      </AuthLayout>
    );
  }
  return (
    <AuthLayout title="Choose a new password" sub="You'll be logged out on every device." foot={<Link to="/login">Back to log in</Link>}>
      <form {...f.formProps} onSubmit={(e) => f.run(e, async () => {
        if (password !== confirm) {
          throw new ApiErr(400, "invalid_request", "The two passwords don't match.", [{ path: "confirm", message: "Doesn't match the new password." }]);
        }
        await api.resetPassword(token, password);
        navigate("/login?reset=1", { replace: true });
      })}>
        {f.topErr && (
          <Notice>
            {f.topErr}
            {f.topErr.includes("expired") && <> <Link to="/forgot-password">Get a new link</Link>.</>}
          </Notice>
        )}
        <AuthField label="New password" type="password" name="password" required minLength={MIN_PASSWORD} autoFocus autoComplete="new-password"
          value={password} onChange={(e) => setPassword(e.target.value)} error={f.fieldErr("password")} hint={`At least ${MIN_PASSWORD} characters.`} />
        <AuthField label="Repeat it" type="password" name="confirm" required autoComplete="new-password" value={confirm}
          onChange={(e) => setConfirm(e.target.value)} error={f.fieldErr("confirm")} />
        <Submit busy={f.busy} label="Set password" busyLabel="Saving…" />
      </form>
    </AuthLayout>
  );
}
