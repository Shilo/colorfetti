# Second audit: desktop profile (Claude browser)

Baseline `3c47699b8f0ee6e58f7d3082d699c81376747dea`, clean tree. No production code changed.

**Surface.** This was measured in the Claude desktop app's built-in browser: Chrome 152.0.7977.149
(`Claude/2.42304.0`), a 927×827 viewport at DPR 1, on Windows 11. Edge/Playwright was never
launched, at the coordinator's direction. There is no CDP here, so measurements use in-page
`performance.now`, PerformanceObserver `longtask` (flushed with `takeRecords` when a window
closes), rAF gaps sampled only inside each window, and the JS Self-Profiling API. Chrome
clamps that API to a **16 ms sample interval on Windows**, so frames under about 30 ms per run
are only roughly attributed, which is why each workflow was repeated (usually 3 times) and merged.
The JS Self-Profiling API sees only the main thread, so worker CPU (Auto generation, limiter,
Cleanup, GIF/import workers) is excluded.

**Timing hygiene.** Before every timed window a gate checked for 60 Hz rAF and ran a fixed
CPU loop, whose minimum stayed between 8.4 and 8.7 ms in every receipt. An earlier period had
the window occluded or the host contended: rAF ran at one frame every 1–2 s and the CPU loop
took 118–480 ms. All of that period was discarded; only the functional checks ran then.
Download-triggering Save/Save all was **not run**, because the browser needs user approval for
downloads. Export timing is covered on the phone and in Node.

## Reproduce

```
npx vite build --sourcemap --outDir .tmp/second-audit-2026-10-17/baseline-maps/dist
node bench/second-performance-audit-2026-10-17/desktop/fixtures.mjs
node bench/second-performance-audit-2026-10-17/desktop/server.mjs .tmp/second-audit-2026-10-17/baseline-maps/dist 5373 --profiling
node bench/second-performance-audit-2026-10-17/desktop/server.mjs .tmp/second-audit-2026-10-17/baseline/dist 5374
# open http://127.0.0.1:5373/?probe&seed=palette|onebit|auto|dither8 and call __p.importCohort /
# __p.coldStyle / __p.brightness / __p.editor / __p.dither / __p.rapid (probe.js), one call per window
node bench/second-performance-audit-2026-10-17/desktop/resolve.mjs "^cold-icon2048-r" 10
node bench/second-performance-audit-2026-10-17/desktop/summarize.mjs
node bench/second-performance-audit-2026-10-17/desktop/check-styles.mjs
node bench/second-performance-audit-2026-10-17/desktop/dither-candidate.mjs
node bench/second-performance-audit-2026-10-17/desktop/brightness-candidate.mjs
```

`server.mjs` copies the first audit's server. It adds `Document-Policy: js-profiling`, the
injected `probe.js` for `?probe`, the `/diag/` fixtures, and a `/receipt` POST that writes into
`.tmp/second-audit-2026-10-17/desktop-raw/`. Imports are staged (fetched into `File`s) before
timing starts, then handed to the real `window` paste handler as a **synthetic paste event**.
Readiness requires the exact imported filenames, painted canvases and non-busy exact count
captions, so the demo tile cannot satisfy it. Timed controls are synthetic DOM clicks on the
app's real buttons, one `javascript_tool` call per window.

## Pass/fail

| Check | Result |
|---|---|
| Practical imports: 8 sprites + effect, sheet1024/2048, motion128/256 (3 runs each) | PASS: exact names, counts published, no Long Task |
| Auto: 8 sprites + effect, sheet2048 | PASS (`Auto, 64 colors`; counts published) |
| Rapid RGB→Oklab→RGB, cap 4→8, Cleanup on, Dither 4×4 (sheet1024/2048, batch, motion128/256) | PASS: final paint and counts published, pressed state correct, `8 colors` |
| Preview: zoom, Original, converted, Fit, close | PASS on all 5 cohorts, no Long Task |
| Animation playback (motion128 + effect, 6.7 s) | PASS: 70/64 paints |
| 11 1-bit styles, dungeon-wizard, exact canvas readback vs `recolor.js` oracle | PASS 11/11, 0 RGB/alpha mismatches (`onebit-styles-check.json`) |
| Diagnostics: transparent, two-color, glow, entropy256, 4096/4097, single-frame GIF | PASS: no Long Task, 20–61 ms |
| Editor 256 paste → Review (256 colors) → Next (color 65) → Previous | PASS |
| Startup restored, dark/light | PASS: first enabled control 30–38 ms warm (117 ms first load), example paint 36–46 ms, no Long Task |
| Save/Save all/2048 Save | NOT RUN (downloads need approval) |

## Ranked main-thread hot spots

Self and total are ms per run (sample-weighted, `summary.json`). Long Tasks and readiness
come from the window receipts.

