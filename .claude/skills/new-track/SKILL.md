---
name: new-track
description: Create a complete dailyDSA pattern track — the 5-problem ladder (easy to hard, with 3 hints each), at least 2 weekend problems of the same pattern, and the lesson — then validate, check and import it. Use when the user asks to create, write or add a track / weekly pattern / ladder (e.g. "make the sliding window track"). For a single daily problem use the daily-problem skill.
---

# Create a track

A track is one DSA pattern taught over a week (PLAN.md §2):
- **Monday:** the lesson goes up.
- **Mon–Fri:** one ladder problem opens per day (#1 … #5).
- **Sat–Sun:** the daily problem is one of the track's **weekend** problems (harder, tag hidden).

In git, a track is:

| Piece | Where |
|---|---|
| Ladder order | `problems/_tracks/<pattern>.yaml` (`ladder:` = 5 slugs, easiest first) |
| Lesson | `problems/_tracks/<pattern>.md` |
| 5 ladder problems | `problems/<slug>/` with `kind: track`, **no** pool/pattern/position, 3 hints |
| ≥ 2 weekend problems | `problems/<slug>/` with `kind: daily`, `pool: weekend`, `pattern: <pattern>` |

The finished example is **two-pointers**: `problems/_tracks/two-pointers.{yaml,md}`, the ladder `budget-pairs` → `nearest-readings` → `cable-cars` → `shared-free-time` → `even-stacks`, and the weekend problems `exact-gap` and `three-platforms`. Read them before starting. The format reference is `problems/README.md` → Tracks.

## 1. Plan the track (show it to the user before writing)

- The pattern slug comes from `STARTING_PATTERNS` in `packages/shared/src/problem.ts`. Check PROGRESS.md for tracks that already exist.
- **Ladder, easy → hard, each teaching a different shape of the pattern**, not five variations of one problem.
  - #1 is the pattern in its plainest form.
  - #5 needs a real insight on top of it.
  - Example (two pointers): count pairs from both ends → walk two sorted lists → greedy pairing from both ends → interval lists → running sums from both ends.
- **Weekend problems (≥ 2):** harder than #5, solvable with the pattern but not a copy of a ladder problem, since they test applying it unaided. The tag is hidden on the site, so the statement mustn't name the pattern.
- **Keep it inside this pattern.** Avoid problems that really belong to a neighbouring track (e.g. a window over contents is sliding window, not two pointers).
- **Every problem must be original** and meet the design rules of the daily-problem skill (§1): sizes where naive $O(n^2)$ times out, an intended $O(n)$/$O(n\log n)$, unique answers unless a checker is planned, and input that fits the editor template.

Present the plan as a short table: # · slug · one-line task · technique · naive. Then proceed unless the user objects.

## 2. Scaffold everything at once

```sh
pnpm dsa track new <pattern> <s1> <s2> <s3> <s4> <s5> --weekend <w1> <w2>
```

This writes the ladder file, the lesson outline, and every folder from `_template`:
- ladder folders get `kind: track` plus three `TODO:` hints;
- weekend folders get `pool: weekend` and the pattern;
- every folder's refs are already the editor template.

It refuses (before writing anything) if the ladder would exceed 5, if a slug is in another ladder, or if an existing folder doesn't fit.

- **Later changes:** `pnpm dsa track add <pattern> <slug>... [--weekend <slug>...]`.
- **Reorder:** edit the `ladder:` list. It needs no re-validation.
- **Never** put `pattern:` or `position:` in a track problem's `problem.yaml`.

## 3. Write each problem

For every folder, follow **the daily-problem skill, steps 2–8**: problem.yaml `input:` → statement → gen.py (a unique seed base) → refs regenerated from the template (`node_modules/.bin/tsx packages/cli/src/main.ts template <slug> <lang>`) with only `solve()` filled in → naive.cpp → checker if needed → `pnpm dsa validate <slug>`, with the samples checked by hand.

Ladder problems differ from daily ones in two ways:
- `problem.yaml` keeps `kind: track` and has **no** `pool`, `pattern` or `position`.
- **Hints**, written as `hints:` with three YAML `>-` folded strings, revealed one at a time. The solver already knows the pattern (the track is the pattern), so:
  1. **How the pattern applies here**: what to sort / where the pointers start / what the window is. No algorithm yet.
  2. **What to keep track of**: the state, the indices, the running value.
  3. **The key idea**: the decisive rule (which pointer to move and why, what to add), nearly the algorithm. Mention 64-bit if needed.

Weekend problems are ordinary daily problems (`pool: weekend`, `pattern: <pattern>  # hidden until solved`), with no hints.

Validate each problem as you finish it, not all at the end. Fixing one is cheaper while it's fresh.

## 4. The lesson (`problems/_tracks/<pattern>.md`)

The required structure is checked by the CLI:
- the first line is `# <Title>`;
- then these sections in order: `## How to spot it`, `## Core idea` (with a `### Worked example`), `## Template code`, `## Common mistakes`.

The site draws the practice ladder itself. What a good lesson has (see `two-pointers.md`):

- **How to spot it:** bullets of statement clues → why each points here, plus a "not this pattern" line pointing to the neighbouring track it's confused with.
- **Core idea:** why the technique is correct (the invariant / what each step rules out), its typical shapes, and its complexity.
- **Worked example:** a small input traced step by step in a Markdown table.
- **Template code** follows strict rules:
  - Each group is C++, Java and Python fences (` ```cpp `, ` ```java `, ` ```python `) one after another, each **exactly a ladder problem's editor template** with `solve()` filled in. The check enforces this.
  - **Solve a different example task**, never a ladder problem's actual answer: keep the ladder problem's input shape but do something else with it. Say in a sentence before the group which ladder problem's template it uses and what the example task is.
  - One or two groups, showing the main shapes of the pattern.
  - **Keep every line you write ≤ ~70 characters**: the lesson's code viewer cuts longer lines. Put explanations on their own comment lines.
- **Common mistakes:** concrete pitfalls such as off-by-one, `<` vs `<=`, overflow, ties/duplicates, and loops that never advance.

**Building the template code.** Generate each template with `node_modules/.bin/tsx packages/cli/src/main.ts template <ladder-slug> <lang>` and replace the `// your code here` (+ `return 0;`) with the example body.

**Run the example code before shipping**, since no test judges it. Copy the three files into the judge container and run them on a small input with a known answer:

```sh
MSYS_NO_PATHCONV=1 docker exec dailydsa-judge-1 mkdir -p /tmp/lesson-<pattern>
MSYS_NO_PATHCONV=1 docker cp Main.cpp dailydsa-judge-1:/tmp/lesson-<pattern>/   # also Main.java, Main.py
MSYS_NO_PATHCONV=1 docker exec dailydsa-judge-1 sh -c 'cd /tmp/lesson-<pattern> && g++ -O2 -o m Main.cpp && javac -d . Main.java && echo "<input>" | ./m && echo "<input>" | java Main && echo "<input>" | python3 Main.py'
```

Don't put `rm -rf` inside the `sh -c` script; Claude Code's safety check blocks it. Use a fresh directory name instead.

## 5. Check, test, import

```sh
pnpm dsa track check <pattern>     # must end "✔ ready": ladder 5/5, all valid, no TODO hints, weekend ≥ 2, lesson ok
pnpm typecheck && pnpm test
pnpm dsa track import <pattern>    # ladder + weekend problems, ladder order, lesson → dev DB
pnpm dsa list
```

- Fix every `✘` error **and** every `⚠` warning (not validated, `TODO:` hints, ladder < 5, weekend < 2) before calling the track done.
- If a new input shape appeared, add it to `packages/cli/test/templates.test.ts` (daily-problem skill §9).

**Optional but recommended: look at the lesson page.** Build with `pnpm web:build` and start the server on a free port (`PORT=3007 pnpm server` in the background), then sign in as an admin and open `/tracks/<pattern>`. The memory notes describe the headless-browser setup: `playwright-core` in the scratchpad plus the installed `chromium_headless_shell`. Check that the table, the KaTeX, and the language tabs render, and that no code line is cut off. Stop the server afterwards, including its node child process on the port.

**Don't schedule the track.** Choosing its week is the admin's job on the site (Admin → Schedule), and the API only allows future weeks.

## 6. Docs and commit

- PROGRESS.md:
  - "Problems so far": one row per new problem (ladder position or weekend, one-line idea);
  - the step/status table and bank counts;
  - Decisions, if anything new was decided;
  - a session-log entry.
- `problems/README.md` and PLAN.md: only if the process itself changed.
- Commit the ladder file, the lesson, all problem folders (with `validation.json`) and the docs together, ending the message with the session's attribution line. Leave unrelated files such as `.openidea/settings.toml` out.

## Done when

`pnpm dsa track check <pattern>` says ready with no warnings, `pnpm test` passes, the track is imported, the lesson code was run in all three languages, PROGRESS.md is updated, and everything is committed.
