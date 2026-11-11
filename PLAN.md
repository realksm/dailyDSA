# dailyDSA — Project Plan

## What it is

**dailyDSA** is a DSA practice site for about 50 people. It has two parts:

- **Daily problem:** a new, mixed problem every day, with its pattern hidden. This trains recognising which pattern a problem needs.
- **Weekly track:** one DSA pattern per week, taught through a lesson and a ladder of problems that gets harder as it goes.

All problems are original, not copied from other platforms.

---

## 1. Daily problem

- A bank of original problems, about 30 to start and growing as new problems are written. Each pool cycles back once it runs out.
- **Rollover:** the new problem appears at midnight IST for everyone. Weeks also run Monday to Sunday in IST.
- **Two separate pools:** every bank problem is flagged **weekday** or **weekend**, and each day only picks from its own pool, so weekdays can never use up the weekend problems.
- **Monday to Friday:** a random problem from the weekday pool, of any pattern, on the easier side, because there is also a ladder problem that day.
- **Saturday and Sunday:** a harder problem from the weekend pool, from the pattern of that week's track, with the tag still hidden. Solvers know the week's pattern, so this tests applying it unaided on a harder problem. If no track is scheduled that week, see "No-track weekends" below.
- **Repeats:** when a problem comes round again it is shown as review ("you solved this 30 days ago"), with the solver's earlier result.
- **Archive:** every past daily problem stays open, so anyone can solve a day they missed.
- **Picks are stored, not computed per request:** at rollover the eligible problem shown least recently (never-shown first, ties broken randomly) is written to a `daily_schedule` row for the date and never recomputed. This cycles through each pool, and newly added problems come up soon.
- **No-track weekends** pick only from weekend problems whose pattern has already run as a track, so a track's weekend problems are never used up before that track runs.
- If a revealed tag's track isn't released yet, the link is replaced by "a track for this pattern is coming".
- Admins and setters can pin a problem to a specific date, which replaces that day's pick. A pinned problem also joins its pool and comes round in the normal cycle afterwards. (Problems themselves are added through the problem repo, see section 7.)
- Every bank problem must pass validation (section 7) before it goes in.
- The problem's pattern tag stays **hidden** until the solver solves it or unlocks the Solutions tab. Then it shows, with a link to the matching track ("this was a two-pointer problem → practise more").
- The daily problem never picks a problem from the track pool (see below), so it can't give away a current or upcoming lesson.

## 2. Weekly pattern tracks

### Each week
- **Monday:** the lesson for that week's pattern goes up.
- **Monday to Friday:** a ladder of 5 problems, from easy to hard, opening **one a day** so the group stays in step. Once open, a problem never closes.
- **Weekend:** catch-up on the ladder, plus the two pattern-based daily problems (section 1).
- **After the week:** the track stays open in full in the **Tracks library**, so anyone who joins late or falls behind can catch up.

### Lesson page
1. **How to spot it:** clues in a problem statement that point to this pattern (e.g. "longest subarray with a condition" → sliding window).
2. **Core idea:** a few paragraphs plus one worked example.
3. **Template code** in C++, Java and Python, matching the editor's template style.
4. **Common mistakes:** off-by-one errors, when to shrink a window, overflow, and so on.
5. **Practice ladder:** links to the track's problems.

### Track problems
- They use the same editor, judge, verdicts and Solutions-tab rules as the daily problem.
- They live in a **separate track pool** and are never picked as the daily problem.
- Each problem can have **progressive hints**:
  - Hint 1: how the pattern applies to this problem (the solver already knows which pattern, because the track is the pattern).
  - Hint 2: what to keep track of.
  - Hint 3: the key idea.
- Using a hint is recorded in history, the same way as "solved after viewing solutions".

### Progress
- Per track, e.g. "4/5 solved", shown on the track page and in the Tracks library.

### Scheduling
- Admins schedule which track runs in which week.
- Lessons are Markdown files in the problem repo (`problems/_tracks/<pattern>.md`), checked and imported by the same CLI as problems (decided while building step 5: they belong with their ladder problems and get git history).

### Starting patterns (8)
1. Two pointers
2. Sliding window
3. Prefix sums
4. Binary search on the answer
5. Monotonic stack
6. BFS / DFS
7. Simple 1D DP
8. Heaps / top-k

Later candidates: greedy, union-find, topological sort, knapsack DP, interval DP, backtracking, tries.

After the first 8 weeks, either the tracks repeat for newcomers or new patterns are added.

### Optional, later
- **Mixed review:** a random problem from tracks the solver has finished, with the tag hidden.

---

## 3. Solving

