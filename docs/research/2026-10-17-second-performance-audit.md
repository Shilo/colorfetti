# Second whole-app performance audit — October 17, 2026

**Decision: one exact optimization shipped (Brightness analysis); two rejected.**
This reran the handoff behind `2026-10-17-whole-app-performance-audit.md`, whose
first execution shipped nothing. Baseline: clean `3c47699` (includes the
independent `35fbb73` caption CSS). Evidence, scripts and raw trials are in
`bench/second-performance-audit-2026-10-17/`. Nothing was pushed or deployed.

## Surfaces

- **Desktop:** the Claude desktop app's built-in browser (Chrome 152.0.7977.149,
  927×827, DPR 1), at the user's instruction, in place of the handoff's "Codex
  Browser"; no Edge/Playwright. In-page timing, Long Tasks API, JS Self-Profiling
  (16 ms sampling on Windows) against a sourcemap build. Every timed window was
  gated on steady 60 Hz rAF and a fixed CPU calibration; readings taken while the
  pane was hidden/occluded or the host was busy were discarded. Imports are staged
  `File`s dispatched as a synthetic paste into the real handler. Desktop downloads
  were not run (they need user approval).
- **Phone:** USB Pixel 8 Pro, native Brave (Chrome 155.0.8059.85), 448×819, DPR 2.25,
  portrait, USB powered, 34.5–37.8 °C. Process-specific CDP socket; owned tabs,
  forwards, exact output files and test-origin storage only; all restored.
  Before candidate pairs the user closed all other apps and Brave tabs (Brave
  restarted), so candidates are judged only within-session.
- **Node:** exactness and kernel timing of frozen versus candidate modules.

## Baseline (unchanged costs, both surfaces)

| Cost | Phone | Desktop | Attribution |
|---|---|---|---|
| Cold Icon, 2048 sheet | ~600 ms CPU, 409–449 ms LT | 225–259 ms LT | `iconOf` icon.js:40, `glyphComponent` icon-glyph.js:128 |
| Rapid Brightness R→G→Value, 2048 | 445–518 ms CPU, 111–118 ms LT | three 59–78 ms LTs | `analyze` recolor.js:128, `addSeams` :102 |
| 256-color editor paste→Review | 185–188 ms LT | none (Review 4–14 ms) | style/layout of 64 swatch buttons/canvases/tooltips; no exact cut |
| Cold Stencil, 2048 | 132 ms LT | 66–91 ms LT | `sprites` recolor.js:230 |
| Entropy512 dither 8→4 | 1.5 s CPU, no LT | ~560 ms to counts, no LT | `mixturePlan`, `lab`; arithmetic cache 12–16% only, not pursued |

All phone stages passed; 10 native PNG/GIF Saves (incl. Keep and worker-unavailable
GIF) matched an independent scalar decode. All 11 1-bit styles matched core masks
in desktop readback (display check, not an export oracle). Startup: first usable
control 30–38 ms warm, 117 ms first load.

## Candidates

Acceptance was declared before candidate timing (bench README): ≥10% phone gain in
renderer CPU or max Long Task on each target window, not worse on desktop, no common
case worse by >5% and >3 ms median "considering variation", exact outputs, at most
two rounds. Builds came from detached worktrees of `3c47699`; an unpatched worktree
build reproduced every runtime asset of the baseline byte for byte.

| Patch | Round one (combined build, 5 pairs) | Round two (single build, 7 triples) | Decision |
|---|---|---|---|
| Analysis: seam zero-skip + non-luma single loop | Phone Brightness CPU 569→444 (−22%), LT 151→114; desktop 210→160, LTs gone | Phone CPU 611→430 (−30%), LT 162→111; every triple −23…−34% | **Accepted** |
| Icon floods/crease hoists/glyph level skip | 1024 LT −18%; 2048 flat | 2048 LT −15%; 1024 per-triple −41…+58% | Rejected: inconsistent |
| Stencil bounds-free flood | flat; desktop medians +3/+7 ms | — | Rejected: no gain |

Adverse cases for the accepted patch: one import per round crossed the median
floor (round one sheet1024 +13 ms, round two sheet2048 +12 ms renderer CPU), with
per-pair deltas of both signs. Those sources are analyzed in the import worker
(`image-import-client.js`, >4096 pixels), so the changed code does not run on the
measured thread; paste→exact-caption time improved (−2.7%, −5.7%), and desktop
imports improved 3.5–23.5 ms. The failing case moved between rounds, which reads
as variation; that judgment is recorded here rather than hidden.

## Exactness and tests

- Node: 235 images / 82M pixels byte-identical (all analyze fields, `spritesOf`,
  Icon ink/detail, masks, unify/unifyAsync) across five sources and cuts 1/128/255;
  every changed Icon branch hit (for the rejected patch).
- `equiv-against-head.mjs` (equiv.mjs with Icon also asserted): 26,400 combinations identical.
- Phone: 12 native outputs per variant byte-identical (10 baseline set + 1-bit Icon
  and Stencil sheet1024 Saves).
- Full `npm test`: 66 files, 1050 passed, 2 existing GC skips. Production build passed.
- Not run: `bench/palette-qa.mjs`, which launches Edge (user asked for no Edge).

## Limits

Physical landscape, native picker/pinch/clipboard/ZIP transport, desktop downloads
and Safari/iOS/macOS were not covered. Worker CPU is outside renderer TaskDuration.
Finite tests do not establish universal frame times or bug absence.