| # | Workflow | Function | src file:line | Self / total | Window | Class | Exact-output-preserving hypothesis |
|---|---|---|---|---|---|---|---|
| 1 | High-entropy dither 8×8→4×4 (entropy512) | `lab` called from `mixturePlan` | src/lib/quantize.js:11 ← src/lib/palette-dither.js:23 | lab 334 / 334; mixturePlan 195 / 529; convertDither 11 / 540 | paint 317–339 ms, count 550–570 ms; no LT (cooperative) | hot arithmetic (Math.cbrt ×3 per call, up to 20 calls/pixel); memo disabled on entropy | Pair-mixture Oklab depends only on (ordered pair, weight, grid). A lazy per-job cache, bounded at 4096 pairs, was bit-identical in **108/108** cases (`dither-candidate.json`), but only about **12–16% faster** in Node. The weak gain is not worth shipping without a better layout |
| 2 | Cold Icon, sheet2048 | `iconOf`, `glyphComponent` | src/lib/icon.js:40, src/lib/icon-glyph.js:128 | 155 / 214; 51 / 59 | **LT 225–259 ms**, ready 218–250 ms (uninstrumented 200–247) | synchronous blocking + hot arithmetic + allocation (about 60 MB of typed arrays at 4 MP; `%`/`/` in every flood step) | Cached per analysis, so only cold or new-analysis runs pay. Possible exact micro-work: track x/y instead of `p % w`, and reuse scratch arrays. No measured candidate |
| 3 | Rapid Brightness R→G→Value, sheet2048 (Cutout) | `analyze`, `addSeams` | src/lib/recolor.js:128, :102 (via image-reanalysis.js:32 `prepare`) | 140 / 193; 43 / 43 | **3 LTs of 59–78 ms**, one per click; 216 ms first→final | repeated work (each click recomputes `right`/`down`/`edges`, which do not depend on Brightness), plus a second brightness pass for non-luma | Reuse `right`/`down`/`edges`/`autoLine`/`hasAlpha`/`soft` from the same-pixels, same-cut analysis, and redo only the brightness pass, Otsu and seams. Masks matched for all 11 styles, R/G/Value, both sheets. 2048 analyze **47–48 → 24–25 ms** in Node (`brightness-candidate.json`). Shared arrays must stay immutable, and Icon/sprites caches must not carry over |
| 4 | Cold Icon, sheet1024 | `iconOf` | src/lib/icon.js:40 | 67 / 76 | **LT 105–108 ms**, ready 92–98 ms | same as #2 | same as #2 |
| 5 | Cold Stencil, sheet2048 | `sprites` | src/lib/recolor.js:230 | 67 / 67 | LT 66–91 ms, ready 56–81 ms | synchronous blocking, hot arithmetic (`p % w`, `data[q*4+3]` in BFS) | Component labels and rims depend only on alpha/cut, so they could survive Brightness reanalysis (level/auto/body still need lum). Also the micro-work from #2. Unmeasured |
| 6 | Rapid palette settings, sheet2048 | `convertDither`; limiter client `onmessage` | src/lib/palette-dither.js:80; src/lib/palette-limit-client.js:48 | 37; 24 | ready 224–241 ms, no LT | hot arithmetic; allocation/copy (a new 128 KiB slice per chunk per pass, by policy) | None. The slice-copy policy is intentional |
| 7 | Imports (all cohorts) | `scanSummary` | src/lib/source-color-summary.js:49 | 10–30 | sheet2048 ready 155–188 ms, no LT | repeated Map work per visible pixel | A last-RGB run fast path (skip `Map.get` when rgb equals the previous pixel and alpha ≤ the stored value) gives an identical Map. Unmeasured |
| 8 | Imports of PNG sheets | `swapRedBlue` | src/lib/image-decode.js:15 | 12–20 | chunked | necessary byte swap | None |
| 9 | Startup | fflate table init (`freb`), demo `analyze` | node_modules/fflate/esm/browser.js:39; src/lib/recolor.js:128 | ~10; ~7 | 30–38 ms to control | module init | Not worth a lazy boundary |

**Not reproduced here:** the first audit's 61 ms editor Long Task. Text entry took 0.7–1 ms,
Review 3.5–14 ms, paging 0.6–3.7 ms, with the maximum rAF gap ≤ 17 ms and no Long Task. That
supports reading the earlier signal as Playwright input/harness cost rather than app work.

## Receipts

- `summary.json`: every workflow's runs (ready/paint ms, Long Tasks, max rAF gap, CPU gate) and top resolved frames.
- `receipts/*.json`: per-window receipts; `receipts/cold-icon2048-r1.trace.json` and `receipts/dither-entropy512-r1.trace.json` are sample raw profiles. Everything else is in `.tmp/second-audit-2026-10-17/desktop-raw/`.
- `onebit-styles-check.json`, `dither-candidate.json`, `brightness-candidate.json`.
- Long-animation-frame script attribution was wired in, but this browser returned no entries over 50 ms inside the windows, so none are reported.
