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
| 2 | Problem format + validate CLI (+2–3 problems) | ⏳ next |
| 3 | Core app (accounts, daily, editor, Run/Submit, history, admin) | ☐ |
| 4 | Solutions tab + polish | ☐ |
| 5 | Tracks (lesson, ladder, hints, progress, library, scheduling) | ☐ |
| 6 | Content: a few problems + one track | ☐ |
| 7 | Go live | ☐ (later — server not bought) |

## How to run (dev, Windows + Docker Desktop)

```sh
docker compose up -d --build        # judge on 127.0.0.1:5050, Postgres on 127.0.0.1:55432
pnpm install
pnpm db:migrate                     # idempotent
pnpm typecheck
pnpm test                           # judge integration tests skip if go-judge isn't up
node spike/judge-spike.mjs          # full sandbox check incl. timing noise
```

Dev DB URL: `postgres://dailydsa:dailydsa@127.0.0.1:55432/dailydsa` (5432 is blocked on this Windows machine).

## Repo layout

```
judge/               go-judge image (Dockerfile, mount.yaml)
packages/shared      types shared by front+back: Lang, Verdict, JudgeResult, InputSpec, pools/roles/patterns
packages/judge       go-judge client + judge() orchestrator (compile once → run per test → checker → cleanup)
packages/db          pg pool + SQL migration runner (migrations/NNN_*.sql)
apps/server          (empty) Express API + queue worker — step 3
problems/            (empty) one folder per problem — step 2
spike/               throwaway go-judge proof
```

## Decisions made while building (beyond PLAN.md)

- **Sandbox mounts:** custom `judge/mount.yaml`; Ubuntu's JDK 21 needs `/etc/java-21-openjdk` bound in.
- **OLE detection:** stdout reaching the cap ⇒ OLE even if the program then dies with non-zero exit (closed pipe).
- **Java MLE:** `java.lang.OutOfMemoryError` in stderr ⇒ MLE (JVM hits `-Xmx` = 80% of limit before the cgroup does; cgroup gets +128 MB headroom).
- **Measured on dev box:** C++ CPU-time sd ≈ 0.5 ms; Java JVM startup ≈ 17 ms CPU (not ~300 ms as first feared); Python ≈ 4 ms. Recalibrate on the real server.
- **Daily pick:** least-recently-shown eligible problem (never-shown first, random tiebreak), stored in `daily_schedule` once. No shuffle-state table.
- **Queue:** the `submissions` table is the queue (`FOR UPDATE SKIP LOCKED`, one worker); no pg-boss.
- **Tests on disk, not in DB:** generated tests live at `<data>/tests/<slug>/<tests_hash>/` (regenerable from git), keeping nightly DB backups small. `problems.tests_hash` points at them.
- **Output comparison:** per-line trailing whitespace and trailing blank lines ignored; CRLF normalised.
- **Hidden tests:** only the first failing hidden test reveals its input/output.
- **Line endings:** `.gitattributes` forces LF (test files are compared byte-wise inside Linux).

## Next up (step 2 — problem format + validate CLI)

Planned folder format `problems/<slug>/`:
- `problem.yaml` — title, kind (daily|track), pool, pattern, memory_mb, samples (first N tests), tests (count), input spec for the editor template, hints (track only)
- `statement.md`, `gen.py` (`python3 gen.py <i>` prints test i; deterministic; runs **inside go-judge**, so no local Python needed)
- `ref.cpp`, `ref.java`, `ref.py`, `naive.cpp`, optional `checker.py` + `wrong.cpp` (checker must reject it)
- `validation.json` — written by the CLI only: limits per lang, tests hash, timings, date, machine

Validate pipeline: gen tests → ref.cpp makes answers → java/py refs must match (or pass checker) →
calibrate (limit = max(3× slowest ref test, 500 ms), per language) → naive.cpp must TLE at 2× the C++ limit on ≥1 test
(and be correct where it finishes) → checker accepts refs and rejects `wrong.cpp`.
CLI: `pnpm dsa new <slug>`, `pnpm dsa validate <slug>`, `pnpm dsa import <slug>`.

## Open questions / for later

- Whether to upload test inputs to go-judge once per problem (fileId) instead of sending content per run — optimisation, only if large tests are slow.
- Which pattern is the first track (suggest two pointers or sliding window).
- Advisory lock shared by the queue worker and the validate CLI (key reserved: 727002) — implement with the worker.

## Session log

- **2026-11-11** — Reviewed plan, recorded decisions. Built + passed go-judge spike. Scaffolded pnpm/TS monorepo (shared, judge, db). Judge client + 7 tests passing. Schema + migrations applied to local Postgres.
