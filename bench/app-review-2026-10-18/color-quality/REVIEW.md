# Conversion-quality review — October 18, 2026

Read-only product audit. No production source/configuration/documentation changes. The current Oklab matcher is mathematically consistent with the published transform; exact active RGB, alpha eligibility, bounded work and frozen Cleanup/animation rules are supported by the reviewed code and tests. No new P1 conversion-corruption defect found in these kernels.

## P2: sampled dither can substantially misrepresent the saved image

Refs: `src/lib/layout.js:48` (existing near-integer-ratio mitigation), `:49` (minimum 32-pixel minor axis); `src/lib/quantize.js:48` (point sampling); `src/lib/palette-dither.js:101` (source-phase threshold); `src/Tile.svelte:139` (actual effective sampling input), `:286` (preview conversion).

Current `shown()` already perturbs nearly integer downscales by 1.06. An arbitrary exact half-sized probe therefore overstates the practical failure. The retained reproductions **call production shown()**, then production quantize(). Oklab/B&W/Cut128/Cleanup Off/dither100%:

| Source | Effective across argument | `shown()` result | Export white | Sampled white |
|---|---:|---|---:|---:|
| 1024×128, #808080, 4×4 | 256 | 256×32 | 25% | 0% |
| 1024×1024, #e0e0e0, 8×8 | 384 | 384×384 | 76.5625% | 55.5556% |
| 2048×512, #202020, 8×8 | 96 | 128×32 | 1.5625% | 100% |

Across is **effective raster pixels**, including DPR/inspection scaling, not necessarily CSS pixels. The first case's minor-axis floor undoes the integer-ratio mitigation; the square case's ratio 8/3 escapes that mitigation. `layout-probe.mjs` examines 133,938 bounded uniform-source/layout combinations with phase histograms and checks these selected records against real production quantization. It is synthetic coverage, not a natural-image prevalence estimate.

The source-anchored sampled-pixel guarantee is correct but insufficient to judge displayed tone. `palette-dither.test.js:75` verifies exact correspondence with a sparse subset of full-output pixels, not spatially integrated appearance. `layout.test.js:95` enforces the minor-axis floor and `:109` covers the existing near-integer mitigation. Historical review already acknowledges aliasing (`docs/research/2026-10-14-dithering-adversarial-review.md:26`); this is a quantified unresolved UX limitation, not a new regression.

Zoom need not recover exact inspection: `viewerInspectionScale(384,384,16,1,60)` returns 1, and `shown(512,512,384)` remains 384². A 60-frame 512² clip in that effective fit area therefore keeps this raster at 16× zoom. The clip-wide 4,194,304-pixel refinement budget in `src/lib/viewer-layout.js:14` is intentional and tested at `viewer-layout.test.js:41`; removing it without replacing buffer ownership would be unsafe.

Remedy direction: evaluate a bounded, area-aware dither preview or phase-stratified sampling while retaining exact export phase and full-resolution saves. Offer truthful sampled/native inspection status or a bounded single-frame native crop. An offset-only heuristic cannot guarantee area fidelity. Risks: extra matching work, averaging blurs pixel art, alpha/edge handling, GIF caches and retained Original buffers. Preserve the current safe path for undithered small sprites.

## P2: Max colors chooses nearest labels before dither, sometimes disabling useful dithering

Refs: `src/lib/palette-limit.js:83` returns only full-nearest winners if they fit the budget; `src/lib/palette-state.js:64` selects this subset before `:72` dithers it. `palette-limit.test.js:53` explicitly protects this fast path.

An opaque uniform #808080 source with Grayscale8 and Max2 selects only **#929292**. Every matrix/strength then has only one available color. All colors with 8×8/100% instead emits **34 #6d6d6d +30 #929292 per64 pixels**. Both emitted outputs obey a maximum of two colors. For this uniform-patch proxy, squared Oklab error of integrated linear-light average is .003610445 capped vs .00000001223 uncapped. Actual per-pixel error favors the solid result (.00361045 vs .00394444), which explains the mismatch between the two stages' objectives.

