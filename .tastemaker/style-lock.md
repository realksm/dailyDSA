# dailyDSA style lock

Surface: app shell (laptop-only internal tool for ~50 people), with an editor/canvas on the problem page.
Mood: **"Streak"** — the daily habit, played loud. Chunky ink outlines with hard offset shadows, a heavy grotesque for headings. Palette **Ultraviolet + Lime**: cool lilac-grey paper, grape ink, ultraviolet as the brand colour, acid lime for the streak. The problem page stays calm (hairline panels, no hard shadows near the editor) so the statement and code still come first.
Source: picked by the user on 2026-11-11 from three previewed directions (A · Puzzle page, B · Console, C · Streak); it replaced the earlier quiet teal look. Palette changed 2026-11-12 from coral on cream (it read as Claude's own colours at first glance) to Ultraviolet + Lime, picked from three previews (A · Cobalt + Signal Yellow, B · Ultraviolet + Lime, C · Ink + Highlighter); shapes, type and layout unchanged. The tokens live in `apps/web/src/styles.css` `:root`; the Streak component rules are at the end of that file.

## Color contract (WCAG, checked with a script)

| token | light | dark |
|---|---|---|
| bg | #f2f0f8 | #110e1b |
| surface | #fcfbff | #1a1628 |
| sunk | #e8e4f3 | #0b0914 |
| text | #1a1430 | #f3f0fc |
| muted | #574f6e | #b0a8c8 |
| line / line-strong | #dcd6eb / #827a9b | #2d2743 / #6d6590 |
| ink (outlines, hard shadows) | #1a1430 | #000000 |
| primary (fill: ultraviolet) | #6a4cff | #6e50ff |
| primary-hover (fill) | #5838f0 | #5a3cf5 |
| primary-soft (fill) | #e6e0ff | #261c52 |
| primary-text (brand-coloured text) | #5230e0 | #bba9ff |
| on-primary | #ffffff | #ffffff |
| accent (fill: lime, streak only) / accent-soft | #c6f432 / #ecfabf | #c6f432 / #263010 |
| on-accent | #1a1430 | #1a1430 |
| ok / bad / warn / info | #176a39 / #b4251d / #935000 / #3a55a0 | #6fdc98 / #ff8a80 / #f5b862 / #9db4f5 |

Always-dark panels (`--pn-*`: the landing's judge section, the auth side panel, the hero code card): bg #1a1430 (#08060f in dark), surface #251d40, sunk #150f27, line #352c54, line-strong #6d6590, text #f3f0fc, muted #b0a8c8, brand text #bba9ff, primary fill #6e50ff; verdicts use the dark-theme tones. `--c-ink` #1a1430 / `--c-paper` #fcfbff are the same in both themes (buttons on the final CTA card, the signup "Day 1" stamp). `--mark` / `--mark-text` style the hero's accent line (`--mark` is a highlighter swipe behind it; transparent in this palette).

`--primary` is a fill colour with white text on it. Anything that is brand-coloured *text* (links, the brand's "DSA", today's day, big stats) uses `--primary-text`. `--accent` (lime) is only for the streak and habit: Today's streak card (accent-soft), solved / review 30-day squares, the landing's week strip and month, the login panel's month. Never put text in lime; ink text goes on top of it (`--on-accent`). Ladder bars and buttons stay `--primary`.
Text-safe (>= 4.5:1, checked with a script): text, muted, primary-text and the four verdict tones on bg, surface, sunk, primary-soft and accent-soft, in both themes (lowest: warn on primary-soft, light, 4.86). Each verdict tone on its own `-soft` badge >= 4.5. on-primary on primary: 5.13 light, 4.94 dark (and on primary-hover, for button hovers). on-accent on accent and every `--pn-*` text pair also pass.
Decorative only: `line` borders. Inputs use `line-strong` instead.
Dark mode: black ink vanishes on the dark surface, so card outlines use `line-strong`, the top bar's rule uses `line`, and today's week cell is outlined in ultraviolet. Hard shadows stay black.
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

## Landing page (2026-11-11)

The one exception to "laptop-only" and "no scroll animation": `apps/web/src/landing/`. Same tokens and fonts (the dark judge section and code card use the `--pn-*` panel tokens); display type goes bigger (hero clamp 48–84px, section h2 clamp 38–76px, −0.045em), cards get 6px hard shadows, and the judge section is always dark (dark-theme tones). Motion there is GSAP + Lenis, all skipped under reduced motion; the one pinned, scrubbed scene is the week (Mon→Sun). Still no photos or illustrations: visuals are the app's own interface (day squares, test squares, verdict badges). Interface icons are Solar via `src/landing/solar.ts` (landing only).
