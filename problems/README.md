# Problems

One folder per problem, named by its slug (`lowercase-with-dashes`). Folders starting with `_` are ignored.
All problems are original.

## Workflow

```sh
docker compose up -d judge        # validation runs inside the sandbox
pnpm dsa new my-problem           # copies _template
# …write the files…
pnpm dsa validate my-problem      # all checks must pass; writes validation.json
pnpm dsa import my-problem        # upserts into the database (needs `docker compose up -d db`)
pnpm dsa list                     # state of every problem
```

Commit `validation.json` with the problem. Editing any source file makes it stale, and `import` refuses until you re-validate.
Generated tests are **not** committed; they go to `.data/tests/<slug>/<hash>/` and can be regenerated from `gen.py`.

## Files

| File | Required | Purpose |
|---|---|---|
| `problem.yaml` | ✔ | metadata (see `_template/problem.yaml`) |
| `statement.md` | ✔ | Markdown + KaTeX. The site appends the samples, so don't repeat them |
| `gen.py` | ✔ | `python3 gen.py <i>` prints test *i*; seeded from *i*; runs inside the sandbox |
| `ref.cpp`, `ref.java`, `ref.py` | ✔ | reference solutions; `ref.cpp` produces the official answers; Java class is `Main` |
| `naive.cpp` | ✔ | slow but correct brute force; must TLE somewhere |
| `checker.py` | if answers aren't unique | `checker.py input output answer`; exit 0 = accept, 1 = reject, anything else = checker bug |
| `wrong.cpp` | with a checker | a plausible wrong solution the checker must reject on ≥1 test |
| `validation.json` | written by the tool | calibrated limits, test hash, timings; never edit by hand |

## What validation proves (PLAN §7)

1. `gen.py` is deterministic (tests 1 and N are regenerated and compared).
2. `ref.java` and `ref.py` agree with `ref.cpp` on every test (or pass the checker).
3. Time limits per language = max(3 × the reference's slowest test, 500 ms), CPU time, rounded up to 100 ms.
4. `naive.cpp` exceeds 2 × the C++ limit on at least one test, and is correct where it finishes.
5. With a checker: it accepts all three references and rejects `wrong.cpp`.

Limits depend on hardware: re-run `pnpm dsa validate --all` on the production server before launch and whenever the server changes.
