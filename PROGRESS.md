# dailyDSA — Progress log

Living status for picking work back up. **Read this first, then PLAN.md.**
Update it at the end of every work session (what changed, what's next, open questions).

## Current milestone

Platform + a handful of problems + **one** track (lesson + ladder). Other content is discussed later.
No server yet — everything runs locally in Docker; the Hostinger box is bought when the product is ready.

## Status by build step (PLAN §11)

| # | Step | Status |
|---|------|--------|
| 0 | go-judge spike | ✅ done — all checks pass (`spike/judge-spike.mjs`) |
| 1 | Schema | ✅ done — `packages/db/migrations/001_init.sql`, patterns seeded in `002` |
| 2 | Problem format + validate CLI (+2–3 problems) | ✅ done — `packages/cli`, `problems/README.md`, 3 problems validated + imported |
| 3 | Core app (accounts, daily, editor, Run/Submit, history, admin) | ⏳ in progress — 3.1 editor templates ✅, 3.2 server skeleton ✅, 3.3 auth + email reset ✅, 3.4 daily ✅, 3.5 problem view ✅, **3.6 Run/Submit next** |
| 4 | Solutions tab + polish | ☐ |
| 5 | Tracks (lesson, ladder, hints, progress, library, scheduling) | ☐ |
| 6 | Content: a few problems + one track | 🟡 started — first track is **two pointers** (ladder 1/5: `budget-pairs`) |
| 7 | Go live | ☐ later — server not bought |

### Problems so far

| Slug | Where | Notes |
|---|---|---|
| `rainfall-ledger` | daily · weekday · prefix-sums | range sums, 12 tests |
| `exact-gap` | daily · weekend · two-pointers | any valid pair → **checker** + `wrong.cpp` |
| `budget-pairs` | track two-pointers #1 | count pairs ≤ budget, 3 hints |

All limits currently sit at the 500 ms floor on the dev box (refs take 14–88 ms).

## How to run (dev, Windows + Docker Desktop)

```sh
docker compose up -d --build        # judge on 127.0.0.1:5050, Postgres on 127.0.0.1:55432
pnpm install
pnpm db:migrate                     # idempotent
pnpm typecheck
pnpm test                           # 70 tests; go-judge / db ones skip if those aren't up
pnpm dsa list                       # problem states
pnpm dsa validate --all             # ~11 s per problem
pnpm dsa import --all
pnpm server                         # API on 127.0.0.1:3000 (runs migrations first); GET /api/health
pnpm dsa admin create <email> <name...> [--password pw]   # first admin (prints a generated password)
pnpm dsa admin reset-password <email>                     # lock-out fallback
pnpm dsa invite create [--uses N] [--role solver|setter|admin] [--days D]
node spike/judge-spike.mjs          # full sandbox check incl. timing noise
```

Dev mail: with no `SMTP_URL`, emails (password-reset links) are printed in the server's console.
Production env: `SESSION_SECRET` (≥32 chars), `SMTP_URL` (e.g. `smtps://user:pass@smtp-relay.brevo.com:465`), `MAIL_FROM`, `APP_URL` (https) — the server refuses to start without them.

Dev DB URL: `postgres://dailydsa:dailydsa@127.0.0.1:55432/dailydsa` (5432 is blocked on this Windows machine).
If Docker Desktop isn't running: start it, wait for `docker info`; the first build after a start may fail with an rpc EOF — retry.

## Repo layout

```
judge/               go-judge image (Dockerfile, mount.yaml); runs with -parallelism 1
packages/shared      types shared by front+back: Lang, Verdict, JudgeResult, InputSpec, pools/roles/patterns
packages/judge       go-judge client + judge() orchestrator (compile once → run per test → checker → cleanup) + on-disk tests store (`tests-store.ts`, used by CLI and server)
packages/db          pg pool + SQL migration runner (migrations/NNN_*.sql)
packages/cli         `pnpm dsa` — list / new / validate / import / admin / invite
problems/            one folder per problem (+ _template, README.md)
apps/server          Express API: app factory, config, sessions, errors, auth, mailer, daily (`ist.ts`, `daily.ts`), problem page (`problems.ts`); `users.ts` is also used by the CLI. Queue worker comes in 3.6
spike/               throwaway go-judge proof
.data/               (gitignored) generated tests: .data/tests/<slug>/<hash>/NN.in|NN.ans
```

## Decisions made while building (beyond PLAN.md)

- **Sandbox mounts:** custom `judge/mount.yaml`; Ubuntu's JDK 21 needs `/etc/java-21-openjdk` bound in.
- **go-judge `-parallelism 1`:** the sandbox itself runs one job at a time, so timings match calibration even if the worker and CLI overlap.
- **OLE detection:** stdout reaching the cap ⇒ OLE even if the program then dies with non-zero exit (closed pipe).
- **Java MLE:** `java.lang.OutOfMemoryError` in stderr ⇒ MLE (JVM hits `-Xmx` = 80% of limit before the cgroup does; cgroup gets +128 MB headroom).
- **Measured on dev box:** C++ CPU-time sd ≈ 0.5 ms; Java JVM startup ≈ 17 ms CPU (not ~300 ms as first feared); Python ≈ 4 ms. Recalibrate on the real server.
- **Calibration:** per test, min CPU over 3 runs (filters noise); limit basis = the slowest test.
- **Daily pick:** least-recently-shown eligible problem (never-shown first, random tiebreak), stored in `daily_schedule` once. No shuffle-state table.
- **Queue:** the `submissions` table is the queue (`FOR UPDATE SKIP LOCKED`, one worker); no pg-boss.
- **Tests on disk, not in DB:** regenerable from git, keeps nightly DB backups small. `problems.tests_hash` points at them. In production, `DATA_DIR` is a Docker volume shared by the server and the CLI.
- **Problems in git, CLI imports:** `validation.json` records a hash of all source files; `import` refuses stale or unvalidated problems.
- **Checker exit codes:** 0 accept, 1 reject, anything else = checker/ref bug ⇒ IE (e.g. `exact-gap` exits 2 if a solver finds a pair the reference says doesn't exist).
- **Track rows** are created on first import of a track problem (title = pattern name); the lesson is filled in later (admin page).
- **Output comparison:** per-line trailing whitespace and trailing blank lines ignored; CRLF normalised.
- **Hidden tests:** only the first failing hidden test reveals its input/output.
- **Template conventions:** bool prints `YES`/`NO`; array returns print one per line unless `join: spaces` (new optional `InputSpec` field); Python collects output and writes once; Java prints through a shared buffered `out`; `void` = solve() prints itself. Var names starting with `_` or in `RESERVED_NAMES` are rejected by the yaml schema (the template uses `_it`, `_x`, `_res`, …).
- **Template `body` param:** the same generator will produce the lesson template code (PLAN §2), so lessons match the editor style.
- **API errors:** every non-2xx is `{ error: { code, message, details? } }`; zod failures → 400 `invalid_request` with per-field details; unexpected errors → 500 `internal`, logged, never leaked.
- **CSRF:** no tokens. State-changing `/api` requests must be `application/json` (415 otherwise), cookies are SameSite=Lax, and CORS is never enabled.
- **Password reset by email** (moved out of PLAN "Later"): `POST /auth/forgot-password` always answers `{ok:true}` and sends the mail after responding (no account enumeration by content or timing); at most one mail per account per 2 min. Token = 32 random bytes, only its SHA-256 is stored (`password_resets`, migration 003), valid 60 min, single use; a successful reset burns all of the user's tokens and deletes all their sessions. The link is `${APP_URL}/reset-password?token=…` — the web app needs that route.
- **Sessions:** login/signup regenerate the session id (no fixation). A session whose user is disabled or deleted is dropped on its next request. Changing the password logs out other devices; reset logs out all.
- **Rate limits (in-memory, per process):** failed logins 10 / 15 min per email and 30 / 15 min per IP; signup 10 / h per IP; forgot 5 / 15 min per IP; reset 10 / 15 min per IP. Resets on restart — fine for one server.
- **Login errors:** unknown email and wrong password give the same 401 `bad_credentials`, and an argon2 verify always runs (dummy hash). `account_disabled` (403) is only shown after a correct password.
- **Invite codes:** `DSA-XXXX-XXXX` from an unambiguous alphabet; input is trimmed + upper-cased. Use counted in the same transaction as the user insert (row lock), rolled back if the email is taken.
- **Dates:** the db package makes pg return DATE columns as `YYYY-MM-DD` strings (pg's default Date at local midnight shifts the day off-IST). IST helpers in `apps/server/src/ist.ts` use a fixed +05:30 offset (India has no DST).
- **Daily pick details:** "last shown" counts every `daily_schedule` row, future pins included, so a pinned problem isn't also picked just before its date. Weekend chain: week's track pattern → weekend problems of patterns whose track ran in an *earlier* week → weekday pool (also used if the week's track has no weekend problems). Insert is `ON CONFLICT (day) DO NOTHING` + read back, so racing requests are safe without a lock. **Missed days are backfilled** (`catchUpDaily`): every day from the first scheduled day through today gets a pick, oldest first, each by its own day's rules (that week's track etc.); runs at boot, at each rollover, and on `/today` when today is missing. Horizon 366 days.
- **Daily API** (`requireUser`): `GET /api/daily/today` (lazy pick; adds `nextRolloverAt`; 404 `no_daily` if the bank is empty), `GET /api/daily?before=&limit=` (archive, newest first, ≤ today, keyset paging via `nextBefore`), `GET /api/daily/:day` (future days 404 so pins can't be peeked). Entries carry status new/attempted/solved, `solvedAt`, `pattern` only after solve/unlock, `review.lastShownOn` for repeats. Types `DailyEntry`/`DailyToday`/`DailyArchive` in shared. `startDailyRollover` picks on boot and ~2 s after each IST midnight. `createApp` takes an injectable `now` clock.
- **Problem page** (`GET /api/problems/:slug`, `requireUser`, type `ProblemView`): statement, samples (first `sample_count` tests read from disk, cached per tests hash), templates for all 3 langs, limits, status, `solutionsUnlocked` / `canUnlockSolutions`, `anyValidAnswer` (has checker), `dailyDays`, and for track problems `{position, hints, hintsUsed}` (hint bodies come in step 5). **Who sees what:** solvers see a daily problem once it was the daily on a day ≤ today, and a track problem once Monday + position − 1 of any week its track ran has come (then forever); retired problems stay open. Everything else is 404 (same as an unknown slug) so pins/upcoming ladders can't be probed. Setters and admins see every problem. Pattern: track problems always, daily only after solve/unlock. The SQL condition is `openToSolvers()` in `problems.ts` — reuse it for Run/Submit.
- **Tests store moved** from the CLI to `@dailydsa/judge` (the server can't import the CLI, which depends on it); adds `readSamples()`.
- **Line endings:** `.gitattributes` forces LF (test files are compared byte-wise inside Linux).

## Next up — step 3: core app

Suggested order (each piece testable on its own):
1. ✅ **Editor templates**: `editorTemplate(lang, spec?, body?)` in `packages/shared/src/template.ts`. Conventions are in `problems/README.md`. `packages/cli/test/templates.test.ts` judges every problem's logic through its template within the calibrated limits (all 9 pass, max CPU < 60% of the limit).
2. ✅ **apps/server skeleton:** `createApp(deps)` in `apps/server/src/app.ts` (tests inject a MemoryStore, a fake pool and extra routers). `loadConfig()` reads env via zod; production refuses the dev `SESSION_SECRET`. Sessions in Postgres (`dsa.sid`, httpOnly, SameSite=Lax, secure in prod, 30 days rolling, no cookie until login). `parse(schema, body)` + one error handler → `ApiError` body (`packages/shared/src/api.ts`). argon2id helpers incl. `dummyHash()` for constant-time unknown-email logins. `GET /api/health`.
3. ✅ **Auth** (`apps/server/src/routes/auth.ts`): `POST /api/auth/signup|login|logout|forgot-password|reset-password`, `GET /api/me`, `POST /api/me/password`. Guards `requireUser` / `requireRole(...)` and `me(req)` in `src/auth.ts`. Mailer: SMTP (nodemailer) or console. CLI: `dsa admin create|reset-password`, `dsa invite create`.
4. ✅ **Daily:** IST date helper; `ensureDailyPick(day)` (weekday pool / weekend pool by week's track pattern / no-track weekend = patterns that already ran, fallback weekday pool); called lazily on request + on a timer at IST midnight. Archive endpoint.
5. ✅ **Problem view:** statement + samples (first `sample_count` tests from disk) + template + limits + my status; pattern tag only after solve/unlock.
6. **Run/Submit:** only for problems `openToSolvers` (or staff); insert into `submissions` (rate limit: one Run/Submit per user every ~5 s), worker loop claims rows (`FOR UPDATE SKIP LOCKED`, reset `running`→`queued` on boot), loads tests from disk, calls `judge()`, updates `user_problems`. Poll `GET /api/submissions/:id`.
7. **History** page data; **admin**: invite codes CRUD, password reset, pin a problem to a date, schedule track weeks.
8. **apps/web:** Vite + React + Monaco (laptop only): today, problem/editor, archive, history, admin, plus login / signup / forgot-password / `reset-password?token=` / change-password pages.

## Open questions / for later

- Upload test inputs to go-judge once per problem (fileId) instead of sending content per run — only if large tests prove slow.
- Advisory lock shared by the queue worker and the validate CLI (key reserved: 727002) — implement with the worker (go-judge `-parallelism 1` already prevents overlapping runs).
- Weekend pool needs ≥2 problems per track pattern; we have 1 for two-pointers (`exact-gap`), so a two-pointers weekend shows it Sat and Sun — the user will write more weekend problems (planned, step 6).
- Remaining two-pointers ladder problems (#2–#5) + lesson.
- Go live: pick the SMTP provider (Brevo / Zoho / SES), set up SPF + DKIM for the domain so reset mails don't land in spam.

## Session log

- **2026-11-11 (6)** — Step 3.5: problem page endpoint with release rules (daily day / track ladder day / staff), samples from disk, templates, limits, solve + solutions status, pattern reveal. Moved the tests store into `@dailydsa/judge`. 70 tests pass; checked live against `rainfall-ledger`. Open for the web step: the editor should restore the user's last code per language (comes with 3.6 submissions).

- **2026-11-11 (5)** — Step 3.4: IST helpers, daily pick rules (weekday / week-track / ran-tracks / weekday fallback), lazy + midnight-timer rollover, today / day / archive endpoints, DATE-as-string parser. 64 tests pass; checked live (boot picked rainfall-ledger for 2026-11-11). Then: missed days are backfilled so the archive has no holes (user's call); 66 tests.

- **2026-11-11** — Reviewed plan, recorded decisions (git-folder problems, 24/6 launch mix, platform-first milestone). Built + passed go-judge spike. Scaffolded pnpm/TS monorepo (shared, judge, db, cli). Schema + migrations. Validate/import CLI with 19 passing tests. First 3 problems validated and imported. Picked two pointers as the first track.
- **2026-11-11 (4)** — Step 3.3: auth (signup with invite, login, logout, me, change password) + password reset by email (migration 003, mailer, PLAN §5/§8/§13 updated). CLI `admin create|reset-password`, `invite create`. Fixed: dropping a stale session left `req.session` undefined. 55 tests pass; reset flow checked live against the running server.
- **2026-11-11 (3)** — Step 3.2: `apps/server` skeleton (Express 5, pg sessions, zod, error handler, argon2, health). `migrate(url?)`. pnpm `allowBuilds` for argon2/esbuild. 46 tests pass.
- **2026-11-11 (2)** — Step 3.1: editor templates for C++/Java/Python + generic fallback; `join` field; reserved-name check; template-judging integration test over all 3 problems. 35 tests pass.
