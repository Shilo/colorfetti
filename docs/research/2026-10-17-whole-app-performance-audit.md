# Whole-app performance audit — October 17, 2026

**Decision: no production optimization shipped.** One measured candidate passed
desktop warmed gates but missed the native phone gate and regressed a common tiny
case. Its source and tests were restored. Rejected code, raw trials, independent
reviews and reproducible harnesses remain under
`bench/whole-app-performance-2026-10-17/`. There is no optimization quota.

This audit starts at clean `217cb64360784c066e944f8121858d7726f0e4f2`, whose
runtime matches `34a95d97f65ec681d07b52ace85dc84e6c8ce56c`. An independent chat
later committed `35fbb73859a6526dbd6e1ccfd3671e5181d8f954` (mobile caption CSS
and its specification). That change is outside this audit. Comparative builds
both exclude it; final current-checkout integration includes it. No sources,
algorithms, settings, palette entries, output encoders or dependencies were
changed by this audit. Nothing was pushed or deployed by this audit.

## Fresh evidence and method

Three agents independently profiled desktop, controlled USB Android and challenged
correctness/measurement. The coordinator operated actual Codex Browser and reviewed
the concrete shortcut, baseline proof and adverse results. Resource reservations
separated timed comparative windows from compilation, full tests and other
profiling. The unrelated active chat explicitly left Android untouched.

The workload/dependency/source/build manifests freeze CC0 Kenney/rubberduck
sprites, the genuine transformed six-frame effect, 1024/2048 transparent-gutter
sheets and 128/32-frame and256/48-frame motion assemblies. Assemblies are not
artist-authored walk cycles. Deterministic transparent, silhouette, partial-alpha,
bounded entropy,4096/4097 and256-color cases supplement ordinary artwork. Device
comparisons use the same decoded fixture bytes, not canvas readback.

Actual Codex Browser is Chrome155,1280×720,DPR1; its optional finite test-HTML
probe records startup/control/paint, Long Tasks and rAF observations without
changing production bundles. One illustrative pair is not a performance verdict.
Auxiliary sandbox-enabled Edge155 uses1280×900,DPR1. The actual USB Pixel8Pro
uses Brave/Chrome155.0.8059.85,448×819,DPR2.25, unlocked portrait, USB charging,
roughly34°C. Detailed thermal/viewport/orientation conditions are in native raw
receipts. The browser sandbox and personal security/appearance policy stayed intact.

Imports stage file serialization/allocation outside timed app work. Readiness
checks exact imported identities, current controls, fresh expected canvas paint
and separate exact captions; the demo/intermediate settings cannot satisfy it.
Renderer TaskDuration excludes worker CPU. Native Save timing ends at the native
download event; manager wait/pull/decoding is separate. First Save after import
and count is **not** source/module/process cold. All first and warmed trials are
retained. Instrumented rAF cannot establish app idle polling, and heap observations
cannot establish a whole-app memory bound or universal absence of leaks.

## Candidate D1 — rejected within two focused rounds

A real2048-sheet Save profile attributed about59.2ms self samples to nearest
conversion, versus8.8ms to PNG packing. The proposed shortcut used `o*4` when
both dimensions were unchanged, preserving sampled coordinates, matching/tie
arithmetic, alpha, dither and cancellation. It added one short-lived Boolean and
one per-pixel branch, with no cache/worker/buffer. Independent review added an
Int32-range guard before measurement. No later size threshold was invented.

Predeclared gates: at least15% target kernel and10% integrated nearest Save
renderer improvement, five alternating warmed pairs, exact output, and no
meaningful common/adverse loss (5% **and**3ms floor, considering variation).

| Workload | Baseline → candidate median | Decision context |
|---|---:|---|
|Desktop1024 nearest kernel|10.5→6.8ms|35% gain|
|Desktop2048 nearest kernel|40.3→25.3ms|37% gain|
|Desktop1024 warmed Save CPU|21.058→17.711ms|16% gain|
|Desktop2048 warmed Save CPU|69.409→56.711ms|18% gain|
|Desktop48-frame GIF warmed Save CPU|67.946→52.262ms|23% gain|
|Desktop2048 warmed Save elapsed|176.5→173.8ms|Only1.5%; no material download-speed claim|
|Native1024 warmed Save CPU|120.051→115.158ms|4.1%; misses10% gate|
|Native2048 warmed Save CPU|165.918→154.613ms|6.8%; misses10% gate|
|Native tiny warmed Save CPU|70.039→74.118ms|+4.079ms/+5.82%; four of five worse|

