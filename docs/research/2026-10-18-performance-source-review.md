# Performance source review — October 18, 2026

Extension of the second audit (`2026-10-17-second-performance-audit.md`) under the addendum
`.claude/handoffs/2026-10-17-225713-performance-source-review-addendum.md`. Review revision
`0c61dd0`; final integrated revision `90b2d05`. Evidence lives in
`bench/second-performance-audit-2026-10-17/` (`source-review/`, `wave2/`, `android/ab-*`,
`desktop/ab-*`). Desktop numbers come from the Claude desktop app's built-in browser
(Chrome 152, DPR 1); phone numbers from the USB Pixel 8 Pro in native Brave (Chrome 155,
448×819, DPR 2.25). Nothing was pushed or deployed.

## What got faster

| Commit | Change | Phone (alternating pairs) | Desktop |
|---|---|---|---|
| `4c1a975` | Non-luma `analyze` single loop; seam pass skips zero-difference pairs | Rapid Brightness on a 2048 sheet: CPU 611→430 ms, longest task 162→111 ms | 210→160 ms |
| `0a4eb91` | Palette PNG rows ≤64 KiB use `zlibSync` instead of fflate's per-call worker | Tiny palette Save click→download 66→25 ms (−62%) | within timer resolution |
| `5e19c48` | 1-bit caption inspection waits while a Style slider is dragged | Threshold drag over four 512 px Checker images: CPU 975→750 ms; final caption +11 ms | busy −16% |
| `236bbcc` | Max colors and Auto jobs use exact histograms from completed color summaries | Max colors 2→4→8 on a 2048 sheet: 792→208 ms to final paint (−74%) | 205→56 ms |
| `90b2d05` | Live Brightness/cut reanalysis runs `analyze` in ~8 ms posted row bands | Rapid Brightness 2048: longest task 93→0 ms, worst frame gap 83→17 ms, elapsed −13% | worst frame gap 33→17 ms |

Every change is output-exact: native exports byte-identical, analyses/masks/limiter subsets/
Auto palettes identical under independent differentials (B1: 2,000+ adversarial cases; B5:
32,694 analyses including forced one-row bands), captions identical. Each passed gates
declared before timing and an independent review. Two adverse calls were judged variation on
code paths whose executed instructions did not change (sheet imports for `4c1a975`, sheet1024
Save CPU for `0a4eb91`); both are recorded with their per-pair spreads in the bench README.

## Source inventory and coverage

103 tracked entries (`source-review/inventory.tsv`, tests excluded):

| Group | Status |
|---|---|
| 48 UI/lifecycle files (App/Tile/Dock UI blocks, other components, all CSS, UI helpers, index.html, main.js) | Reviewer A, 114 ledger rows (App 36 blocks, Tile 15, Dock 15) |
| 47 kernel/worker/IO files (recolor, icon, gif, save, import/decode, palette modules, App/Tile pixel/export/count blocks) | Reviewer B, 79 ledger rows |
| `vite.config.js`, `package.json` | Coordinator: three runtime dependencies used at their API boundary (fflate, omggif, GlassKit CSS); bundle reviewed in `C/bundle.json` |
| `src/assets/*` (two 601-byte SVGs, two 222-byte PNGs, a license) | Static assets, no runtime cost worth review |
| `src/lib/fixtures/*` | Test data, not imported by runtime code |

Explicitly not reviewed line by line: GlassKit's stylesheet (only its blur tokens and the
app's overrides), fflate/omggif internals beyond the used APIs, and `icon-glyph.js` 60–126
bodies (covered by the rejected Icon candidate's evidence).

## API research log (`source-review/C/api-log.json`)

| Technique | Applicable call sites | Decision |
|---|---|---|
| Per-call worker startup (fflate async zlib, palette GIF worker) | `save.js` palette PNG, `gif.js` | PNG part shipped (`0a4eb91`); GIF worker per export deferred (one per export, not per frame) |
| `CompressionStream('deflate')` | PNG IDAT, ZIP | Rejected: no level control, different bytes |
| `scheduler.yield` / `postTask` | `yieldTask` MessageChannel helpers | Deferred: no Safari; would change tile turn-taking |
| Transferables | every `postMessage` site | Retain: new slices transferred, sources never detached |
| Canvas context attributes, `ImageDecoder`, `createImageBitmap` | Tile/preview canvases, `image-decode.js` | Retain: lifetimes/copies already minimal and colour-exact |
| Layout thrashing | `measureWorkspaceTools`, CanvasGrid `paint()` | Candidate needing a probe (unguarded `:root` writes); not measured |
| Passive listeners | window touch listeners in App/Dock | Deferred: Dock's touchstart alone keeps scroll start blocking |
| OffscreenCanvas, content-visibility, SharedArrayBuffer | — | Not applicable (no trace justification; Pages cannot set COOP/COEP) |
| backdrop-filter on captions | caption glass | Deferred: changing it changes the look |
| Svelte `$state.raw` / `untrack` | PaletteImport arrays, Auto key | Retain; PaletteImport deep proxies cost 2.3 ms at 4096 colours (cleanup only) |

## Rejected and deferred

Rejected by measurement: Icon and Stencil bounds-free floods (second audit), dither
mixture pruning (4–25% of trials pruned, no win), 32-bit BGRA swap, repeat-skip `scanSummary`
alone, 32-bit colorize table, and the first audit's D1.

Deferred with the next dependency:

| Idea | Why not now | Next step |
|---|---|---|
| H-B3 count job reuses an exact-size Tile conversion with dither/Cleanup | Touches App count-record identity and Reuse's `record.promise` | Instrumented `convertDither` counter; design that resolves Reuse with the tile result |
| H-B7 palette GIF keeps first-pass frames | Up to 8 MiB more peak memory per export, on top of the preview cache | Peak-memory measurement on the phone |
| H-A3 offscreen stills skip conversion | Behaviour change (art can be stale on scroll-in) | Owner decision |
| H-A2 non-blocking font stylesheet | Visible fallback-font flash on cold loads; Dock header must re-measure | Owner decision, then throttled cold-load measurement |
| H-A4 lazy tooltip DOM | Accessibility wiring; share of the 185 ms phone editor task unknown | Attribute that task first |
| H-A7, H-A10, H-A11, H-B6, H-B8–H-B10 | Small or unmeasured | Focused probes listed in `source-review/*/hypotheses.json` |

## Limits

Physical landscape, Safari/iOS/macOS, desktop downloads and native clipboard/ZIP transport
were not covered. Worker CPU is outside renderer TaskDuration. Finite tests do not establish
universal frame times or bug absence.
