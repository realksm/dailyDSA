# UI/UX backlog (review of 2026-11-12)

From the page-by-page review (Today, Problem, reveal, Tracks, Lesson, History, Archive, Submission, Account, Admin, Login, Landing).
Work top to bottom, one step at a time. Tick the box and add a line to PROGRESS.md's session log when a step is done.
`API` = needs a server change too.

## Phase 1: daily-use fixes

- [x] **1. Output diff on Wrong Answer.** `components/Result.tsx` TestRow: compare "Your output" with "Expected" line by line, mark the first differing line/token, add a summary ("differs at line 37, token 2"). Works for long outputs (scroll to the first diff). Checker problems (`exact-gap`): no diff, since any valid answer passes.
- [x] **2. Action button on this week's track card.** `pages/Tracks.tsx`: primary button "Continue: Ladder n · Title" (or "Read the lesson" before rung 1, "Ladder done" when 5/5). Mark the next open rung in the mini ladder so it differs from the other unsolved rungs.
- [x] **3. Streak chip in the top bar.** `App.tsx`: lime square + number on every page (problem page included), links to Today. `API` if the streak isn't on `/api/me` yet; updates after an Accepted without a reload.
- [x] **4. Cooldown you can see.** `pages/Problem.tsx:315`: replace "Wait a few seconds…" with the seconds left inside Run/Submit ("Submit · 4s") or a draining fill; the buttons shouldn't look broken.

## Phase 2: problem page

- [x] **5. "Use as custom input" on each sample.** Fills the custom input and opens that tab.
- [x] **6. "Draft saved" note** next to the language picker when the local draft differs from the template / last sent code.
- [x] **7. Word-wrap toggle** in the editor toolbar (remembered in localStorage); read-only views (lessons, solutions, submissions) wrap by default.
- [x] **8. Reveal doesn't hide the result.** On a first Accepted, keep the test squares visible (grow the panel or put the squares above the reveal). Swap the duplicate "It was a … problem" line for stats: "Solved in 3 submits, no hints."
- [x] **9. Daily badge links to its day** ("Daily · Wed, 11 Nov" → that day / the week).

## Phase 3: Today

- [x] **10. One badge for a repeat.** "New" + "Review · last shown Mon" → "Back for review (first seen Mon)".
- [x] **11. 30-day grid starts at join** (or shows a "joined" marker) and gets the solved / missed / review / today legend like the login panel.
- [x] **12. No duplicate ladder link.** Today's ladder cell is the link; drop the "Ladder 4: …" button or make the cell quieter.
- [x] **13. Drop "Recent days"**; the week grid covers it. Keep a "Full archive →" link.
- [x] **14. One-line hook on the problem card** (first sentence of the statement). `API` (`DailyToday` field).
- [x] **15. Group pulse names on hover**: who solved, at what time. Text only, no initials or avatars. `API` (names in `pulse`).

## Phase 4: Tracks and lessons

- [x] **16. Upcoming tracks say "Opens Mon 16 Nov"** instead of "0/5 solved".
- [x] **17. Bigger diagrams on track rows** (same scale as the featured card; the mono label readable).
- [x] **18. Sticky lesson contents** in the right column under the ladder (How to spot it, Why it works, Shapes, Worked example, Mistakes), marking the current section on scroll.
- [x] **19. "See it work" step-through:** left/right arrow keys, bigger and higher-contrast arrows, the caption announced (`aria-live="polite"`).
- [x] **20. Shapes link to their ladder problem** in each lesson (lesson markdown + renderer; all 4 lessons).

## Phase 5: History and Archive

- [x] **21. "Shown" cell**: "Mon 9 Nov +1 more" (or stacked dates) instead of a run-on list.
- [x] **22. "Solved after viewing solutions" becomes a filter chip** (with "used hints").
- [x] **23. Pattern progress map** on History: per pattern, solved / tried, hints used, after solutions, last practised, link to the track. `API`
- [x] **24. Long-term heatmap of solved days** on History (all time, not just 30 days).
- [x] **25. Archive grouped by week** with the week's track name in each header.
- [x] **26. Archive pattern filter** (solved problems only, since the pattern stays hidden) **+ "Random unsolved"** button.

## Phase 6: Submission and Account

- [x] **27. "Load into editor"** on a submission: opens the problem with that code in its language (asks before overwriting a draft).
- [x] **28. "Compare with previous"** on a submission: diff against the user's previous submission of the same problem.
- [x] **29. Account preferences**: default language (used by the editor), editor font size, theme. Saved on the server so they follow the user. `API` (`/api/me/settings`)
- [x] **30. Top-bar name looks clickable** (icon or chevron), goes to Account.

## Phase 7: Admin schedule

- [x] **31. Preview the automatic pick** for future days instead of just "Automatic". `API`
- [x] **32. Warnings**: the same problem twice within 7 days (Trail Days Mon + Thu), and weekday-bank depth ("7 left"). `API`
- [x] **33. Pinned select shows a short label** ("Pinned ▾"); the title above it already names the problem.
- [x] **34. Hide the empty days before launch** (week of 2 Nov).

## Phase 8: Login and landing

- [ ] **35. Login focus ring**: plain 2px ring instead of the offset shadow that looks misaligned in dark.
- [ ] **36. One invite label** on the landing ("I have an invite" vs "I have an invite code").

## Phase 9: bigger features

- [ ] **37. Private notes per problem** ("what gave it away"), editable on the problem page after a solve, shown on History and in the pattern map. `API` (migration)
- [ ] **38. Weekly recap** on Monday: last week's track, the group's solve rate, your strongest / weakest pattern. On Today and in an email. `API`
