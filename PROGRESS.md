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
| 3 | Core app (accounts, daily, editor, Run/Submit, history, admin) | ⏳ **next** |
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
pnpm test                           # 19 tests; go-judge ones skip if the judge isn't up
pnpm dsa list                       # problem states
pnpm dsa validate --all             # ~11 s per problem
pnpm dsa import --all
node spike/judge-spike.mjs          # full sandbox check incl. timing noise
```

Dev DB URL: `postgres://dailydsa:dailydsa@127.0.0.1:55432/dailydsa` (5432 is blocked on this Windows machine).
If Docker Desktop isn't running: start it, wait for `docker info`; the first build after a start may fail with an rpc EOF — retry.

## Repo layout

```
judge/               go-judge image (Dockerfile, mount.yaml); runs with -parallelism 1
packages/shared      types shared by front+back: Lang, Verdict, JudgeResult, InputSpec, pools/roles/patterns
packages/judge       go-judge client + judge() orchestrator (compile once → run per test → checker → cleanup)
packages/db          pg pool + SQL migration runner (migrations/NNN_*.sql)
packages/cli         `pnpm dsa` — list / new / validate / import
problems/            one folder per problem (+ _template, README.md)
apps/server          (empty) Express API + queue worker — step 3
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
- **Line endings:** `.gitattributes` forces LF (test files are compared byte-wise inside Linux).

## Next up — step 3: core app

Suggested order (each piece testable on its own):
1. **Editor templates** from `InputSpec` (packages/shared): C++/Java/Python code that reads the vars, calls `solve()`, prints the return. Generic fast-reader template when `input` is absent. Verify by wrapping each problem's ref logic into a `solve()` and judging it.
2. **apps/server skeleton:** Express, `express-session` + `connect-pg-simple`, argon2 passwords, zod request validation, error handler.
3. **Auth:** signup with invite code (uses/expiry/disabled, role from code), login, logout, `/api/me`. Bootstrap first admin via `pnpm dsa admin create` (or a seed script).
4. **Daily:** IST date helper; `ensureDailyPick(day)` (weekday pool / weekend pool by week's track pattern / no-track weekend = patterns that already ran, fallback weekday pool); called lazily on request + on a timer at IST midnight. Archive endpoint.
5. **Problem view:** statement + samples (first `sample_count` tests from disk) + template + limits + my status; pattern tag only after solve/unlock.
6. **Run/Submit:** insert into `submissions` (rate limit: one Run/Submit per user every ~5 s), worker loop claims rows (`FOR UPDATE SKIP LOCKED`, reset `running`→`queued` on boot), loads tests from disk, calls `judge()`, updates `user_problems`. Poll `GET /api/submissions/:id`.
7. **History** page data; **admin**: invite codes CRUD, password reset, pin a problem to a date, schedule track weeks.
8. **apps/web:** Vite + React + Monaco (laptop only): today, problem/editor, archive, history, admin.

## Open questions / for later

- Upload test inputs to go-judge once per problem (fileId) instead of sending content per run — only if large tests prove slow.
- Advisory lock shared by the queue worker and the validate CLI (key reserved: 727002) — implement with the worker (go-judge `-parallelism 1` already prevents overlapping runs).
- Weekend pool needs ≥2 problems per track pattern; we have 1 for two-pointers (`exact-gap`) — write another when doing track content.
- Remaining two-pointers ladder problems (#2–#5) + lesson.

## Session log

- **2026-11-11** — Reviewed plan, recorded decisions (git-folder problems, 24/6 launch mix, platform-first milestone). Built + passed go-judge spike. Scaffolded pnpm/TS monorepo (shared, judge, db, cli). Schema + migrations. Validate/import CLI with 19 passing tests. First 3 problems validated and imported. Picked two pointers as the first track.
