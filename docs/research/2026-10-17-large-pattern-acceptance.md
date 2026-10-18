# Large 1-bit pattern counts — acceptance

**Final decision: NO SHIP.** The parent and independent reviewer agree that
repeatable additional native settings CPU does not satisfy the user's conditional
performance requirement. Production sources were restored exactly to `34a95d9`.
The candidate, patch, tests and evidence remain archived for research.

Baseline: `34a95d9`. Scope: investigate exact caption availability without changing
conversion, export pixels, controls, settings or the bounded-mask policy.

## Rejected candidate

Checker, Bayer, Hatch and Noise can prove ink membership from existing per-frame
brightness histograms and the same tone lookup used by the actual mask. Lower
and upper possible-role bounds describe every full-source pattern coordinate.
Only a proven distinct visible RGB count publishes. None and duplicate RGB inks
retain their semantics. General diffusion stays unknown, except when every tone
is exactly zero or one, making every diffusion error zero.

No full-source pixel scan, mask, copied frame, worker, timer or new long-lived
cache was introduced. The existing 262,144-pixel automatic-mask limit remains.
An ambiguous phase can stay unknown; existing exact rendering can still provide
its true count. This improves availability, not a promise that all large images
always acquire a count.

## Independent correctness challenge

- 576,000 full/sample mask comparisons against the frozen baseline; more than
  194 million full-source pixels, with no pixel differences.
- 281,136 direct histogram-bound checks; 1,800 animation/ink combinations.
- 100 actual large-image cases: every reported count matched independently
  decoded baseline RGBA; 12 conservatively remained unknown.
- Throwing pixel/luminance getters prove metadata does not walk a large source.
- Retained phase-correlated alpha counterexamples prove resized patterns cannot
  safely stand in for full-source membership. The candidate never uses them.
- Candidate full suite: 1,058 passed, two GC-dependent tests skipped; build passed.

The parent independently reviewed the lower/upper proof, unified per-frame
histograms, numerical endpoints, alpha eligibility and cache ownership. The
reviewer found no actionable correctness defect in the concrete implementation.

## Actual application and output tests

Actual Codex Browser imported the 2048×2048 sheet and showed two colors in Bayer
and Noise without opening Preview. Auxiliary sandbox-enabled Edge tested all
four ordered patterns and independently decoded their native PNG saves.

The authorized USB Pixel 8 Pro ran actual native Brave at 448×819 portrait. Three
alternating import pairs covered Checker, Bayer, Hatch, Noise and diffusion. The
ordered-pattern captions became available without Preview. General diffusion
remained correctly unknown. Native saved Bayer output for both the 2048 sheet
and a 769×513 adversarial alpha image matched the frozen baseline byte-for-byte
after independent RGBA decoding, including alpha and dimensions. Counts were
two and one respectively.

The smaller adversarial image fits at exact source resolution on the high-DPR
phone, so its existing rendering correctly establishes one color. On a sampled
wall, its histogram alone remains ambiguous. The test explicitly allows the
accurate existing-render result instead of mistaking it for a bad histogram guess.

## Performance challenge

Histogram work was approximately 0.02–0.03 ms in warm Node measurements. That is
not a complete UI performance result. Fresh-page A/B imports showed noisy
aggregate CPU differences despite tied paint times; these were challenged rather
than dismissed using the kernel timing.

The independent reviewer then measured actual repeated threshold edits after
warming the same imported source and viewport, with explicit actual-paint
readiness, current exact count, CDP task/script CPU, rAF gaps and long tasks.
Original and isolated repeat receipts are retained. The declared gate rejects
repeated new long tasks or a greater-than-one-frame p95 input/paint regression;
repeatable aggregate CPU increases require attribution before acceptance.

The isolated repeat records one actual paint, two layouts and the same style-pass
count per committed edit in both variants. It found no extra conversion or layout
cycle, no new >50 ms long task and no greater-than-one-frame p95 input/paint loss.
Nevertheless, native Checker CPU repeatedly increased:

| Native isolated pair | Script CPU baseline → candidate | Total task CPU baseline → candidate | p95 input-to-paint baseline → candidate |
|---|---|---|---|
|0|16.415 → 18.020 ms|34.299 → 37.550 ms|19.9 → 20.4 ms|
|1|16.345 → 17.629 ms|33.604 → 35.793 ms|19.5 → 20.7 ms|

The reviewer challenged treating response-time similarity as proof of no
performance harm. Parent agreed: the repeatable roughly 1.3–1.6 ms extra script
CPU and 2.2–3.3 ms task CPU matter during repeated setting edits. The cause cannot
be assigned solely to the tiny histogram loop; speculative caches or a new
synchronous publication path would require a further design and measurements.
Those were deliberately not added to force this candidate through acceptance.

The bounded two-round review is closed with no ship. This is a performance
tradeoff rejection, not a discovered pixel-count or conversion correctness bug.
The separate whole-app performance audit is a fresh task, not another automatic
round of this closed feature investigation.

## Retained production validation

After preserving the candidate and restoring the source, `git diff --exit-code
34a95d9 -- src` passed. The restored production build passed and its full suite
returned to **1,050 passed, two GC-dependent tests skipped**. A fresh actual Codex
Browser tab confirmed the original large Noise image remains accurately unknown
on the sampled wall, rather than exposing the rejected feature. The baseline was
also the unchanged native build used in the paired Android measurements.

No production fix or feature was committed. Research/evidence and the separate
new-session performance handoff are independent commits; nothing is pushed.

## Test setup corrections

- Transported files were staged before timed application work; imported filenames
  and actual wall canvases, rather than the live demo, established readiness.
- An adversarial source that renders exactly on Android correctly reports one;
  that differs from a sampled desktop wall without being a regression.
- Each source/output now has a distinct filename within a run. An initial native
  checker reused a basename and pulled the prior 769px output for a later 2048px
  assertion. Distinct names corrected the harness; no product change was needed.
- Desktop and native performance windows were separated from compilation and
  test-suite CPU where possible. Original noisy/outlier observations remain in
  the receipts; isolated repeats do not erase them.
- Physical Android portrait was tested. No physical-rotation, Safari, macOS or
  iOS result is claimed. Native browser security/sandbox settings were preserved.

Evidence lives in `bench/large-pattern-counts-2026-10-17/`,
`bench/large-pattern-challenge-2026-10-17/` and
`bench/large-pattern-acceptance-2026-10-17/`.
