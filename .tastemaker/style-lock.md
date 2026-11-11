# dailyDSA style lock

Surface: app shell (laptop-only internal tool for ~50 people), with an editor/canvas on the problem page.
Mood: technical and quiet. The product should get out of the way of the problem statement and the code.
Source: hand-picked on a cold start (no references, no profile). The tokens live in `apps/web/src/styles.css` `:root`.

## Color contract (WCAG, checked with a script)

| token | light | dark |
|---|---|---|
| bg | #f6f5f1 | #131416 |
| surface | #ffffff | #1b1d20 |
| sunk | #efede7 | #0f1012 |
| text | #1c1d1f | #e7e5e0 |
| muted | #5b5e64 | #9b9ea4 |
| primary | #0d6b57 | #45c4a2 |
| on-primary | #ffffff | #0a1f19 |
| ok / bad / warn / info | #16733c / #b3261e / #9a4d00 / #3d5a80 | #5bd08a / #ff8a80 / #f0b45c / #8fb3e0 |

Text-safe (>= 4.5:1): every text-like token above on bg, surface and sunk, in both themes (lowest: ok on sunk, light, 5.05). on-primary on primary: 6.45 light, 7.91 dark.
Decorative only: `line` borders (~1.4:1). Inputs use `line-strong` instead.
Verdict tones: AC → ok; WA, RE → bad; TLE, MLE, OLE → warn; CE, IE → info. Each tone has a `-soft` background for badges.

## Type

IBM Plex Sans 400/500/600 for UI and IBM Plex Mono 400/500 for code, numbers and limits, self-hosted via @fontsource. Body 15px, tables 14px, meta 13px, h1 26px (today's title 32px).

## Density and spacing

Scale 4 / 8 / 12 / 16 / 24 / 32 / 48. Cards pad 24px, page gutter 24px, section gap 32px. Radius 6px for controls, 10px for panels. Top bar 52px.

## Layout rules (2026-11-11 UI pass)

- One primary button per screen state. Today: the daily until it's solved, then the ladder's next problem.
- Progress is shown as numbered steps or day squares, never thin dashed pills (they turn to noise in dark mode).
- Problem page: statement/editor split is draggable (28–62 %), the panel under the editor stays folded to its tab bar until opened or until Run/Submit; both sizes are remembered in localStorage. Shortcuts live inside the Run/Submit buttons.
- A Submit result lists only failing tests; passing ones are the coloured squares (hover for time/memory), with "Show all N tests".
- Read-only code (lessons, solutions, submissions) is as tall as the code, 13px, with no inner vertical scrollbar.
- Week views are grids with one column per day (Today: Daily + Ladder rows; admin schedule: one card per week).

## Motion

App-shell track only: 120ms ease-out color/border transitions (drag handles show a 2px primary line on hover/focus/drag), a 160ms fade-in on results, spinners and a skeleton shimmer. All of it collapses under prefers-reduced-motion. No scroll animation.

## Assets

Mark: three rising bars in a rounded square (`apps/web/public/favicon.svg`, `BrandMark` in `components/ui.tsx`). No photos or illustrations; this is a tool.