- Languages: C++, Java, Python.
- The editor opens with a full template: the input is already read into variables, and the solver only writes `solve()`. Problems without an input description get a generic template with a fast input reader built in.
- **Run** checks the sample tests plus anything typed into a custom input box.
- **Submit** checks every test, including hidden ones.
- Verdicts: Accepted, Wrong Answer, Time Limit Exceeded, Memory Limit Exceeded, Output Limit Exceeded, Runtime Error, Compile Error.
- The solver sees pass/fail plus the time and memory each test took.
- When a hidden test fails, the solver can see its input. This does let someone hard-code answers; it is accepted for now and will be revisited (see section 13).

## 4. Solutions tab

- Unlocks after an accepted submission.
- Before that, a **Show solutions** button appears once the solver has made one real attempt (a submission that isn't a compile error). It asks for confirmation before unlocking.
- Shows only accepted code from everyone, filterable by language. The setter's official solution is pinned at the top.
- If someone unlocks it with the button and then solves the problem, their history marks it as "solved after viewing solutions".
- Applies to both daily and track problems.

## 5. Accounts

- Sign up with email, password and an invite code. The admin sets each code's number of uses and expiry, and can turn it off.
- Roles: Admin, Setter, Solver.
- **Forgotten password:** "Forgot password" emails a one-time reset link (valid 60 minutes). The admin can also reset a password from the admin page (or `pnpm dsa admin reset-password`).
- Changing or resetting a password logs the account out on every other device.

---

## 6. How code runs

### Sandbox
- A queue runs each submission in **go-judge**, a sandbox server built for online judges: no internet access, with time and memory limits.
- go-judge ships no language runtimes, so we build one Docker image containing g++, a JDK and Python.
- It runs as a privileged container, so its port is never exposed outside the Docker network.

### Compile once, run per test
1. **Compile:** the code is compiled once (`g++` / `javac`), and the binary is cached inside go-judge, which returns a file ID.
2. **Run:** each test is a separate run that copies the cached binary in by its ID, with its own input and limits. Every test gets a fresh process, so a crash or leftover state in one test can't affect the next.
3. **Clean up:** the cached binary is deleted when the submission is finished.

Python skips step 1.

### Time limits (calibrated)
- Limits are **measured, not fixed**. Each problem stores its own limit per language.
- Limit = max(3× the reference solution's slowest test, a floor of about 0.5s), measured on the production server.
- Judging uses **CPU time**, not wall-clock time, because it is far less noisy on a 2-core server.
- Submissions run **one at a time**, so timings stay stable and match the calibration.
- **Java:** every test is a fresh JVM, so JVM startup and its background threads (JIT, GC) count towards CPU time on every test. Calibration absorbs this, so Java limits will be noticeably higher than C++ limits. That is expected, not a bug.
- Java runs with `-XX:+UseSerialGC -XX:TieredStopAtLevel=1 -Xshare:auto` and `-Xmx` derived from the memory limit, to cut background-thread CPU time and avoid false Memory Limit Exceeded from reserved heap.

### Memory and output limits
- Each problem has a memory limit (default 256 MB). Going over it gives **Memory Limit Exceeded**.
- Output is capped (e.g. 64 MB) so a runaway print loop can't fill the disk. Going over it gives **Output Limit Exceeded**.

### Checking the output
- **Default:** the solver's output is compared with the reference output, ignoring trailing whitespace.
- **Checker (optional, per problem):** for problems with more than one valid answer ("print any pair", "print a shortest path", decimals with a tolerance). A checker is a Python script that runs in the sandbox after the solver's program. It receives the test input, the solver's output and the reference output, and exits 0 for pass.

### Fair use
- Each person can only Run or Submit once every few seconds (one shared limit for both), so one person can't hog the queue.

---

## 7. Problem format and validation

### What a problem holds
- Statement (Markdown)
- Tests, plus the generator that made them
- Reference solutions in C++, Java and Python
- One deliberately **slow (naive) solution**
- Optional checker
- Calibrated time limits per language (written by validation, never by hand)

### Where problems live (decided)
- Problems are **folders in a git repo** (`problems/<slug>/`), one folder per problem: `problem.yaml` (title, pool, pattern, limits), `statement.md`, `gen.py`, `tests/`, `ref.cpp`, `ref.java`, `ref.py`, `naive.cpp`, optional `checker.py`.
- A CLI validates a folder and imports it into the database. Track lessons live there too (`problems/_tracks/`). The admin page only schedules and pins; it does not upload problems or edit lessons.
- Validation runs through the same one-at-a-time judge queue as submissions, so calibration never competes with live judging.

### Validation
One validate command runs on the production server. A problem cannot go live until every step passes.

| Step | What it proves |
|---|---|
| All three reference solutions pass every test | The tests and solutions agree |
| The three reference outputs match each other (problems without a checker) | The answer is unique, so plain comparison is safe |
| Time limits are measured and stored | Limits fit the real hardware |
| The naive solution in C++ exceeds the limit on at least one test, by a margin of 2× | The tests force the intended pattern |
| The checker accepts all three reference outputs and rejects a deliberately wrong one (problems with a checker) | The checker can say both yes and no |

- The naive test uses C++ because it is the fastest language: if brute force fails there, it fails in Java and Python too.
- If the naive solution survives, the problem is rejected until its tests are made bigger.
- Limits depend on the hardware, so validation is re-run for every problem if the server plan ever changes.

---

## 8. Tech

- **Language:** TypeScript on both frontend and backend, sharing verdict and problem types.
- **Frontend:** React + Vite, Monaco editor (laptops only; phones are not a target).
- **Backend:** Node.js + Express.
- **Database:** PostgreSQL.
- **Submission queue:** the `submissions` table itself; a single worker claims the oldest queued row with `FOR UPDATE SKIP LOCKED`, so no Redis or extra queue library is needed. The validate CLI takes the same Postgres advisory lock, so it never judges at the same time as the worker.
- **Verdict updates:** the page polls for the result about once a second.
- **Login:** cookie sessions stored in PostgreSQL, passwords hashed with argon2.
- **Email:** password-reset mails over SMTP from a transactional provider (e.g. Brevo or Zoho free tier); in development they are printed to the console.
- **Markdown:** statements and lessons are rendered through a sanitiser, with KaTeX for maths.
- **Code execution:** go-judge, with a custom image for C++, Java and Python.
- **Deployment:** everything in Docker Compose, with Caddy for HTTPS.
- **Backups:** nightly database backups, copied off the server (e.g. Backblaze B2 or Cloudflare R2).
- **Development:** built and tested locally in Docker; the server is bought only when the product is ready, and validation/calibration is re-run there before launch.

## 9. Server and cost

- Hostinger KVM 2 (2 cores, 8 GB RAM), India location, plain Ubuntu 24.04, no control panel.
- About ₹16,800 + GST for 24 months with a coupon code, renewing at ₹1,199/month.

---

## 10. Content budget

| Content | Count | Notes |
|---|---|---|
| Daily bank problems | ~30 | Easier weekday problems of any pattern, plus harder weekend problems tagged with a track pattern (at least 2 per track) |
| Track problems | ~40 | 8 tracks × 5 problems |
| Lessons | 8 | One per track |
| **Total problems** | **~70** | Each needs 3 reference solutions, 1 naive solution, tests, and a checker where the answer isn't unique |

**At launch (decided):** about 30 daily problems, split ~24 weekday and ~6 weekend (2 for each launch track). Each later track's weekend problems are written together with that track. The remaining tracks are released one per week while staying ahead.

**First milestone:** the platform, a handful of problems, and one track (lesson + ladder). Remaining content is planned after that.

---

## 11. Build order

0. **go-judge spike:** custom image (g++, JDK, Python); compile-once / run-per-test, checkers, time/memory/output limits; measure Java CPU time and noise.
1. **Schema:** the full database schema up front, including patterns, tracks and the daily schedule (the weekend pick depends on them).
2. **Problem format + validate CLI**, built alongside 2–3 real problems.
3. **Core:** accounts and invites, today's problem, the editor, Run/Submit, history, the admin page.
4. **Solutions tab and polish.**
5. **Tracks:** lesson pages (Markdown from the admin page), track ladders, progressive hints, per-track progress, the Tracks library, and weekly scheduling.
6. **Content:** a few problems and one track for the first milestone; the rest planned afterwards.
7. **Go live:** buy the server, re-run validation there, a setup script and a step-by-step guide, off-server backups.

Most of the time goes into steps 3 and 6 (content), not the code.

---

## 12. Decided: size and mix of the daily bank

- Weekend pool: at least 2 problems per track pattern, written together with each track (about 6 at launch for the launch tracks, 16 once all 8 tracks exist).
- Weekday pool: about 24 at launch, so weekday problems repeat roughly every 5 weeks at first. Repeats are shown as review.
- **Decision:** launch with ~30 and keep adding problems as the site runs, mostly to the weekday pool, so repeats get rarer over time.

---

## 13. Later

- Leaderboards
- Streak rankings
- Comments / discussion per problem
- Mixed-review mode
- More tracks beyond the first 8
- Revisit showing failed hidden-test input (e.g. show only the first failing hidden test, or only after a few attempts) if hard-coding becomes a problem