Desktop tiny first-export/elapsed observations were order-sensitive and unresolved;
they were not discarded as warmups. Native first-export1024/2048 CPU improved
about16%, but that cannot replace the failed warmed gate. Native first RGB1024
and cap/Cleanup medians also rose; all variation and paired trials remain.
No >50ms Long Task was observed in paired D1 Save windows, which does not prove
unchanged frame pacing. The illustrative actual-Codex import rAF maximum was
17.6→50ms, despite first paint372.7→359.7ms. Neither single observation establishes
a win or loss. The native gate failure plus repeatable tiny CPU loss establish
**NO SHIP** without a third tuning/review round.

Correctness passed4,896 differential cases/433,728 pixels, including2,856
independent scalar-nearest cases,816 async and eight cancellation cases. All280
paired desktop/native downloads preserved complete encoded bytes; independent
native decoding additionally checked visible RGB, every alpha byte, dimensions,
GIF frame count/delays/loop and palette membership. Hidden RGB is ignored only
where alpha is zero. Enhanced cap/Cleanup/dither expected pixels use frozen/core
integration references, explicitly not independent algorithm proofs.

The exact patch is `desktop/candidate-d1.patch`; the reviewed module is
`review/quantize.candidate.js`. Replay scripts read this archive after rollback,
so they cannot silently compare the restored baseline with itself.

## Finite whole-app coverage and remaining limits

| Path | Fresh representative evidence | Limits |
|---|---|---|
|Startup/demo/themes/restoration|Codex welcome/Auto, both themes, remove/demo; auxiliary repeated/restored startup; immutable bundle sizes and actual-Codex startup timestamps|No process-cold universal startup budget; test server excludes unrelated trailer media|
|Import|1/2/4/8 sprites,8+effect, both sheets, both motion clips, single-frame GIF and diagnostics; actual Codex picker and clipboard paste; native staged input/drop/paste handlers and no-worker genuine GIF fallback|Phone picker/physical paste and external desktop file-drop gesture not claimed|
|Palette|Auto/fixed/saved, Oklab/RGB,All/2/4/8/16, Cleanup, all dither sizes/zero/full strength, Cut/Keep, rapid cancellation, source boundary cases and palette256|Finite selected combinations; no Cartesian product|
|1-bit|All11 native desktop PNGs decoded against baseline masks; phone all11 current paints;1024/2048 cold/warm structural/pattern/diffusion, Brightness replacement and actual partial-source opacity-cut edits; Codex None/equal inks|Large sampled Checker correctly remains unknown until exact evidence; no histogram-feature revival|
|Wall/counts/Reuse|Current named counts, stale-pending Reuse/settings/removal races, actual Codex Reuse, cached Original, source removal/return; count queues/summary/subscribers in fresh focused tests|Source-level duplicate count/conversion idea remains unmeasured, not a proven defect|
|Preview|Actual Codex reversible steps/exact Fit/local Compare/close; native zoom/pan/Original/Fit; focused pointer/zoom/refinement tests, repeated close and idle|Physical pinch/trackpad hardware and external drag destination not newly validated|
|Animation|Fresh visible source/converted motion progress, Preview takeover, below/above8MiB index budget and actual over-budget384×384×48 clip, teardown|No device-independent frame-rate or whole-app memory guarantee|
|Export|Native Codex ZIP/all entries, PNG, GIF through batch, native clipboard PNG; phone PNG/GIF nearest/Keep/fallback;280 candidate files; snapshot/hover/independent subscriber/partial-GIF refusal/atomic ZIP failure tests|Android clipboard transport/native ZIP manager and actual OS drag-out destination remain unverified; fixed ZIP name avoided personal-download collisions|
|Editor/controls|Codex mixed paste/manual/library/edit/Reuse,256-color four-page draft and reset; native256 paging/manual and both themes; dialogs/gestures/storage/Lospec tests in full suite|Live Lospec integration result recorded separately; no network timing loops|
|Idle/teardown|Six desktop still/Preview/remove cycles with12 quiet windows; visible animation; six native share/remove/demo/GC cycles; worker failure/retry/fallback cleanup|One healthy lazy import worker intentional; heap deltas alone do not prove source retaining paths or absence of all leaks|

