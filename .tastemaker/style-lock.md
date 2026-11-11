# dailyDSA style lock

Surface: app shell (laptop-only internal tool for ~50 people), with an editor/canvas on the problem page.
Mood: **"Streak"** — the daily habit, played loud. Chunky ink outlines with hard offset shadows, a heavy grotesque for headings, coral as the brand colour, warm paper background. The problem page stays calm (hairline panels, no hard shadows near the editor) so the statement and code still come first.
Source: picked by the user on 2026-11-11 from three previewed directions (A · Puzzle page, B · Console, C · Streak); it replaced the earlier quiet teal look. The tokens live in `apps/web/src/styles.css` `:root`; the Streak component rules are at the end of that file.

## Color contract (WCAG, checked with a script)

| token | light | dark |
|---|---|---|
| bg | #fdf3e4 | #161219 |
| surface | #fffbf5 | #201a25 |
| sunk | #f6e8d3 | #120e15 |
| text | #221a2c | #f5eefb |
| muted | #5d5468 | #b2a8bf |
| ink (outlines, hard shadows) | #221a2c | #000000 |
| primary (fill: coral) | #ff6a4a | #ff7656 |
| primary-soft (fill) | #ffe0d6 | #3b1d17 |
| primary-text (brand-coloured text) | #b8371b | #ff9a80 |
| on-primary | #221a2c | #221a2c |
| ok / bad / warn / info | #176a39 / #b4251d / #935000 / #3a55a0 | #6fdc98 / #ff8a80 / #f5b862 / #9db4f5 |

`--primary` is a fill colour only: coral is too light for text on paper. Anything that is brand-coloured *text* (links, the brand's "DSA", today's day, big stats) uses `--primary-text`.
Text-safe (>= 4.5:1): text, muted, primary-text and the four verdict tones on bg, surface, sunk and primary-soft, in both themes (lowest: primary-text on primary-soft, light, 4.69). Each verdict tone on its own `-soft` badge: >= 5.19. on-primary on primary: 5.92 light, 6.37 dark. (`ok` was darkened from #1d7a43 to #176a39 when Streak became the default: the preview value was 4.31 on primary-soft.)
Decorative only: `line` borders (~1.4:1). Inputs use `line-strong` instead.
Dark mode: black ink vanishes on the dark surface, so card outlines use `line-strong`, the top bar's rule uses `line`, and today's week cell is outlined in coral. Hard shadows stay black.
Verdict tones: AC → ok; WA, RE → bad; TLE, MLE, OLE → warn; CE, IE → info. Each tone has a `-soft` background for badges.

## Type

Headings, the brand and big numbers: Bricolage Grotesque 800 (`--display`), letter-spacing −0.035em. UI text: IBM Plex Sans 400/500/600; code, numbers and limits: IBM Plex Mono 400/500. All self-hosted via @fontsource. Body 15px, tables 14px, meta 13px. h1 40px on page heads, 54px for today's title, 34px on the problem page; stat numbers 64px.

## Density and spacing

Scale 4 / 8 / 12 / 16 / 24 / 32 / 48. Cards pad 24px, page gutter 24px, section gap 32px. Radius 9px for controls, 14px for panels, pills (999px) for nav items. Top bar 58px.
Outlines: cards and buttons 2px `--ink`. Hard shadows: panels 4px 4px, large buttons 3px 3px, buttons 2px 2px, small buttons none. On the problem page (`.solve`) buttons drop the shadow and go to 1.5px borders.

## Layout rules (2026-11-11 UI pass)

- One primary button per screen state. Today: the daily until it's solved, then the ladder's next problem.
- Progress is shown as numbered steps or day squares, never thin dashed pills (they turn to noise in dark mode).
- Problem page: statement/editor split is draggable (28–62 %), the panel under the editor stays folded to its tab bar until opened or until Run/Submit; both sizes are remembered in localStorage. Shortcuts live inside the Run/Submit buttons.
- A Submit result lists only failing tests; passing ones are the coloured squares (hover for time/memory), with "Show all N tests".
- Read-only code (lessons, solutions, submissions) is as tall as the code, 13px, with no inner vertical scrollbar.
- Week views are grids with one column per day (Today: Daily + Ladder rows; admin schedule: one card per week).

## Overlays and controls (2026-11-11)

- `--edge` is the outline of floating things: `--ink` in light, `--line-strong` in dark.
- Never `window.confirm()` / `alert()`: use `useConfirm()` from `components/Confirm.tsx` (one native `<dialog>`: 2px edge, 6px hard shadow, display-type title, Cancel + one action). `danger: true` gives a filled `.btn-bad` (surface text on `--bad`) and starts focus on Cancel.
- Never a native `<select>`: use `components/Select.tsx` (Radix Select). Trigger looks like an input with a chevron; the menu is surface with a 2px edge, 3px hard shadow, `primary-soft` highlight, a `primary-text` check on the chosen item, uppercase group labels.
- Top-bar Log out is a pill like the nav items; hover gives primary-soft fill, edge outline, a 1px lift with a 2px shadow, and the arrow moves 2px.

## Motion

App-shell track only: buttons lift 1px on hover (shadow grows to 4px) and press flat on click; track cards lift 2px on hover (6px shadow); 120ms ease-out transform/shadow/color/border transitions (drag handles show a 2px primary line on hover/focus/drag), a 160ms fade-in on results, spinners and a skeleton shimmer. All of it collapses under prefers-reduced-motion. No scroll animation.

## Assets

Mark: three rising bars in a rounded square (`apps/web/public/favicon.svg`, `BrandMark` in `components/ui.tsx`). No photos or illustrations; this is a tool.