The same loss occurs for tested grays64/96/160/192. This follows the documented stage independence, so it is an output-quality opportunity, not a cap-bound violation. Preserve All/Off behavior and immutable snapshots. Explore a small dither-aware subset tie-break/fill experiment rather than globally replacing nearest selection. If selection starts depending on dither/strength, propagate those identities through clients/workers/cache/export captures. Require duration-weighted GIF tests, artist comparison and phone timings; do not turn the cap into a promise to use exactly K colors.

## Research only: current dither search can miss substantially better values of its own objective

Refs: `src/lib/palette-dither.js:28` limits to four nearest candidates; `:56` sets penalty .03; `:63` projects in linear RGB; `:67–69` checks only three adjacent occupancies, while `:71–73` scores Oklab mixtures. Projection in one geometry need not minimize another.

Score used here is exactly `squared Oklab distance(source, Oklab(mean linear RGB)) +.03×mean squared Oklab point error`. Oklab coordinates use L≈0..1; these are **dimensionless squared distances, not CIEDE2000 or 0..100 ΔE values**. Strength100 means the target equals the source; no new metric or coefficient is introduced.

For #6020e0→DawnBringer16/8×8/100, current output is 62 #597dce +2 #30346d. Keeping the **identical four candidates and the same pair/score**, exhaustive occupancy finds 28 #597dce +36 #30346d: score .03515996→.02446398 (−30.4%); integrated error .03409976→.02331416; point error **increases** .03534000→.03832711.

Guard: an independent implementation of the current projected search matches the production emitted score in all476 synthetic source/preset rows, maximum difference0; the exhaustive same-four search only broadens occupancy1..63 and never scores worse. Full-palette pair search separately exposes the already documented candidate restriction: #606060→ENDESGA8 mixes purple/orange instead of available dark/white; integrated error .0186000 vs .000080997, but point error .0281061 vs .0856542. Wider contrast can be objectionable grain.

**Adversarial real-art result prevents a shipping recommendation.** On12 hash-verified existing Kenney sprites ×PICO8/DB16/ENDESGA8 (36 cases), same-four exhaustive occupancy changes355 pixels. Actual4×4 spatial-block error improves20 cases, worsens15, one unchanged; equal-case mean improves only1.83% (.00358169→.00351626). Mean point error barely changes (.01490203→.01489743). A synthetic uniform-patch lower bound is not artist preference. Full occupancy can cost up to378 mixtures per nonmemoized RGB vs18 currently. Keep this as a bounded oracle and benchmark a budgeted search only if artist evidence justifies it.

## Research comparison and validation

[Oklab's published transform](https://bottosson.github.io/posts/oklab/) supports the existing matrices and perceptual coordinates, not a universal guarantee that independently nearest colors preserve material ramps or meaningful details. Existing matching-alternative, direct-K, rare-color weighting and Keep studies already document regressions and closed/deferred decisions; this audit does not reopen them.

[Yliluoma's original arbitrary-palette ordered dithering work](https://www.bisqwit.iki.fi/story/howto/dither/jy/) supplies the useful exhaustive pair/ratio reference and explicitly discusses psychovisual pruning and computational costs. It supports an oracle comparison, not unbounded production search. [libimagequant's official API](https://pngquant.org/lib/) illustrates distinct fixed-color, importance-map, quality and dither controls; its diffusion, generated-palette and alpha semantics differ from Colorfetti. A library replacement is not established by its feature list.

122/122 focused tests pass across quantize, generated, limiter, dither, Cleanup, layout and viewer-layout (7 files). Initial sandbox temp rename failure was resolved by process-local TEMP/TMP within this audit folder; session-owned temp cache was then deleted after verifying its resolved absolute path. No escalation required.

Reproduce: `node bench/app-review-2026-10-18/color-quality/probe.mjs`; `node bench/app-review-2026-10-18/color-quality/layout-probe.mjs`; `node bench/app-review-2026-10-18/color-quality/visuals.mjs`. Probe/visual scripts use the already installed bundled Sharp runtime for independent fixture PNG decoding and diagnostic rendering. No package changes or network are required. `results.json` retains selected synthetic records plus all36 real rows; `layout-results.json` retains only selected sweep records. `diagnostic.png` uses current production output pixels only, visibly inspected at native size. Browser UI/OS clipboard/device acceptance is not claimed by this kernel review.
