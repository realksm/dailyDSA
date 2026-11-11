---
name: daily-problem
description: Write a new dailyDSA daily problem (weekday or weekend pool) end to end — design, problem.yaml, statement, gen.py, reference solutions in C++/Java/Python, naive.cpp, optional checker, validation, import, docs. Use when the user asks to add, write or create a daily / weekday / weekend problem for the bank. Track (ladder) problems use the new-track skill, which builds on this one.
---

# Write a daily problem

A daily problem is a folder `problems/<slug>/` that passes `pnpm dsa validate` and is imported with `pnpm dsa import`. The format reference is `problems/README.md`, and the rules come from PLAN.md §1 and §7. Read both if anything below is unclear.

## 0. Before starting

- Read PROGRESS.md ("Problems so far") so the idea and story don't repeat an existing problem.
- `docker info` must work, and `docker ps` must show `dailydsa-judge-1` and `dailydsa-db-1`. If not: `docker compose up -d` (Docker Desktop may need starting first; a first build can fail with an rpc EOF, so retry).
- There is **no Python or g++ on the host**. gen.py, refs and checkers only run inside the judge container, so `pnpm dsa validate` is how you test them.

## 1. Design (decide before writing files)

- **Original.** Write your own story and statement; never copy a problem from LeetCode, Codeforces etc. A classic technique is fine, a recognisable famous problem is not.
- **Pool.**
  - `weekday`: easier, any pattern, shown Mon–Fri next to a ladder problem.
  - `weekend`: harder, its `pattern` must be one of the track patterns (it is picked on the weekend of that track's week, with the tag hidden), and it should need the pattern applied unaided.
  - Pattern slugs are in `STARTING_PATTERNS` (`packages/shared/src/problem.ts`). Set `pattern` on weekday problems too: it is revealed after solving.
- **Sizes that separate the intended solution from brute force.** Usually $n \le 2\cdot10^5$, with an intended $O(n)$ / $O(n\log n)$ and a naive $O(n^2)$ (~$2\cdot10^{10}$ steps, which surely times out).
  - Avoid problems whose *intended* solution is $O(n^2)$: the Python reference then needs seconds and the limits balloon.
  - Watch for 64-bit answers and say so in the statement.
- **One answer or many?** If several outputs are valid ("print any pair"), the problem needs `checker.py` and `wrong.cpp` (step 7). Prefer a unique answer when the problem allows it.
- **Input shape.** It must fit the editor template types: `int`, `long`, `string`, `int[]`/`long[]`/`string[]` with `length:` an earlier var, `int[][]` with `rows`/`cols`; returns `int|long|string|bool|int[]|long[]|void`, `join: spaces`, `multi: true`. Use `returns: void` when solve() must print itself (e.g. "-1 if none").

Tell the user the idea in 2–3 lines (story, task, intended technique, constraints) and go ahead unless they object.

## 2. Create the folder

```sh
pnpm dsa new <slug>          # lowercase-with-dashes; writes the folder from problems/_template
```

Edit `problems/<slug>/problem.yaml`: `title`, `kind: daily`, `pool`, `pattern` (with a `# hidden until solved` comment), `samples` (1–2), `tests` (12–15), `input:`.

**Variable names:**
- Not keywords or template internals (`out`, `in`, `res`, `solve`, …), and not starting with `_`; the schema rejects these.
- **Not Python built-ins** either (`len`, `sum`, `max`, `min`, `list`, `map`, `id`, `type`, …): they would shadow the built-in inside the solver's `solve()`. For example, use `dist`, not `len`.

## 3. statement.md

Follow the house style (see `problems/budget-pairs/statement.md`, `problems/even-stacks/statement.md`):

- A short story with a clear task, maths in KaTeX (`$…$`), and a tiny worked illustration in the text if the operation is unusual.
- The sections `## Input`, `## Output`, `## Constraints`, in that order. Describe each input line exactly as the template reads it (whitespace-separated tokens).
- **Don't repeat the samples**: the site appends the first `samples` tests.
- Note when the answer can exceed $2^{31}$, when values may repeat, and any edge-case rule (1-based indices, ties, "print any").

## 4. gen.py

`python3 gen.py <i>` prints test *i*. It must be deterministic.

- Seed with `random.Random(<base> + i)` using a base no other problem uses. Check with `grep -rn "random.Random(" problems/*/gen.py`; recent problems use 31_000, 32_000, … in steps of 1 000, so take the next free one above the highest in that run, and skip any base that is already taken (7_000 and 52_000 are).
- Tests `1..samples` are the samples: small, readable, hand-checkable, and together showing the rule (include one "nothing works / -1 / 0" sample when it makes sense).
- Then the edge cases (n = 1, extremes of the values, all equal, already-solved inputs), small random tests, one medium test, and **several max-size tests** of different shapes (worst cases for the naive, adversarial structures, answers needing 64 bits).
- Put an `emit(...)` helper at the top that `assert`s the constraints, so a generator bug fails validation instead of producing invalid tests.
- Keep the generator fast. For constructed inputs, make sure every branch respects the limits for *every* random draw, not just the one you tried.

## 5. Reference solutions (ref.cpp, ref.java, ref.py)

These are the official solutions on the Solutions tab, so they must be **the editor template with only `solve()` filled in**. Helpers and extra includes/imports go *above* `solve`. Everything from the `solve` line down (main, the readers) must stay exactly as generated; `loadProblem` enforces this.

After `input:` is final, regenerate the refs from the template. Call tsx directly: `pnpm dsa …` prints an extra `$ tsx …` line that would end up in the file.

```sh
for l in cpp java py; do node_modules/.bin/tsx packages/cli/src/main.ts template <slug> $l > problems/<slug>/ref.$l; done
```

Then replace the `// your code here` (+ `return 0;`) in each with the solution:

- Keep a 1–2 line comment that explains the key idea; it's what solvers read.
- Use the same algorithm in all three languages.
- `ref.cpp` produces the official answers. Java's class stays `Main`, printing goes through the template's `out`, and `Arrays.sort` on primitives is fine for these tests.
- Python: keep inner loops lean (local variables, avoid repeated indexing); the Python limit is 3× its own slowest test.

## 6. naive.cpp

A **correct** but slow solution (a plain `int main`, no template needed).

- Validation requires it to exceed 2× the C++ limit (≥ 1000 ms, since limits have a 500 ms floor) on at least one test and to be **correct on every test it finishes**.
- A different algorithm is fine (e.g. a quadratic check of a characterisation), and so is the same greedy with a linear scan in place of the pointer.
- Make sure the slow part can't be vectorised away by the compiler: use 64-bit values and branches, and make the max tests big ($n = 2\cdot10^5$ for $O(n^2)$).
- Start the file with a comment saying why it's slow.

## 7. Checker (only if answers aren't unique)

- `checker.py input output answer`: exit 0 = accept, 1 = reject, anything else = checker/reference bug (e.g. exit 2 when the solver finds an answer the reference says doesn't exist). The reference answer is used only to know whether an answer exists or what the optimum is.
- Print the reason for a reject to stderr.
- `wrong.cpp` is a plausible wrong solution that the checker must reject on ≥ 1 test. See `problems/exact-gap/`.

## 8. Validate and check the answers

```sh
pnpm dsa validate <slug>
```

It must end with `✔ valid`. On failure it names the step: gen not deterministic, refs disagree, naive too fast, checker can't reject. Fix the cause; never weaken the checks.

- Check the samples by hand. Tests are in `.data/tests/<slug>/<testsHash>/NN.in` / `NN.ans`; `testsHash` is in `validation.json`. Read `01.ans`, `02.ans` and compare them with your own working.
- Check a constructed max test's answer when you know what it should be.
- Note the calibrated limits and the slowest reference times (in PROGRESS.md later). If a limit is far above the floor, consider whether the reference (usually Python) can be faster.
- `validation.json` is written by the tool; commit it and never edit it. Changing any source file afterwards makes it stale, so re-validate.

## 9. Tests, import, docs

- If the input/output shape is new (a type or `join`/`multi`/`void` combination no existing problem has), add the problem to `BODIES` in `packages/cli/test/templates.test.ts`.
- Run `pnpm typecheck` and `pnpm test`; all must pass.
- Then `pnpm dsa import <slug>` (into the dev DB) and `pnpm dsa list` (should show `valid`).
- PROGRESS.md:
  - add a row to "Problems so far" (slug · where · one-line idea);
  - update the bank counts and limits line;
  - add a session-log entry.
- Commit the problem folder and the docs together, ending the message with the session's attribution line. Leave unrelated files such as `.openidea/settings.toml` out.

## Done when

`pnpm dsa list` shows the problem `valid`, it is imported, the samples were checked by hand, tests pass, PROGRESS.md is updated, and it's committed.
