// The admin page. Setters: schedule (day pins), the problem bank and track lessons. Admins also: track weeks,
// users and invite codes. Only the future can be changed (the server enforces it too).
import { useState } from "react";
import { ROLES, type AdminUser, type InviteCode, type Role, type ScheduleDay, type StaffProblem, type StaffTrack } from "@dailydsa/shared";
import { api, errorMessage } from "../../api";
import { useMe } from "../../auth";
import { addDays, fmtDay, fmtStamp } from "../../format";
import { CopyButton, LoadError, Notice, SkeletonRows, useLoad, useTitle } from "../../components/ui";
import { Link, useRouter } from "../../router";
import { TracksTab } from "./Lessons";

type Tab = "schedule" | "problems" | "tracks" | "users" | "invites";

export function Admin() {
  const me = useMe();
  const { path, navigate } = useRouter();
  const isAdmin = me.role === "admin";
  const tabs: [Tab, string][] = [["schedule", "Schedule"], ["problems", "Problems"], ["tracks", "Tracks"], ...(isAdmin ? ([["users", "Users"], ["invites", "Invite codes"]] as [Tab, string][]) : [])];
  const want = path.split("/")[2] as Tab | undefined;
  const tab: Tab = tabs.some(([t]) => t === want) ? want! : "schedule";
  useTitle(`Admin · ${tabs.find(([t]) => t === tab)![1]}`);

  return (
    <main className="page">
      <div className="page-head"><div><h1>Admin</h1><p>{isAdmin ? "Schedule, problems, lessons, users and invites." : "Schedule, problem bank and lessons."}</p></div></div>
      <div className="tabs admin-tabs" role="tablist">
        {tabs.map(([t, label]) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => navigate(`/admin/${t}`, { replace: true })}>{label}</button>
        ))}
      </div>
      {tab === "schedule" && <ScheduleTab isAdmin={isAdmin} />}
      {tab === "problems" && <ProblemsTab />}
      {tab === "tracks" && <TracksTab />}
      {tab === "users" && isAdmin && <UsersTab />}
      {tab === "invites" && isAdmin && <InvitesTab />}
    </main>
  );
}

/** Runs a mutation, shows its error, and reloads on success. */
function useAction(after: () => void) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  async function act(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    setError(null);
    try {
      await fn();
      after();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }
  return { error, busy, act, clear: () => setError(null) };
}

// ───────────── schedule ─────────────

