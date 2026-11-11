# Problems

One folder per problem, named by its slug (`lowercase-with-dashes`). Folders starting with `_` are ignored.
All problems are original.

## Workflow

```sh
docker compose up -d judge        # validation runs inside the sandbox
pnpm dsa new my-problem           # a daily problem from _template (track problems: see "Tracks" below)
# …write problem.yaml (with input:), statement.md, gen.py, naive.cpp…
pnpm dsa template my-problem cpp > problems/my-problem/ref.cpp   # same for java, py; then fill in solve()
pnpm dsa validate my-problem      # all checks must pass; writes validation.json
pnpm dsa import my-problem        # upserts into the database (needs `docker compose up -d db`)
pnpm dsa list                     # state of every problem and track
```

New folders get `ref.cpp/java/py` already written as the editor template of `_template`'s example `input:`. Once you change `input:`, regenerate them with `pnpm dsa template` (the folder won't load until they match).

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
- Var names can't be keywords or template internals (`out`, `in`, `res`, `solve`, …) or start with `_`. Also avoid names that shadow Python built-ins (`len`, `sum`, `max`, `min`, `list`, `map`, …): solvers would lose them inside `solve()`.
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

## Tracks

A track is two files in `_tracks/` plus ordinary problem folders:

- `_tracks/<pattern>.yaml`: **the ladder**, the track's problems in order, easiest first. #1 opens on Monday of the track's week, … #5 on Friday.
- `_tracks/<pattern>.md`: the lesson (below).
- each ladder problem: a folder with `kind: track` and **no** `pool`, `pattern` or `position`, since the ladder file decides both pattern and position. A track problem must be in exactly one ladder; a daily problem in none.
- the weekend problems: ordinary daily folders with `pool: weekend` and `pattern: <pattern>`. They are not in the ladder. Each track needs at least 2 (one for Saturday, one for Sunday).

```yaml
# _tracks/two-pointers.yaml
ladder:
  - budget-pairs
  - nearest-readings
  - cable-cars
  - shared-free-time
  - even-stacks
```

```sh
# Set up a whole track at once: ladder file, lesson outline, 5 ladder folders and 2 weekend folders.
pnpm dsa track new sliding-window win-a win-b win-c win-d win-e --weekend win-sat win-sun
pnpm dsa track add sliding-window win-e --weekend win-extra   # later: append to the ladder (max 5) or add weekend problems
# …write each problem as usual (input:, statement, gen.py, naive.cpp, refs from `pnpm dsa template`, hints), then validate it…
pnpm dsa track check sliding-window     # ladder n/5, each problem's state, TODO hints, weekend count, lesson; or --all
pnpm dsa track import sliding-window    # its ladder + weekend problems, the ladder order, the lesson
```

- `track new|add` check everything before writing anything: at most 5 in a ladder, no problem in two ladders, and existing folders are reused only if they already are a track problem (or a weekend problem of that pattern).
- **Reordering** = editing the ladder file. Positions aren't part of a problem's validation, so no re-validation is needed; run `pnpm dsa track import <pattern>` (or `dsa import --all`). The database ladder is rewritten from the file in one go. A problem not imported yet leaves its slot empty, and the import says so.
- New ladder problems come with three `TODO:` hints; `track check` warns until they're written.

### Lessons

Each track's lesson is a Markdown file, `_tracks/<pattern>.md` (in git, like the problems). `track new` writes the outline:

```sh
pnpm dsa template budget-pairs cpp      # editor template of a ladder problem, for the template code (also java, py)
pnpm dsa track check two-pointers       # checks the lesson too
pnpm dsa track import two-pointers      # writes the title + lesson to the tracks table (`dsa import --all` does every lesson too)
```

- The first line is the track's title: `# Two pointers`.
- Sections, in this order: `## How to spot it`, `## Core idea` (with a worked example), `## Template code`, `## Common mistakes`. More sections are fine. The site adds the practice ladder itself.
- `## Template code` holds C++, Java and Python blocks (```` ```cpp ````, ```` ```java ````, ```` ```python ````) one after the other, each in the editor template of one of the track's ladder problems, so the lesson matches the editor. Fill in `solve()`; the rest must stay as generated. Solve a *different* example task there, so the lesson doesn't give away a ladder problem, and keep lines within ~70 characters (the lesson's code viewer is narrow).
- Any C++/Java/Python blocks that follow each other (only blank lines between them) are shown as one block with a tab per language, anywhere in the lesson. Other code blocks render as plain code.
- Importing changes nothing (not even the "last imported" time) if the file didn't change. Setters and admins can open `/tracks/<pattern>` before the track's week to read the imported lesson as solvers will see it.
