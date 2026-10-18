# Candidate D1: full-source nearest addressing

Status: **REJECTED — NO SHIP.** Criteria below were written before candidate
timings. Desktop warmed gains passed, but native1024/2048 warmed Save CPU gains
of4.1%/6.8% missed the10% gate. Tiny first/warm and RGB/cap-Cleanup adverse
observations also prevent a broad safety claim. No predicate narrowing, threshold
change or third tuning round was attempted. Exact patch: `candidate-d1.patch`;
tested module: `../review/quantize.candidate.js`. Production quantizer and tests
are restored exactly. Replay scripts read the archive, not restored live source.

Baseline: `217cb64360784c066e944f8121858d7726f0e4f2`, immutable production build on port5371. Practical2048 CC0 sprite sheet Save nearest was359.8ms elapsed/136.2ms renderer TaskDuration (single baseline observation, not a median). Fresh dedicated CPU profile `baseline-profile/sheet2048/profile-2.json` attributes59.223ms self samples to built `Fa`; it is exactly `src/lib/quantize.js`'s nearest `convert` (function body and immediate `checkCanceled`/`quantizeAsync` neighbors inspected in the frozen build). Next named sample Ys (PNG row packing)8.779ms. Profiling overhead and coarse sampling make these attribution evidence, not speedup evidence.

Hypothesis: source-sized nearest conversion currently computes `ys[floor(o/result.w)]`, `xs[o%result.w]` per pixel even though both arrays are identity maps. Store one `fullSource = mw === w && mh === h` job boolean and use `o*4` for that predicate inside nearest convert. Sampled addressing, dither addressing, pixel matching arithmetic and tie order remain untouched. This adds a boolean to short-lived conversion state and one conditional per nearest pixel; it adds no retained cache/buffer/worker. Job validation still runs first. Numeric multiplication stays Number arithmetic, without bitwise offsets.

Proposed ownership: `src/lib/quantize.js` only, plus behavior-focused regression cases in `src/lib/quantize.test.js`; no App/Tile ownership. Await coordinator assignment before source edits.

Predeclared acceptance (before candidate measurements):

- Five warmed alternating AB/BA pairs in isolated sandboxed Edge contexts with immutable identical-dependency builds; report all trials. Source-cold/module-cold observations separate.
- Target nearest full-source practical sheet1024/2048: at least15% median kernel improvement and10% renderer TaskDuration improvement for integrated Save, repeatably across pairs, without a new >50ms task. Total Save elapsed also reported (compression/download may dominate).
- Common tiny full-source/sampled, high-entropy256-color Oklab/RGB, partial-alpha Keep, cap/Cleanup and representative GIF export must not show meaningful regression (>5% and >3ms, with uncertainty considered); no cherry-picked predicate after timing.
- Exact baseline/candidate indices, used flags, transparency/alpha and decoded output equality; all eleven1-bit styles unaffected and retained checks pass. Exercise odd rectangles,1px axes, only width unchanged, only height unchanged, dither zero/nonzero, alpha eligibility, empty outputs, cancellation and async/sync parity.
- Final unprofiled built integration and native Pixel8Pro evidence required. Native improvement gate evaluated on same practical fixture sizes. If desktop benefit fails, stop before phone candidate timing. If native loses materially, reject.

Independent challenger before timing: full-source predicate must compare both dimensions; preserve source-coordinate dither, Number offset semantics, tie arithmetic, EMPTY flags, Keep alpha, subset/Cleanup callers and async cancellation. Integrated Save must show benefit beyond helper timing.

No accepted optimization quota. A tiny/noisy win or a faster kernel masked by UI regression is a rejection with the baseline evidence retained.

## Round one response and results

The independent reviewer requested a conservative dimension guard in the job predicate (`w/h <= 0x80000000`). It preserves the prior Int32 coordinate-table behavior for unusual accepted array-like callers; practical images always satisfy it. It changes no validation or per-pixel work. Added regression cases exercise both metrics, Cut/Keep, one-pixel axes, odd rectangles and each unchanged-axis combination against the independent scalar oracle, including used flags/transparency/alpha and async parity. Four focused suites/78 tests passed. Independent challenger separately ran frozen/scalar differential tests.

See `kernel-results.json`, `export-pairs/results.json`, `summary.json` and README for all observations/ranges. Five warmed alternating pairs measured nearest kernels −35%/−37% for 1024/2048 sheets. Warm integrated Save renderer CPU fell 15.9%/18.3%; the 2048 target improved in all five pairs. GIF256 CPU fell23.1%; Keep and entropy256-palette cases did not show a material adverse CPU result. All 120 native download bytes were equal across builds/trials, all 14 kernel cases had equal index/used/alpha hashes, no paired Save task above50ms was observed.

Tiny Save is explicitly inconclusive/adverse: median elapsed31.4→37.1ms, but ranges overlap (29.4–43.6 vs27.3–46.2) and three of five paired elapsed deltas improve (median−1.3ms). CPU8.138→9.272ms adds1.134ms, below the declared3ms floor. This is not a proof of no regression. Initial command labels inaccurately called first Save source/module-cold; source/quantize module are already used by preview/count. Corrected result notes call it first export after import/count readiness; warm second exports define the reported gate. Raw timings/order were not changed.

Native matched results and final uninstrumented cumulative integration still govern acceptance. Total2048 Save latency changed only1.5%, so the demonstrated claim is reduced conversion/renderer CPU, not broadly faster downloads or battery life.
