// Login, signup (invite code), forgot password and the emailed reset link (/reset-password?token=).
import { useState, type FormEvent, type ReactNode } from "react";
import { api, ApiErr, errorMessage } from "../api";
import { useAuth } from "../auth";
import { safeNext } from "../App";
import { BrandMark, Field, Notice, useTitle } from "../components/ui";
import { Link, useRouter } from "../router";

const MIN_PASSWORD = 8;

function AuthCard({ title, sub, children, foot }: { title: string; sub?: ReactNode; children: ReactNode; foot?: ReactNode }) {
  useTitle(title);
  return (
    <main className="auth-wrap">
      <div className="auth-card">
        <Link to="/" className="brand" aria-label="dailyDSA, about the site"><BrandMark /><span>daily<b>DSA</b></span></Link>
        <div className="card card-pad">
          <h1>{title}</h1>
          {sub && <p className="sub">{sub}</p>}
          {children}
        </div>
        {foot && <p className="auth-foot">{foot}</p>}
      </div>
    </main>
  );
}

/** Form state shared by the four pages: busy flag, top-level error and per-field errors. */
function useForm() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiErr | Error | null>(null);
  const fieldErr = (name: string) => (err instanceof ApiErr ? err.field(name) : undefined);
  const topErr = err && !(err instanceof ApiErr && err.code === "invalid_request") ? errorMessage(err) : err ? "Please fix the fields below." : null;
  async function run(e: FormEvent, fn: () => Promise<void>) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await fn();
    } catch (x) {
      setErr(x instanceof Error ? x : new Error("Something went wrong."));
    } finally {
      setBusy(false);
    }
  }
  return { busy, run, fieldErr, topErr, setErr };
}

export function Login() {
  const { setUser } = useAuth();
  const { search, navigate } = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const f = useForm();
  const reset = search.get("reset") === "1";

  return (
    <AuthCard
      title="Log in"
      sub="One problem a day, one pattern a week."
      foot={<>Have an invite code? <Link to="/signup">Create an account</Link></>}
    >
      <form className="stack" onSubmit={(e) => f.run(e, async () => {
        const me = await api.login(email, password);
        setUser(me);
        navigate(safeNext(search.get("next")), { replace: true });
      })}>
        {reset && <Notice tone="ok">Your password was changed. Log in with the new one.</Notice>}
        {f.topErr && <Notice>{f.topErr}</Notice>}
        <Field label="Email" type="email" name="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} error={f.fieldErr("email")} />
        <Field
          label="Password" type="password" name="password" autoComplete="current-password" required value={password}
          onChange={(e) => setPassword(e.target.value)} error={f.fieldErr("password")}
        />
        <button className="btn btn-primary btn-lg" disabled={f.busy}>{f.busy ? "Logging in…" : "Log in"}</button>
        <Link to="/forgot-password" className="small" style={{ alignSelf: "center" }}>Forgot your password?</Link>
      </form>
    </AuthCard>
  );
}

export function Signup() {
  const { setUser } = useAuth();
  const { search, navigate } = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", inviteCode: search.get("code") ?? "" });
  const f = useForm();
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  return (
    <AuthCard
      title="Create your account"
      sub="dailyDSA is invite-only. Your code came from the admin."
      foot={<>Already have an account? <Link to="/login">Log in</Link></>}
    >
      <form className="stack" onSubmit={(e) => f.run(e, async () => {
        const me = await api.signup(form);
        setUser(me);
        navigate("/", { replace: true });
      })}>
        {f.topErr && <Notice>{f.topErr}</Notice>}
        <Field label="Invite code" name="inviteCode" required placeholder="DSA-XXXX-XXXX" autoComplete="off" spellCheck={false}
          className="mono" value={form.inviteCode} onChange={set("inviteCode")} error={f.fieldErr("inviteCode")} />
        <Field label="Name" name="name" required autoComplete="name" maxLength={60} value={form.name} onChange={set("name")} error={f.fieldErr("name")}
          hint="Shown to other solvers." />
        <Field label="Email" type="email" name="email" required autoComplete="email" value={form.email} onChange={set("email")} error={f.fieldErr("email")} />
        <Field label="Password" type="password" name="password" required minLength={MIN_PASSWORD} autoComplete="new-password"
          value={form.password} onChange={set("password")} error={f.fieldErr("password")} hint={`At least ${MIN_PASSWORD} characters.`} />
        <button className="btn btn-primary btn-lg" disabled={f.busy}>{f.busy ? "Creating…" : "Create account"}</button>
      </form>
    </AuthCard>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const f = useForm();

  if (sent) {
    return (
      <AuthCard title="Check your email" foot={<Link to="/login">Back to log in</Link>}>
        <p>
          If <b>{email}</b> has an account, a reset link is on its way. It works once and expires in 60 minutes.
        </p>
        <p className="muted small" style={{ marginTop: 12 }}>Nothing after a few minutes? Check spam, or ask the admin to reset it for you.</p>
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Reset your password" sub="We'll email you a link to choose a new one." foot={<Link to="/login">Back to log in</Link>}>
      <form className="stack" onSubmit={(e) => f.run(e, async () => {
        await api.forgotPassword(email);
        setSent(true);
      })}>
        {f.topErr && <Notice>{f.topErr}</Notice>}
        <Field label="Email" type="email" name="email" required autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={f.fieldErr("email")} />
        <button className="btn btn-primary btn-lg" disabled={f.busy}>{f.busy ? "Sending…" : "Send reset link"}</button>
      </form>
    </AuthCard>
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
      <AuthCard title="Reset link incomplete" foot={<Link to="/forgot-password">Ask for a new link</Link>}>
        <p>This page needs the full link from the email. Open it again from the email, or ask for a new one.</p>
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Choose a new password" sub="You'll be logged out on every device." foot={<Link to="/login">Back to log in</Link>}>
      <form className="stack" onSubmit={(e) => f.run(e, async () => {
        if (password !== confirm) throw new Error("The two passwords don't match.");
        await api.resetPassword(token, password);
        navigate("/login?reset=1", { replace: true });
      })}>
        {f.topErr && (
          <Notice>
            {f.topErr}
            {f.topErr.includes("expired") && <> <Link to="/forgot-password">Get a new link</Link>.</>}
          </Notice>
        )}
        <Field label="New password" type="password" name="password" required minLength={MIN_PASSWORD} autoFocus autoComplete="new-password"
          value={password} onChange={(e) => setPassword(e.target.value)} error={f.fieldErr("password")} hint={`At least ${MIN_PASSWORD} characters.`} />
        <Field label="Repeat it" type="password" name="confirm" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <button className="btn btn-primary btn-lg" disabled={f.busy}>{f.busy ? "Saving…" : "Set password"}</button>
      </form>
    </AuthCard>
  );
}
