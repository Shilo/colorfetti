# Fresh desktop whole-app performance evidence

These are **auxiliary headless Microsoft Edge** runs with its native security sandbox enabled, not actual Codex Browser or Android evidence. Coordinator/device directories retain those independent surfaces. Baseline 217cb64360784c066e944f8121858d7726f0e4f2 is fixed even though unrelated mobile-caption work advanced current HEAD. Candidate builds materialize that baseline and copy only D1's quantize files. Neither variant contains the foreign CSS/spec change.

## Reproduce

From repository root, with installed dependencies:

```
node bench/whole-app-performance-2026-10-17/server.mjs .tmp/whole-app-performance-2026-10-17/baseline/dist 5371
node bench/whole-app-performance-2026-10-17/desktop/run.mjs
node bench/whole-app-performance-2026-10-17/desktop/interactions.mjs
node bench/whole-app-performance-2026-10-17/desktop/build-candidate.mjs
node bench/whole-app-performance-2026-10-17/server.mjs .tmp/whole-app-performance-2026-10-17/replay-candidate/dist 5372
node bench/whole-app-performance-2026-10-17/desktop/kernel-server.mjs
node bench/whole-app-performance-2026-10-17/desktop/kernel.mjs
node bench/whole-app-performance-2026-10-17/desktop/export-pairs.mjs
node bench/whole-app-performance-2026-10-17/desktop/summarize.mjs
node bench/whole-app-performance-2026-10-17/desktop/build-manifest.mjs
```

Each server is a separate long-lived process. Reserve host timing windows; don't build, test or run another browser benchmark concurrently. Edge launch was blocked inside this machine's filesystem wrapper; approved execution outside that wrapper retained `chromiumSandbox:true`. No security flags were disabled. Node unit tests initially hit temporary-file rename EPERM; setting TEMP/TMP to workspace `.tmp/whole-app-performance-2026-10-17/test-temp` resolved it. Focused quantize/alpha/dither/state suites:4 files, 78 tests passed.

`fixture-manifest.json` preserves licenses/origins/hashes of 13 practical fixtures, reverified before each practical run. Its sourceRoot points to the retained originals instead of duplicating those assets. `fixtures.mjs` and `diagnostic-manifest.json` freeze 7 owned deterministic diagnostics plus the 256-color palette before candidate timing. Motion assemblies are test assemblies, not artist walk cycles; genuine effect GIF is six retained frames with assigned 100 ms timing/binary alpha.

## Baseline scope and receipts

- `baseline/results.json`: five practical cohorts:8 distinct sprites plus genuine effect, 1024/2048 low-color sheets,128×128/32-frame and 256×256/48-frame motion. All 28 native PNG/GIF/ZIP entries decode with 0 RGB/alpha differences, complete dimensions/frames/delays/loops and palette membership. Independent scalar nearest oracle; enhanced cap8/RGB/Cleanup4×4 output oracle uses production cores outside browser plus independent decoding/contracts.
- `baseline-profile/sheet2048/profile-2.json`: retained real nearest-Save CPU trace. `summary.json` has top sampled source frames. Dominant built Fa is nearest convert, 59.223 ms self; next named PNG packing Ys 8.779 ms. This identifies work; sample times are not exact function totals.
- `interactions-baseline/results.json`: 26 finite baseline stages: empty themes/restored settings,1/2/4/8 distinct sprite import,all 11 style controls/native PNGs,transparent/two-color/glow/entropy/4096/4097/single-frameGIF and 256-color editor paging. All 11 native style outputs match exact core masks; Keep alpha is exact. Editor multi-input phase had one 61 ms Long Task. Its 748.7 ms elapsed includes input automation; no narrow source attribution/fix is established.
- First interactions attempt clicked Save with Style panel open. The app intentionally dismisses the panel and consumes the outside press. Harness now explicitly closes it; first-attempt receipt retained as a harness correction, not an app failure.

Readiness requires exact imported names and cardinality (demo cannot satisfy one-source readiness), nonbusy exact captions and real canvases. Practical final settings additionally require a fresh post-dither paint and exact native final-settings output. Source transport is staged outside import timing. Canvas dimensions and viewport/DPR are retained. Practical rAF sampling is an active test-only loop and adds bounded overhead: its idle CPU is **not evidence of a production idle rAF loop**. The paired native-Save harness has no rAF loop.

## D1 desktop result, before native acceptance

Final coordinator/device decision: **REJECTED — NO SHIP**. Native warm targets
missed the10% integrated gate and native tiny warm CPU crossed the adverse floor.
The table below is retained desktop evidence, not an accepted optimization.
Production source/tests were restored; `candidate-d1.patch` and the reviewed
archived module preserve this investigation. Build/kernel replay scripts use that
archive after rollback. Generate diagnostic PNGs with `node
bench/whole-app-performance-2026-10-17/desktop/fixtures.mjs` before interaction
replays. Diagnostic PNGs are reproducible inputs, not all committed artifacts.

Acceptance criteria were set before candidate timing in `candidate-full-source.md`. Full-source direct-addressing changes no matching arithmetic/alpha/ties or dither path, adds one short-lived job Boolean and a nearest-loop conditional, and retains existing coordinate tables. Conservative dimension guards preserve unusual legacy Int32-table behavior. This does not remove allocations or promise zero overhead.

| Warm workload | Before → candidate median | Interpretation |
|---|---:|---|
|1024 sheet quantizeAsync |10.5→6.8 ms|35% faster kernel|
|2048 sheet quantizeAsync |40.3→25.3 ms|37% faster kernel|
|1024 sheet Save renderer CPU|21.058→17.711 ms|15.9% less CPU|
|2048 sheet Save renderer CPU|69.409→56.711 ms|18.3% less CPU|
|48 frame GIF Save renderer CPU|67.946→52.262 ms|23.1% less CPU|
|2048 sheet Save elapsed|176.5→173.8 ms|1.5%; no material total-latency claim|
|tiny sprite Save renderer CPU|8.138→9.272 ms| +1.134 ms, below predeclared 3 ms floor|
|tiny sprite Save elapsed|31.4→37.1 ms|inconclusive adverse result; overlapping ranges and paired median delta−1.3ms|
|glow Keep Save renderer CPU|7.090→6.605 ms|small absolute difference|
|entropy 256/256 palette/RGB Save renderer CPU|43.736→43.264 ms|essentially tied|

Kernel14cases×5alternating pairs plus observed warmups match exact index/used/alpha hashes. Native Save6cases×5alternating pairs, first/second export separately, produced 120 downloads with identical complete encoded bytes across variants and trials. No task >50 ms observed in these paired Save windows. All raw trials/ranges remain; no outliers removed. Each variant gets a fresh context per pair. First Save occurs **after** import and count readiness: source and quantize module have already been used. Initial command-log wording source/module-cold was inaccurate and is explicitly corrected in result notes; optional encoder first use may still differ. Warm second Save is the gate result.

Desktop target kernel and CPU gates passed. Tiny elapsed remained unresolved
adverse evidence. The subsequent native gate failed and the coordinator rejected
D1, as recorded above; this is a closed investigation. Source memory,
worker/compression CPU, GPU/browser memory and total app memory remain outside
renderer TaskDuration/heap-delta measurements.