function ScheduleTab({ isAdmin }: { isAdmin: boolean }) {
  const sched = useLoad(() => api.admin.schedule(), []);
  const probs = useLoad(() => api.admin.problems(), []);
  const tracks = useLoad(() => (isAdmin ? api.admin.tracks() : Promise.resolve([] as StaffTrack[])), [isAdmin]);
  const a = useAction(() => { sched.reload(); probs.reload(); });

  if (sched.error) return <LoadError error={sched.error} retry={sched.reload} />;
  if (!sched.data || !probs.data || !tracks.data) return <SkeletonRows n={10} />;
  const s = sched.data;
  const byDay = new Map(s.days.map((d) => [d.day, d]));
  const weekOf = new Map(s.weeks.map((w) => [w.weekStart, w]));
  const pinnable = probs.data.filter((p) => p.kind === "daily" && p.active);

  const firstMonday = addDays(s.from, -((new Date(`${s.from}T00:00:00Z`).getUTCDay() + 6) % 7));
  const mondays: string[] = [];
  for (let m = firstMonday; m <= s.to; m = addDays(m, 7)) mondays.push(m);

  return (
    <div className="stack">
      <p className="muted small">
        Past days and today are fixed. Pin a daily problem to a future day to replace its automatic pick
        {isAdmin ? "; choose which track runs in each future week." : "."}
      </p>
      {a.error && <Notice>{a.error}</Notice>}
      <div className="cal">
        {mondays.map((monday) => {
          const week = weekOf.get(monday);
          const weekFuture = monday > s.today;
          return (
            <section key={monday} className="card cal-week" aria-label={`Week of ${fmtDay(monday)}`} data-past={addDays(monday, 6) < s.today || undefined}>
              <div className="cal-week-head">
                <b>Week of {fmtDay(monday)}</b>
                {isAdmin && weekFuture ? (
                  <select
                    aria-label={`Track for the week of ${monday}`}
                    value={week?.track.pattern.slug ?? ""}
                    disabled={a.busy !== null}
                    onChange={(e) => {
                      const v = e.target.value;
                      void a.act(`w-${monday}`, () => (v ? api.admin.scheduleWeek(monday, v) : api.admin.unscheduleWeek(monday)));
                    }}
                  >
                    <option value="">No track</option>
                    {tracks.data!.map((t) => (
                      <option key={t.id} value={t.pattern.slug}>{t.title} ({t.ladder}/5 ladder)</option>
                    ))}
                  </select>
                ) : (
                  <span className={week ? undefined : "muted"}>{week ? `Track: ${week.track.title}` : "No track"}</span>
                )}
                {a.busy === `w-${monday}` && <span className="spinner" aria-label="Saving" />}
              </div>
              <div className="cal-days">
                {Array.from({ length: 7 }, (_, i) => {
                  const day = addDays(monday, i);
                  if (day < s.from || day > s.to) return <div key={day} className="cal-day" data-out />;
                  return <DayCell key={day} day={day} today={s.today} d={byDay.get(day)} pinnable={pinnable} a={a} />;
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function DayCell({ day, today, d, pinnable, a }: {
  day: string; today: string; d: ScheduleDay | undefined; pinnable: StaffProblem[]; a: ReturnType<typeof useAction>;
}) {
  const future = day > today;
  const weekend = [0, 6].includes(new Date(`${day}T00:00:00Z`).getUTCDay());
  const pools = weekend ? ["weekend", "weekday"] : ["weekday", "weekend"];
  return (
    <div className="cal-day" data-today={day === today || undefined} data-past={day < today || undefined} data-weekend={weekend || undefined}>
      <div className="cal-date">
        <span>{fmtDay(day).replace(",", "")}</span>
        {day === today ? <b>today</b> : <span>{weekend ? "weekend" : ""}</span>}
      </div>
      {d ? (
        <div className="cal-prob">
          <Link to={`/p/${d.problem.slug}`}>{d.problem.title}</Link>
          <span className="muted">{[d.problem.pattern?.name, d.pinnedBy ? `pinned by ${d.pinnedBy.name}` : "auto"].filter(Boolean).join(" · ")}</span>
        </div>
      ) : future ? null : (
        <div className="cal-prob"><span className="muted">No problem</span></div>
      )}
      {future && (
        <div className="row" style={{ gap: 6, marginTop: "auto" }}>
          <select
            className="cal-pin"
            aria-label={`Pin a problem on ${day}`}
            value={d?.pinnedBy ? d.problem.slug : ""}
            disabled={a.busy !== null}
            onChange={(e) => {
              const v = e.target.value;
              void a.act(day, () => (v ? api.admin.pin(day, v) : api.admin.unpin(day)));
            }}
          >
            <option value="">{d?.pinnedBy ? "Unpin (automatic)" : "Automatic"}</option>
            {pools.map((pool) => (
              <optgroup key={pool} label={`${pool[0]!.toUpperCase()}${pool.slice(1)} pool`}>
                {pinnable.filter((p) => p.pool === pool).map((p) => (
                  <option key={p.slug} value={p.slug}>{p.title}{p.pattern ? ` · ${p.pattern.name}` : ""}</option>
                ))}
              </optgroup>
            ))}
          </select>
          {a.busy === day && <span className="spinner" aria-label="Saving" />}
        </div>
      )}
    </div>
  );
}

// ───────────── problems ─────────────

function ProblemsTab() {
  const ps = useLoad(() => api.admin.problems(), []);
  if (ps.error) return <LoadError error={ps.error} retry={ps.reload} />;
  if (!ps.data) return <SkeletonRows n={6} />;
  if (ps.data.length === 0) {
    return <div className="card empty"><h3>No problems yet</h3><p>Add them with <code>pnpm dsa validate</code> and <code>pnpm dsa import</code>.</p></div>;
  }
  return (
    <div className="stack">
      <p className="muted small">Problems live in git (<code>problems/</code>) and are imported with the CLI; this list is read-only.</p>
      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr><th>Problem</th><th>Kind</th><th>Pattern</th><th className="r">Shown</th><th>Last shown</th><th>Next pin</th><th className="r">Solved by</th><th>Validated</th></tr>
          </thead>
          <tbody>
            {ps.data.map((p) => (
              <tr key={p.slug} className={p.active ? undefined : "past"}>
                <td>
                  <span className="stack-sm" style={{ gap: 2 }}>
                    <Link to={`/p/${p.slug}`}>{p.title}</Link>
                    <span className="muted small mono">{p.slug}{!p.active && " · retired"}</span>
                  </span>
                </td>
                <td className="small">{p.kind === "track" ? `Ladder #${p.track?.position ?? "?"}` : `Daily · ${p.pool}`}</td>
                <td className="small">{p.pattern?.name ?? "—"}</td>
                <td className="r num">{p.kind === "daily" ? p.timesShown : "—"}</td>
                <td className="small muted">{p.lastShownOn ? fmtDay(p.lastShownOn) : "—"}</td>
                <td className="small muted">{p.nextPinnedOn ? fmtDay(p.nextPinnedOn) : "—"}</td>
                <td className="r num">{p.solvedBy}</td>
                <td className="small muted nowrap">{fmtStamp(p.validatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ───────────── users ─────────────

function UsersTab() {
  const me = useMe();
  const users = useLoad(() => api.admin.users(), []);
  const [shown, setShown] = useState<{ user: AdminUser; password: string } | null>(null);
  const a = useAction(users.reload);

  if (users.error) return <LoadError error={users.error} retry={users.reload} />;
  if (!users.data) return <SkeletonRows n={6} />;

  return (
    <div className="stack">
      {a.error && <Notice>{a.error}</Notice>}
      {shown && (
        <div className="card card-pad stack-sm fade-in">
          <p>New password for <b>{shown.user.name}</b> ({shown.user.email}). It's shown only once; pass it on and ask them to change it.</p>
          <div className="row">
            <span className="secret">{shown.password}</span>
            <CopyButton text={shown.password} />
            <span className="grow" />
            <button className="btn btn-sm" onClick={() => setShown(null)}>Done</button>
          </div>
        </div>
      )}
      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Role</th><th className="r">Solved</th><th>Last submission</th><th>Joined</th><th>Invite</th><th /></tr>
          </thead>
          <tbody>
            {users.data.map((u) => {
              const self = u.id === me.id;
              return (
                <tr key={u.id} className={u.disabled ? "past" : undefined}>
                  <td>
                    <span className="stack-sm" style={{ gap: 2 }}>
                      <span style={{ fontWeight: 500 }}>{u.name}{self && <span className="muted"> (you)</span>}{u.disabled && <span className="badge badge-bad" style={{ marginLeft: 8 }}>Disabled</span>}</span>
                      <span className="muted small">{u.email}</span>
                    </span>
                  </td>
                  <td>
                    <select
                      aria-label={`Role of ${u.name}`}
                      value={u.role}
                      disabled={self || a.busy !== null}
                      onChange={(e) => void a.act(`r-${u.id}`, () => api.admin.updateUser(u.id, { role: e.target.value as Role }))}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="r num">{u.solved}</td>
                  <td className="small muted">{u.lastSubmissionAt ? fmtStamp(u.lastSubmissionAt) : "—"}</td>
                  <td className="small muted nowrap">{fmtStamp(u.createdAt)}</td>
                  <td className="small mono muted">{u.inviteCode ?? "—"}</td>
                  <td className="r nowrap">
                    {!self && (
                      <span className="row" style={{ gap: 4, justifyContent: "flex-end" }}>
                        <button
                          className="btn btn-sm btn-ghost"
                          disabled={a.busy !== null}
                          onClick={() => {
                            if (!confirm(`Reset ${u.name}'s password? They'll be logged out everywhere.`)) return;
                            void a.act(`p-${u.id}`, async () => setShown({ user: u, password: (await api.admin.resetPassword(u.id)).password }));
                          }}
                        >Reset password</button>
                        <button
                          className={`btn btn-sm btn-ghost${u.disabled ? "" : " btn-danger"}`}
                          disabled={a.busy !== null}
                          onClick={() => {
                            if (!u.disabled && !confirm(`Disable ${u.name}? They're logged out and can't log in until you enable them again.`)) return;
                            void a.act(`d-${u.id}`, () => api.admin.updateUser(u.id, { disabled: !u.disabled }));
                          }}
                        >{u.disabled ? "Enable" : "Disable"}</button>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ───────────── invites ─────────────

const STATE_TONE: Record<InviteCode["state"], string> = { active: "badge-ok", expired: "badge-warn", used_up: "", disabled: "badge-bad" };
const STATE_LABEL: Record<InviteCode["state"], string> = { active: "Active", expired: "Expired", used_up: "Used up", disabled: "Disabled" };

function InvitesTab() {
  const inv = useLoad(() => api.admin.invites(), []);
  const a = useAction(inv.reload);
  const [uses, setUses] = useState(1);
  const [role, setRole] = useState<Role>("solver");
  const [days, setDays] = useState("");

  if (inv.error) return <LoadError error={inv.error} retry={inv.reload} />;

  const signupLink = (code: string) => `${window.location.origin}/signup?code=${encodeURIComponent(code)}`;

  return (
    <div className="stack" style={{ gap: 24 }}>
      <section className="card card-pad">
        <h2 style={{ fontSize: 16, marginBottom: 16 }}>New invite code</h2>
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            const d = Number(days);
            void a.act("create", () => api.admin.createInvite({
              maxUses: uses, role, ...(days && d > 0 && { expiresAt: new Date(Date.now() + d * 86_400_000).toISOString() }),
            }));
          }}
        >
          <label className="field">
            <span>Uses</span>
            <input type="number" min={1} max={10000} required value={uses} onChange={(e) => setUses(Math.max(1, Number(e.target.value) || 1))} style={{ width: 100 }} />
          </label>
          <label className="field">
            <span>Role</span>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Expires after (days)</span>
            <input type="number" min={1} max={3650} placeholder="Never" value={days} onChange={(e) => setDays(e.target.value)} style={{ width: 150 }} />
          </label>
          <button className="btn btn-primary" disabled={a.busy !== null}>{a.busy === "create" ? "Creating…" : "Create code"}</button>
        </form>
      </section>

      {a.error && <Notice>{a.error}</Notice>}

      {!inv.data ? <SkeletonRows n={4} /> : inv.data.length === 0 ? (
        <div className="card empty"><p>No invite codes yet. Create one above and share its signup link.</p></div>
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr><th>Code</th><th>State</th><th>Role</th><th className="r">Used</th><th>Expires</th><th>Created</th><th /></tr>
            </thead>
            <tbody>
              {inv.data.map((c) => (
                <tr key={c.code}>
                  <td>
                    <span className="row" style={{ gap: 6 }}>
                      <span className="code-chip">{c.code}</span>
                      <CopyButton text={c.code} />
                      <CopyButton text={signupLink(c.code)} label="Copy link" />
                    </span>
                  </td>
                  <td><span className={`badge ${STATE_TONE[c.state]}`}>{STATE_LABEL[c.state]}</span></td>
                  <td className="small">{c.role}</td>
                  <td className="r num">{c.uses} / {c.maxUses}</td>
                  <td className="small muted nowrap">{c.expiresAt ? fmtStamp(c.expiresAt) : "Never"}</td>
                  <td className="small muted nowrap">{fmtStamp(c.createdAt)}{c.createdBy && ` · ${c.createdBy.name}`}</td>
                  <td className="r nowrap">
                    <span className="row" style={{ gap: 4, justifyContent: "flex-end" }}>
                      <button
                        className="btn btn-sm btn-ghost"
                        disabled={a.busy !== null}
                        onClick={() => {
                          const v = prompt(`Total uses for ${c.code} (at least ${Math.max(1, c.uses)}):`, String(c.maxUses));
                          if (v === null) return;
                          const n = Number(v);
                          if (!Number.isInteger(n) || n < 1) return;
                          void a.act(`u-${c.code}`, () => api.admin.updateInvite(c.code, { maxUses: n }));
                        }}
                      >Uses…</button>
                      {c.expiresAt && (
                        <button className="btn btn-sm btn-ghost" disabled={a.busy !== null}
                          onClick={() => void a.act(`e-${c.code}`, () => api.admin.updateInvite(c.code, { expiresAt: null }))}>No expiry</button>
                      )}
                      <button className="btn btn-sm btn-ghost" disabled={a.busy !== null}
                        onClick={() => void a.act(`d-${c.code}`, () => api.admin.updateInvite(c.code, { disabled: !c.disabled }))}>
                        {c.disabled ? "Turn on" : "Turn off"}
                      </button>
                      {c.uses === 0 && (
                        <button className="btn btn-sm btn-ghost btn-danger" disabled={a.busy !== null}
                          onClick={() => confirm(`Delete ${c.code}?`) && void a.act(`x-${c.code}`, () => api.admin.deleteInvite(c.code))}>Delete</button>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
