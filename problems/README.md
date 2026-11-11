# Problems

One folder per problem, named by its slug (`lowercase-with-dashes`). Folders starting with `_` are ignored.
All problems are original.

## Workflow

```sh
docker compose up -d judge        # validation runs inside the sandbox
pnpm dsa new my-problem           # copies _template
# …write problem.yaml (with input:), statement.md, gen.py, naive.cpp…
pnpm dsa template my-problem cpp > problems/my-problem/ref.cpp   # same for java, py; then fill in solve()
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
| `ref.cpp`, `ref.java`, `ref.py` | ✔ | reference solutions in the **editor template** (below); `ref.cpp` produces the official answers; Java class is `Main` |
| `naive.cpp` | ✔ | slow but correct brute force; must TLE somewhere |
| `checker.py` | if answers aren't unique | `checker.py input output answer`; exit 0 = accept, 1 = reject, anything else = checker bug |
| `wrong.cpp` | with a checker | a plausible wrong solution the checker must reject on ≥1 test |
| `validation.json` | written by the tool | calibrated limits, test hash, timings; never edit by hand |

## Editor template conventions

`input:` in `problem.yaml` generates the C++/Java/Python editor template (`editorTemplate` in `packages/shared`): it reads the vars in order, calls `solve()` and prints the result. Write the statement to match:

- Input is whitespace-separated tokens; a `string` is one token (ASCII, no spaces).
- Types: `int`, `long`, `string`, `int[]`/`long[]`/`string[]` (`length:` an earlier var), `int[][]` (`rows:` var, `cols:` var or number).
- `bool` prints `YES` / `NO`. Arrays print one element per line, or space-separated with `join: spaces`.
- `multi: true`: the first token is T, then T cases; each case's result is printed in order.
- `returns: void`: solve() prints itself (C++ `cout`, Java `out`, Python `print`). Use it for "print any …" / "-1 if none" outputs.
- Var names can't be keywords or template internals (`out`, `in`, `res`, `solve`, …) or start with `_`.
- No `input:` = a generic template with a fast reader; the solver writes all of main.

**Reference solutions follow the template.** They are the official solutions on the Solutions tab, next to the solver's own code, so they must look like what the solver sees in the editor. Start each from `pnpm dsa template <slug> <lang>` and write only the inside of `solve()` (and with no `input:`, the inside of `main`). Extra includes/imports and helper functions *above* `solve` are fine; the `solve` line and everything after its body (main, input reading, the fast reader) must stay exactly as generated. Every `dsa` command checks this when it loads a problem. If you change `input:`, regenerate the template and move your `solve()` body over.

`packages/cli/test/templates.test.ts` judges each problem's logic through its template; add a problem there when its input shape is new.

## What validation proves (PLAN §7)

1. `gen.py` is deterministic (tests 1 and N are regenerated and compared).
2. `ref.java` and `ref.py` agree with `ref.cpp` on every test (or pass the checker).
3. Time limits per language = max(3 × the reference's slowest test, 500 ms), CPU time, rounded up to 100 ms.
4. `naive.cpp` exceeds 2 × the C++ limit on at least one test, and is correct where it finishes.
5. With a checker: it accepts all three references and rejects `wrong.cpp`.

Limits depend on hardware: re-run `pnpm dsa validate --all` on the production server before launch and whenever the server changes.