Physical Android landscape was unavailable without physically rotating the device;
system rotation policy was preserved. macOS/iOS/Safari are untested. Pending native
gestures/transports above are explicit gaps, not silently passed coverage. Source
unit checks and auxiliary/emulated work are labeled separately from actual hardware.

## Reproduced costs and techniques considered

The fresh practical baseline is not uniformly smooth. Native RGB2048 had a75ms
maximum rAF gap and one Preview-source import reached100ms without a Long Task
above50ms. Cold native2048 Stencil/Icon preparation produced131/471ms Long Tasks;
1024 runs varied71–80/186–300ms. Warm repeats avoided those Long Tasks. Rapid
Brightness reanalysis reached121ms on2048 and52ms on1024. Binary sources correctly
hide irrelevant opacity controls; actual partial-source cut edits passed.

The256-color editor aggregate action group observed61ms desktop and187ms native
Long Tasks. It includes text insertion, layout, Review and swatch creation; the
whole group is not attributable to a single parser/paint function. High-entropy
native512px dithering consumed substantial total CPU despite cooperative slices.
These are concrete baseline concerns, not newly introduced candidate regressions.

| Technique | Audit conclusion |
|---|---|
|Exact arithmetic/address fast path|Measured D1 and rejected; numerical equivalence alone did not establish practical native benefit|
|Caching/memoization/pooling|Existing RGB summaries, bounded memo and8MiB sampled animation cache preserved; no demonstrated dead-source leak or justified new retained buffer|
|Shared work/queue cancellation|Fresh pending Reuse, subscriber, failure/retry and fallback checks passed; do not change record identity to chase an unmeasured duplicate-work hypothesis|
|Workers/backpressure|Existing serial lazy workers and128KiB acknowledged transfers retained; no unapproved architectural rewrite or extra worker to hide a synchronous call|
|Yielding/batching|Existing posted-task export/import paths preserved; yielding before a cold structural function does not make that function cooperative|
|Throttling/debouncing|Existing draft/commit semantics retained; no extra delay to committed controls to improve a timing chart|
|Layout/paint|Editor aggregate signal retained for attribution; no swatch-canvas removal that would break native forced-dark colors|
|Startup/lazy loading|Actual startup/artifact evidence retained; no measured ordinary startup bottleneck justified adding another lazy boundary|
|Encoders/output quality|Native exact PNG/GIF/ZIP contracts retained; no canvas encoding, quality reduction or preview-only export|

## Final validation and cleanup

After rollback, the full suite passed **1,050 tests in66 files**, with two existing
GC-dependent skips. The production build passed. Built-app regression explicitly
used217cb64 as its reference:132 independently decoded legacy exports,12
full-palette/clipboard cases,12 RGB preset cases and13 extra integration categories
passed with no console errors. Worker failure recovery, GIF/ZIP atomicity,
clipboard snapshots, storage events and source/converted animation readiness are
included. Initial sandbox temp-rename/startup failures were setup failures;
approved host reruns retained Chromium's security sandbox.

A final uninstrumented actual-Codex2048 sheet Save from the restored current
checkout matched baseline encoded bytes. One live Lospec SLSO8 import succeeded
into the existing eight-color draft, then was canceled without selecting/saving.
The phone controller restored test-origin storage, native default downloads and
unchanged free rotation, closed only owned pages and removed only owned forwards
and exact test-download paths. All owned Codex tabs closed. Final source identity,
dependency lock and native file equality are recorded in `final-validation.json`.

No production fix was committed. A fresh cumulative review of the evidence/docs
is retained separately. Finite passing checks do not promise universal bug absence
or constant frame time.
