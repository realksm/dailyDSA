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
| 3 | Core app (accounts, daily, editor, Run/Submit, history, admin) | ✅ done — 3.1–3.7 API + 3.8 web app (`apps/web`) |
| 4 | Solutions tab + polish | ✅ done — unlock + solutions API, Statement/Solutions tabs, pattern → track link (polish ideas moved to open questions) |
| 5 | Tracks (lesson, ladder, hints, progress, library, scheduling) | ✅ done — tracks API + hints + lesson editor, `/tracks`, `/tracks/:pattern`, Today card |
| 6 | Content: a few problems + one track | ✅ done for the milestone — **two pointers** track (lesson + ladder 5/5), 2 weekend + 3 weekday daily problems |
| 7 | Go live | ☐ later — server not bought |

### Problems so far

| Slug | Where | Notes |
|---|---|---|
| `rainfall-ledger` | daily · weekday · prefix-sums | range sums, 12 tests |
| `exact-gap` | daily · weekend · two-pointers | any valid pair → **checker** + `wrong.cpp` |
| `budget-pairs` | track two-pointers #1 | count pairs ≤ budget (opposite ends, count `r - l` at once) |
| `nearest-readings` | track two-pointers #2 | min distance between aᵢ and bⱼ across two lists (walk two sorted lists) |
| `cable-cars` | track two-pointers #3 | fewest cars, ≤ 2 people and ≤ C kg each (greedy from both ends, `l <= r`) |
| `shared-free-time` | track two-pointers #4 | total overlap of two sorted slot lists (drop the slot that ends first) |
| `even-stacks` | track two-pointers #5 | fewest adjacent merges to a palindrome (running sums from both ends); naive = O(n²) prefix-sum matching |
| `three-platforms` | daily · weekend · two-pointers | one value from each of 3 lists, min max − min (advance the minimum) |
| `trail-days` | daily · weekday · binary-search-answer | split into ≤ d consecutive days, min longest day |
| `signal-towers` | daily · weekday · monotonic-stack | next strictly taller to the right, `join: spaces` |

Every track problem has 3 hints. Bank now: 3 weekday, 2 weekend (both two-pointers), 5 track.
Limits sit at the 500 ms floor on the dev box except Python on `shared-free-time` (600), `three-platforms` and `trail-days` (900); slowest refs: C++ 43 ms, Java 75 ms, Python 278 ms.

## How to run (dev, Windows + Docker Desktop)

