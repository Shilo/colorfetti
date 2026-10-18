# Fresh baseline lifecycle observation

Frozen production baseline `217cb64360784c066e944f8121858d7726f0e4f2`, port 5371, auxiliary isolated Edge 155 with Chromium sandbox enabled, 1280×900/DPR1. Coordinator owns actual Codex Browser; device profiler owns physical Android. This reviewer did not operate either shared surface.

Run: `node bench/whole-app-performance-2026-10-17/review/lifecycle.mjs`. Raw receipt: `lifecycle-results.json`.

Six uniquely named 16×16 wizard imports each reached an exact nonbusy count and a current canvas, opened Preview, zoomed, closed and removed the source. Twelve settled ~900 ms windows (wall/Preview per cycle) observed **zero new canvas puts, app rAF requests, timer schedules, object URL changes or worker construction/termination**. No measured idle window had a >50 ms Long Task or page error. The instrumentation itself schedules no rAF/timer loop and retains only primitive counters/URL strings, not detached nodes, source arrays, workers or blobs.

The genuine visible 48-frame motion assembly progressed by 16 fresh wall paints in ~1.6 s, then 14 fresh Preview paints in ~1.3 s. These short windows establish current visible progress, not a whole playback cycle or source-rate promise. Timer counts matched paints (16/14), with no rAF loop or >50 ms Long Task observed. Under-budget clip storage is covered here; over-budget streaming and offscreen pause remain other owners' coverage.

After each clear and explicit GC, reported JS heap was 4.22 / 4.35 / 4.57 / 4.67 / 4.79 / 4.80 MB, and 4.77 MB after the final motion source was removed. Object URL count was zero throughout. One healthy lazy import worker remained after the animation, matching intentional reuse. These observations **do not establish a leak or its absence**, dead-source retaining paths, native/GPU allocations or a whole-app memory bound. Module/JIT/live-demo storage and runtime bookkeeping are not separated by the heap metric. No production memory change is justified by it.

This finite fresh check found no repeated still idle work or actionable lifecycle defect. Worker fallback and independent subscriber/hover/export snapshot/atomicity contracts were freshly rerun separately in `focused-tests.json` (153 passed, two existing GC-dependent skips); those are source-level regressions, not device-runtime demonstrations. Setup failure and approved sandboxed host rerun are recorded in `setup-notes.md`.