```sh
docker compose up -d --build        # judge on 127.0.0.1:5050, Postgres on 127.0.0.1:55432
pnpm install
pnpm db:migrate                     # idempotent
pnpm typecheck                      # tsc -b (packages + server) && tsc -p apps/web
pnpm test                           # 117 tests; go-judge / db ones skip if those aren't up
pnpm dsa list                       # problem states
pnpm dsa template <slug> cpp > problems/<slug>/ref.cpp   # start a ref from the editor template
pnpm dsa validate --all             # ~11 s per problem
pnpm dsa import --all                # problems + every track's ladder order and lesson (problems/_tracks/)
pnpm dsa track new <pattern> <slug1..5> --weekend <slugA> <slugB>   # a whole track: ladder file, lesson outline, folders
pnpm dsa track add <pattern> <slug>... [--weekend <slug>...]
pnpm dsa track check|import <pattern>|--all
pnpm server                         # API on 127.0.0.1:3000 (runs migrations first) + judge worker; GET /api/health
pnpm web                            # Vite on http://127.0.0.1:5173, proxies /api to :3000 (API_URL=… to change)
pnpm web:build                      # apps/web/dist; the server then serves it too (WEB_DIR), SPA fallback
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
packages/db          pg pool + SQL migration runner (migrations/NNN_*.sql) + `withJudgeLock` (advisory lock 727002)
packages/cli         `pnpm dsa` — list / new / validate / import / admin / invite
problems/            one folder per problem (+ _template, README.md)
apps/server          Express API: app factory, config, sessions, errors, auth, mailer, daily (`ist.ts`, `daily.ts`), problem page (`problems.ts`), Solutions tab (`solutions.ts`), tracks + hints (`tracks.ts`, `routes/tracks.ts`), Run/Submit queue + judge worker (`submissions.ts`, `routes/submissions.ts`), history (`history.ts`), admin API (`admin.ts`, `routes/admin.ts`); `users.ts` is also used by the CLI
apps/web             Vite + React 19 + Monaco: today, archive, tracks + lesson, problem/editor, history, submission, account, admin (incl. lesson editor), auth pages
spike/               throwaway go-judge proof
.claude/skills/      project skills: daily-problem, new-track (how to write content)
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
- **Run/Submit API** (`requireUser`): `POST /api/problems/:slug/run` `{lang, code, customInput?}` and `/submit` `{lang, code}` → 202 `{id, status:"queued"}`; poll `GET /api/submissions/:id` (type `SubmissionView`, owner or admin, else 404; `queuePosition` while waiting). Same release rules as the problem page (`openToSolvers` or staff). Limits: code and custom input 64 KB each; Java without a `class Main` (comments ignored, `javaHasMainClass` in shared, also used by the CLI for ref.java) → 400 `java_main_class` before the rate limit; **one submission in flight per user** (409 `busy`) and one Run/Submit per 5 s (429, in-memory, keyed by user, uses the app clock). `ProblemView.lastCode` = latest code per language, so the editor reopens where the user left off.
- **Run** = the samples (all evaluated, no stop) + the custom input as an extra test (`custom: true`, no expected output — AC means it ran cleanly; empty box = no custom test). **Submit** = every test, stops at the first failure. Neither is shown to anyone else.
- **Worker** (`startJudgeWorker` in main.ts): loop = take the judge lock → claim the oldest queued row (`UPDATE … WHERE id = (SELECT … FOR UPDATE SKIP LOCKED)`) → judge → store → unlock. Taking the lock *before* claiming means a row never sits in `running` while `dsa validate` holds the lock. Idles 1 s between polls; the routes kick it awake on enqueue. Boot requeues `running` rows; shutdown finishes the current one (10 s cap, else boot requeues it).
- **Judge failures:** go-judge unreachable/hung (`JudgeUnavailableError` from the client: network error or 120 s fetch timeout) → row back to `queued`, retry every 5 s, logged once. Anything else (tests missing on disk, go-judge 5xx) → verdict **IE**, logged, never retried.
- **Progress (Submit only, one SQL statement with the verdict):** `submit_count`+1 for everything but IE; `first_attempt_at` (= Show solutions button) for anything but CE/IE; first AC sets `solved_at` + `solved_verdict_lang`; later verdicts never unsolve. Times are the **submission's `created_at`**, not the judging time, so a Submit at 23:59 IST counts for that day. `solutions_unlocked_at` stays NULL on solve (only the button sets it), so "solved after viewing solutions" = `solutions_unlocked_at < solved_at`.
- **Judge lock:** `pnpm dsa validate` takes it per problem (live submissions get judged between problems); without a reachable DB it validates unlocked with a note.
- **History API** (`requireUser`, own data only): `GET /api/history` → every problem the user ran, submitted, unlocked or took a hint on (status, submit/run counts, first attempt, solved + language, `solvedAfterSolutions` = unlocked before solving, hints, pattern by the usual reveal rule, ladder position, daily days ≤ today, `lastActivityAt`), newest activity first, no paging (~70 problems). `GET /api/submissions?problem=&kind=run|submit&before=&limit=` → own submissions without code, keyset by id (`nextBefore`); the code is in `GET /api/submissions/:id`. Counts/streaks are left to the web app.
- **Admin API** (`/api/admin`). Admin only: `GET users`, `PATCH users/:id {role?, disabled?}` (not yourself → 400 `self`; disabling also deletes their sessions), `POST users/:id/reset-password` → `{password}` shown once (random 16 chars, logs them out everywhere; not yourself); `GET/POST invites`, `PATCH invites/:code {disabled?, maxUses?, expiresAt?|null}` (maxUses never below uses → `below_uses`, checked in the same UPDATE), `DELETE invites/:code` only if never used (else 409 `invite_used` → disable it); invite `state` = active/expired/used_up/disabled by the DB clock (same as signup); `PUT/DELETE schedule/weeks/:monday {pattern}` (track must exist → 404 `no_track`). Admin + setter: `GET problems` (whole bank: times shown, last shown, next pin, solved-by), `GET tracks` (with ladder size), `GET schedule?from=&to=` (days incl. future pins + weeks overlapping the range; default −7…+56 days, ≤400), `PUT/DELETE schedule/days/:day {slug}` = pin / unpin. **Only the future can change:** days and weeks ≤ today (incl. today and the running week) → 400 `not_future`. Pins must be active daily problems (`not_daily`, `retired`); a pin replaces an earlier pin; unpinning lets the day get an automatic pick.
- **CSRF guard and DELETE:** bodyless `DELETE` is exempt from the JSON-only rule — it's never a CORS "simple" method, so a cross-site one always needs the preflight we never grant. POST still must be JSON.
- `randomPassword()` moved to `apps/server/src/users.ts` (CLI and admin route share it).
- **Line endings:** `.gitattributes` forces LF (test files are compared byte-wise inside Linux).
- **Web app (`apps/web`):** Vite 8 + React 19, no router library (`src/router.tsx`, ~70 lines, history API) and no state library (`useLoad` in `components/ui.tsx`). `src/api.ts` = typed client over the shared types; non-2xx → `ApiErr` (code, message, per-field `details` shown under form fields); a 401 `unauthorized` anywhere signs the app out and sends you to `/login?next=…` (only same-site paths are followed). Typechecked separately (`tsc -p apps/web`, bundler resolution, imports `@dailydsa/shared` source directly).
- **Routes:** `/` today (countdown, streak, this week, recent days), `/archive` (paged, filter), `/p/:slug`, `/history` (problems; `?tab=submissions`, `?problem=slug`), `/submissions/:id`, `/account` (change password), `/admin/{schedule,problems,users,invites}` (setters: schedule + problems), `/login`, `/signup?code=` (the admin's "Copy link"), `/forgot-password`, `/reset-password?token=`.
- **Editor:** Monaco bundled locally (`monaco-editor/editor/editor.main.js` + only the editor worker, `loader.config({ monaco })`, no CDN), lazy-loaded so non-editor pages stay ~220 KB gz. Code per language starts from the local draft (localStorage `dsa.draft.<slug>.<lang>`), else `lastCode`, else the template; "Reset to template". Ctrl+Enter = Run, Ctrl+Shift+Enter = Submit. The client mirrors the 5 s cooldown and the Java `class Main` check, polls `/submissions/:id` every 1 s, and reloads the problem after a Submit (status, pattern reveal).
- **Streak (client-side):** consecutive days up to today (or yesterday while today is open) whose daily was solved by the end of that IST day. Solving a missed day later doesn't count; a review day already solved does.
- **Markdown:** react-markdown + remark-gfm + remark-math + rehype-katex; no raw HTML (no rehype-raw), so no separate sanitiser is needed.
- **Look:** see `.tastemaker/style-lock.md` (tokens, fonts, contrast). Light/dark follow the OS; IBM Plex Sans/Mono via @fontsource (no Google Fonts request). `min-width: 1024px` (laptops only).
- **Dependency age policy:** pnpm enforces a minimum release age (1 day). If an install fails on a too-new version, pin an older one; never keep the `minimumReleaseAgeExclude` entry pnpm may write into pnpm-workspace.yaml. Vite is pinned to 8.3.7 (same as vitest uses), @vitejs/plugin-react to 6.1.2.
- **Serving the build:** if `WEB_DIR` (default `apps/web/dist`) has an `index.html`, the server serves `/assets` as immutable (an unknown asset is a 404, not index.html) and answers other non-/api GETs with index.html (`Cache-Control: no-cache`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` so the reset token never leaks).
- **Solutions tab API** (`requireUser`, same 404 release rules as the problem page): `POST /api/problems/:slug/unlock-solutions` = the Show solutions button → the updated `ProblemView`; needs `first_attempt_at` (a non-CE Submit) else 403 `no_attempt`; idempotent, and a no-op once solved (so solving never counts as "after viewing"). The unlock time is the DB clock, like submissions' `created_at` it's compared with. `GET /api/problems/:slug/solutions?lang=&before=&limit=` (type `Solutions`) → 403 `solutions_locked` until solved/unlocked; `official` = `problem_solutions` (the refs, already stored by `dsa import`), `accepted` = per author + language only the **latest** AC Submit (Runs never count), newest first, keyset by submission id, limit ≤ 50 (default 20). Shows author names (invite-only group) and `mine`.
- **Staff get no shortcut** to solutions: setters/admins open problems early but follow the same unlock rules (they have the refs in git; the admin also solves dailies, so no spoilers).
- **`ProblemView.pattern.trackOpen`**: the pattern's track has a week starting ≤ today. Daily problems then link "Practise more in the X track →" to `/tracks/:pattern` (the page arrives in step 5), else "A track for this pattern is coming".
- **Web Solutions tab:** left pane has Statement / Solutions tabs (sticky); locked view explains the rule and shows the button (with a confirm) when allowed; unlocked = language filter (defaults to the editor's language), reference code pinned on top, accepted code as collapsible cards (author, time, memory, Copy). Monaco (read-only) mounts only for open cards. After a first AC the result notice offers "See how others solved it".
- **Reference solutions follow the editor template** (user's rule): they're the official code on the Solutions tab, so they look like the editor. `templateMismatch()` in shared: the `solve` line (or `main` for the generic template) must be there unchanged and everything after the solver's part must equal the template; helpers/includes above `solve` are allowed. `loadProblem` enforces it, so every `dsa` command refuses a ref that drifts. `pnpm dsa template <slug> <lang>` prints the template to start from. All 3 problems' refs were rewritten this way, re-validated and imported.
- **Monaco keybindings are global:** `editor.addCommand` bindings are shared by every editor on the page (last registered wins), so read-only viewers register none — otherwise Ctrl+Enter in the real editor broke once a solution card opened. Read-only viewers also pass the mouse wheel to the page at their ends and hide the line highlight.
- **Tracks API** (`requireUser`): `GET /api/tracks` (type `TrackLibrary`: running track first, then released by first week; staff also see unreleased/unscheduled ones, marked `released: false`) and `GET /api/tracks/:pattern` (`TrackView` = summary + `lessonMd`). Solvers see a track once one of its weeks has started (404 before, like problems). Each ladder step: `open` by exactly the `openToSolvers` rule, `opensOn` (next ladder day of a scheduled run) while locked, `problem` hidden while locked (staff always get it), status, hints/hintsUsed. `weeks` lists every run, past and future; `runningWeek` = the Monday of the week containing today. Progress = solved / ladder size (not a fixed 5, while ladders are being written).
- **Hints:** `POST /api/problems/:slug/hints {level}` → updated `ProblemView`. Only the next level (`hint_order` otherwise); a level already taken is a no-op (double clicks); `no_hints` for daily or hintless problems, `no_such_hint` above the count; same 404 release rules. `ProblemView.track.revealed` = bodies of the hints taken. Migration 004 adds `user_problems.first_hint_at`/`last_hint_at`: history's `solvedWithHints` = first hint before solving (like "solved after viewing solutions"), and the latest hint counts as activity. Hints after solving are allowed and don't mark it. The web asks for a confirm before the first hint on an unsolved problem.
- **Lessons live in git** (user's call, replacing the first admin-page editor): `problems/_tracks/<pattern>.md`, first line `# Title`, then the sections `LESSON_SECTIONS` (shared) in order. Checked/imported by `pnpm dsa track check|import` (was `dsa lesson …`); `dsa import --all` also imports every lesson; `dsa list` shows lessons. Why git: lessons are coupled to the ladder problems (already in git), get history/diffs, move to the real server with everything else, and can be checked. **Check:** title 3–100 chars, the four sections, and `## Template code` has exactly one C++, Java and Python block per group, each passing `templateMismatch` against a ladder problem's `input:` (problems loaded from git; the generic template only counts if a ladder problem uses it, since it matches almost anything). Import upserts `tracks` (creates the row if no ladder problem was imported yet) and only bumps `updated_at` when the title or text changed; problem import never touches a track's title or lesson. The ladder (lesson section 5) is drawn by the track page. Setters/admins preview an imported lesson on `/tracks/<pattern>` (they see unreleased tracks).
- **Lesson code blocks:** C++/Java/Python fences (`cpp`/`c++`, `java`, `py`/`python`) separated only by blank lines are one group (`lessonParts` in `packages/shared/src/lesson.ts`, used by both the CLI check and the site), shown as one read-only Monaco block with a tab per language, starting on the solver's editor language.
- **Lesson template code gives nothing away:** `## Template code` keeps a ladder problem's editor template (so `lesson check` passes) but fills `solve()` with a *different* example task — two pointers: closest pair sum to a target in the `budget-pairs` shape, shared values of two lists in the `nearest-readings` shape. The example code was compiled and run in all three languages. Keep code lines ≤ ~70 chars: the lesson's code viewer is narrow and cuts longer lines.
- **Input var names don't shadow Python built-ins** (`len`, `sum`, `max`, …): `trail-days` uses `dist`, not `len`. Added to problems/README.md.
- **Writing refs:** a scratch splice script (template from `dsa template` + a solve() body) was used; it isn't in the repo. Generating the template by hand with `pnpm dsa template` works the same.
- **Ladder files** (user's call, session 15): a track's order lives in `problems/_tracks/<pattern>.yaml` (`ladder:` = 1–5 slugs, easiest first, position = index + 1), not in each problem. Track problems' `problem.yaml` has `kind: track` and no pool/pattern/position (the schema rejects `position` with a pointer to the ladder file). `loadProblem` derives `pattern` + `track: {pattern, position}`; a track problem must be in exactly one ladder and a daily problem in none. Positions aren't in a problem's source hash, so **reordering needs no re-validation**. Importing a track problem rewrites its track's whole DB ladder from the file (`syncLadder`: delete the track's rows + rows of problems moving in, insert in order), so swaps never hit the old unique position; ladder problems not imported yet leave an empty slot and are reported.
- **`dsa track new|add|check|import`** (`packages/cli/src/track.ts`): `new <pattern> <slugs> --weekend <slugs>` validates everything first (≤ 5, no slug in two ladders, existing folders reused only if they already fit), then writes the ladder file, the lesson outline and folders from `_template` (track: `kind: track` + three `TODO:` hints; weekend: `pool: weekend` + pattern). `check` = ladder n/5, each problem's validation state, TODO hints, weekend count (by problem.yaml alone, so unfinished ones count; < 2 warns), lesson. `import` = ladder + weekend problems, ladder sync, lesson. `dsa list` shows one summary line per track. The `dsa lesson` command is gone.
- **New folders load at once:** `dsa new` and `track new|add` write `ref.cpp/java/py` as the editor template of the yaml's `input:` (the old `_template/ref.*` stubs, which failed the template check, were removed).
- **Web tracks:** `/tracks` (cards: when it runs, ladder dots, n/m solved), `/tracks/:pattern` (lesson + sticky ladder), "This week's track" card on Today (today's ladder problem Mon–Fri, else the first unsolved open one), Tracks nav link, breadcrumb + hints box on ladder problems, Admin → Tracks tab (read-only: each track, ladder size, lesson imported or missing, last import).

## Step 3 log: core app

Suggested order (each piece testable on its own):
1. ✅ **Editor templates**: `editorTemplate(lang, spec?, body?)` in `packages/shared/src/template.ts`. Conventions are in `problems/README.md`. `packages/cli/test/templates.test.ts` judges every problem's logic through its template within the calibrated limits (all 9 pass, max CPU < 60% of the limit).
2. ✅ **apps/server skeleton:** `createApp(deps)` in `apps/server/src/app.ts` (tests inject a MemoryStore, a fake pool and extra routers). `loadConfig()` reads env via zod; production refuses the dev `SESSION_SECRET`. Sessions in Postgres (`dsa.sid`, httpOnly, SameSite=Lax, secure in prod, 30 days rolling, no cookie until login). `parse(schema, body)` + one error handler → `ApiError` body (`packages/shared/src/api.ts`). argon2id helpers incl. `dummyHash()` for constant-time unknown-email logins. `GET /api/health`.
3. ✅ **Auth** (`apps/server/src/routes/auth.ts`): `POST /api/auth/signup|login|logout|forgot-password|reset-password`, `GET /api/me`, `POST /api/me/password`. Guards `requireUser` / `requireRole(...)` and `me(req)` in `src/auth.ts`. Mailer: SMTP (nodemailer) or console. CLI: `dsa admin create|reset-password`, `dsa invite create`.
4. ✅ **Daily:** IST date helper; `ensureDailyPick(day)` (weekday pool / weekend pool by week's track pattern / no-track weekend = patterns that already ran, fallback weekday pool); called lazily on request + on a timer at IST midnight. Archive endpoint.
5. ✅ **Problem view:** statement + samples (first `sample_count` tests from disk) + template + limits + my status; pattern tag only after solve/unlock.
6. ✅ **Run/Submit:** queue API, worker, judge lock, progress updates, `lastCode`.
7. ✅ **History + admin API:** history and own-submissions list; admin users / invites / password reset; staff problem list, schedule view, pins; admin track weeks.
8. ✅ **apps/web:** every page above, checked live in headless Chromium (login → Run → Submit AC → solved + pattern shown; admin invite create, pin/unpin, week schedule/unschedule; light + dark).

## Next up

The first milestone (platform + a handful of problems + one track) is reached. Choose with the user:
- **More content** (PLAN §10/§12): grow the weekday bank towards ~24, and the next launch tracks (lesson + 5-problem ladder + 2 weekend problems each). Natural next track: sliding window (the two-pointers lesson already points to it).
- **Step 7, go live:** buy the server, setup script + guide, re-run `pnpm dsa validate --all` there, backups.
- Smaller polish from the open questions below (CSP header, draggable split).

## Open questions / for later

- Upload test inputs to go-judge once per problem (fileId) instead of sending content per run — only if large tests prove slow.
- The dev DB has a test admin from the 3.8 browser check: `webcheck@example.test` (id 239); the step 4 check also left it a WA Submit on `exact-gap` and an unlock (solutions opened before solving). Keep it for trying the UI (`pnpm dsa admin reset-password webcheck@example.test` for a new password) or delete it.
- Servers from earlier sessions (started 09:37 / 09:50 / 09:52) may still be running on ports 3000–3002 with older code; stop them and restart `pnpm server` to get the current API.
- **Dev DB:** two-pointers is scheduled for the week of 2026-11-09 (inserted by SQL for the step 5 browser check, since the API only schedules future weeks), so the Today card and `/tracks` show it. Undo with `DELETE FROM track_weeks WHERE week_start = '2026-11-09'`. The `webcheck` admin also took hint 1 on `budget-pairs`.
- Polish left from step 4: a CSP header for the served app (needs a browser check: Monaco injects inline styles), a draggable split between statement and editor.
- Go live: pick the SMTP provider (Brevo / Zoho / SES), set up SPF + DKIM for the domain so reset mails don't land in spam.

## Session log

- **2026-11-11 (16)** — Project skills for writing content: `.claude/skills/daily-problem/SKILL.md` (design → yaml → statement → gen.py → template refs → naive → checker → validate → import → docs) and `.claude/skills/new-track/SKILL.md` (plan the ladder + weekend problems, `dsa track new`, hints, lesson rules incl. running the example code in the judge container, `track check` until ready, import, docs).

- **2026-11-11 (15)** — Tracks are easier to create: the ladder order moved from each problem's `position` into `problems/_tracks/<pattern>.yaml`; new `pnpm dsa track new|add|check|import` (scaffold a whole track with its weekend problems, check what's missing, import it all); importing rewrites the DB ladder from the file in one go; new folders get template refs so they load at once; `dsa lesson` replaced by `dsa track`. two-pointers migrated (5 problem.yaml lost pattern/position → re-validated, same limits; DB ladder unchanged). 117 tests pass (new `track.test.ts`: ladder schema, scaffold guards, reorder, one-ladder rule, check, `syncLadder` in a rolled-back transaction); CLI also exercised on a scratch copy of `problems/`.

- **2026-11-11 (14)** — Step 6 content: two-pointers ladder #2–#5 (`nearest-readings`, `cable-cars`, `shared-free-time`, `even-stacks`, 3 hints each), weekend `three-platforms`, weekday `trail-days` (binary search on the answer) and `signal-towers` (monotonic stack); all validated (naive TLEs on 3–7 tests each) and imported. Lesson `problems/_tracks/two-pointers.md` written (spotting clues, the "which pointer is useless?" argument, three shapes, worked example, two language-tabbed example templates, common mistakes), checked and imported; example code run in C++/Java/Python. `signal-towers` added to templates.test.ts (first `int[]` + `join: spaces` problem). 110 tests pass. Lesson page, library and problem pages checked in headless Chromium on PORT=3006 (light + dark, no page errors).

- **2026-11-11 (13)** — Lessons moved to git: `problems/_tracks/<pattern>.md`, `dsa lesson new|check|import` (checks title, sections and that the template code follows a ladder problem's editor template), `dsa import --all` includes lessons. Removed the admin lesson editor and its API (`GET/PATCH /api/admin/tracks/:pattern`); Admin → Tracks is a read-only list. `lessonParts` moved to `packages/shared`. 107 tests pass; CLI checked on a scratch copy of `problems/`.

- **2026-11-11 (12)** — Step 5: tracks. `GET /api/tracks` + `/tracks/:pattern` (release rule, ladder open/locked/opensOn, progress), hints `POST …/hints` (in order, idempotent; migration 004 hint times → history `solvedWithHints`), admin/setter lesson editing with a stale-save guard and per-problem template insertion. Web: Tracks library, lesson page with language-tabbed code, Today's week-track card, hints box, Admin → Tracks editor. 100 tests pass; walked through in headless Chromium on PORT=3005 (library → outline + template → save → lesson page → Today card → hint 1 → history), no page errors. Next: step 6 content (two-pointers ladder #2–#5 + lesson).

- **2026-11-11 (10)** — Step 4: Show solutions button (`POST …/unlock-solutions`) and the solutions list (`GET …/solutions`: reference code + latest accepted code per author and language, language filter, paging); `pattern.trackOpen` for the track link. Web: Statement / Solutions tabs, locked view + confirm, collapsible read-only code cards. Fixed Ctrl+Enter breaking once a read-only editor mounted (Monaco keybindings are page-global). 94 tests pass; checked in headless Chromium on PORT=3004 (lock → unlock → list → filter → Ctrl+Enter still runs; light + dark). Next: step 5 (tracks).
- **2026-11-11 (11)** — Reference solutions now follow the editor template (enforced by `loadProblem`, new `dsa template` command, README + `_template` updated); refs of exact-gap, rainfall-ledger and budget-pairs rewritten as template + `solve()` body, re-validated (limits unchanged, 500 ms floor) and imported. 96 tests pass.
- **2026-11-11 (9)** — Step 3.8: `apps/web` (Vite + React 19 + Monaco): auth pages, today, archive, problem page with editor/Run/Submit/results, history + submissions, submission page, account, admin (schedule + pins + track weeks, problems, users, invites). The server serves the built app (`WEB_DIR`, 3 new tests). 89 tests pass; walked through every page in headless Chromium against a fresh server (PORT=3003). Step 3 is complete. Then: a blank problem page traced to a stale server on :3000 (no `lastCode`); the page now guards it and routes sit in an `ErrorBoundary`. Next: step 4 (Solutions tab).

- **2026-11-11 (8)** — Step 3.7: `GET /api/history`, `GET /api/submissions` (own, paged), `/api/admin/*` (users: role/disable/reset password; invite codes CRUD; problems; tracks; schedule view; day pins for staff; track weeks for admins; future-only edits). Bodyless DELETE allowed past the JSON guard. 86 tests pass; live boot checked on PORT=3002. Next: 3.8 web app (Vite + React + Monaco).

- **2026-11-11 (7)** — Step 3.6: Run/Submit endpoints, `submissions`-table queue + worker (lock → claim → judge → store), judge lock shared with `dsa validate`, go-judge outages requeue instead of failing, Submit updates progress, `lastCode` on the problem page. 77 tests pass (incl. real judging of AC/WA/CE/Run+custom/IE). Checked live: `rainfall-ledger` ref.cpp → AC on 12 tests via HTTP, `busy` while queued. Note: a server started 09:37 (old code) was still on port 3000, so the live check ran on PORT=3001 — restart it to get the new routes.

- **2026-11-11 (6)** — Step 3.5: problem page endpoint with release rules (daily day / track ladder day / staff), samples from disk, templates, limits, solve + solutions status, pattern reveal. Moved the tests store into `@dailydsa/judge`. 70 tests pass; checked live against `rainfall-ledger`. Open for the web step: the editor should restore the user's last code per language (comes with 3.6 submissions).

- **2026-11-11 (5)** — Step 3.4: IST helpers, daily pick rules (weekday / week-track / ran-tracks / weekday fallback), lazy + midnight-timer rollover, today / day / archive endpoints, DATE-as-string parser. 64 tests pass; checked live (boot picked rainfall-ledger for 2026-11-11). Then: missed days are backfilled so the archive has no holes (user's call); 66 tests.

- **2026-11-11** — Reviewed plan, recorded decisions (git-folder problems, 24/6 launch mix, platform-first milestone). Built + passed go-judge spike. Scaffolded pnpm/TS monorepo (shared, judge, db, cli). Schema + migrations. Validate/import CLI with 19 passing tests. First 3 problems validated and imported. Picked two pointers as the first track.
- **2026-11-11 (4)** — Step 3.3: auth (signup with invite, login, logout, me, change password) + password reset by email (migration 003, mailer, PLAN §5/§8/§13 updated). CLI `admin create|reset-password`, `invite create`. Fixed: dropping a stale session left `req.session` undefined. 55 tests pass; reset flow checked live against the running server.
- **2026-11-11 (3)** — Step 3.2: `apps/server` skeleton (Express 5, pg sessions, zod, error handler, argon2, health). `migrate(url?)`. pnpm `allowBuilds` for argon2/esbuild. 46 tests pass.
- **2026-11-11 (2)** — Step 3.1: editor templates for C++/Java/Python + generic fallback; `join` field; reserved-name check; template-judging integration test over all 3 problems. 35 tests pass.
