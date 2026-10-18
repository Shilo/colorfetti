# Independent measurement review

Baseline source: `217cb64360784c066e944f8121858d7726f0e4f2` (coordinator declaration; exact build manifest remains required).
Owner: challenger. Production read-only. This is a fresh audit; historical results below are constraints, not completed coverage.

## Required validity checks

- Freeze lockfile/dependency versions, full revision, build content hashes, server configuration, viewport/DPR/input mode, browser version and actual canvas dimensions before comparing. Immutable per-variant builds; no rebuilt lazy chunks under an active tab.
- Stage files/base64/File construction before timed import. Label input assignment/change as application import, separately from actual picker/drop/paste interaction coverage.
- Identify every imported filename/item, not just figure count (the demo is also a figure). Record final committed control state and exactness/busy status. First post-action canvas publication may be intermediate; it cannot alone prove current final readiness.
- Record first paint separately from final pixels/count. If unchanged cached return does not paint, verify current output identity rather than requiring artificial work.
- Sample rAF only within each stated active observation window; clear/bound diagnostics. Instrumentation-driven rAF cannot establish app idle polling. Canvas wrappers must not retain nodes. Long-task observer delivery must be drained before collecting the final window.
- Measure TaskDuration, ScriptDuration, style/layout and elapsed together. Renderer counters exclude worker CPU; zero >50 ms tasks does not prove smoothness. Fixed observation/quiet waits are not conversion latency.
- At least five warmed alternating AB/BA pairs for a material proposed optimization, plus clearly labeled process/module/source-cold observations and all adverse trials. Reserve host-heavy windows; record native thermal/charging state.
- Native downloaded PNG/GIF/ZIP bytes decoded independently establish output truth. Brave canvas readback is a readiness/progress aid only. Independently check dimensions, visible RGB/all alpha, GIF delays/loop/frame union, every ZIP entry, and alpha-zero hidden-RGB exception.
- Cache/worker candidates require a global or lifetime bound, shared-subscriber cancellation checks, dead-source release evidence and uninstrumented sanity. Heap/PSS deltas alone do not establish a leak or an app memory bound.
- No ship from source suspicion or a kernel win. Set target benefit and regression gates before examining candidate medians; two focused review rounds maximum. Preserve current large-pattern unknown count behavior and the closed rejected dither cache.

## Historical harness pitfalls requiring adaptation

`bench/practical-workloads-2026-10-16/workflows.mjs` correctly prestages import transport and independently decodes downloads, but is not sufficient unchanged for this audit:

1. `stage(..., {paint:true})` requires only a write after a timestamp. It does not assert final control identity, all automatic exact counts or final stable canvas dimensions. A settings sequence can satisfy it with an earlier intermediate render.
2. Import waits only for figure cardinality. Add exact imported filenames and assert that the live demo disappeared.
3. The note that sampled sheets need not acquire Palette counts predates the automatic exact inspection contract. Current Palette count readiness must be observed independently; large unproven 1-bit pattern counts correctly remain unknown.
4. `writes` is cumulative rather than a per-window delta; `heapDelta` is an uncollected allocation delta, not retained memory. Continuous rAF/observer arrays grow for the full document and the rAF loop contaminates idle observations.
5. The declared commit is an environment/default string, not an artifact proof. Frozen source references must replace live `../../src` imports for differential candidate output checks.
6. Enhanced expected output uses production quantizer/subset/Cleanup modules. This is useful integration parity but not an independent algorithm oracle. Keep its independent alpha/membership/timing gates and explicitly label limitations.
7. Preview action sequences mostly await controls/fixed delays; add zoom/refinement/pan dimensions, actual current output, cancellation and idle assertions. Playback observation correctly refreshes its paint baseline after bringing the clip into view.

## Initial targeted hypotheses (unmeasured; no leak/win claims)

| Source attribution | Reproduced condition required | Candidate boundary / challenge |
|---|---|---|
| `src/App.svelte:713–725,765–805`; `src/Tile.svelte:247–300`; `src/lib/palette-usage.js:27–34` | Automatic pending count ignores later exact preview flags; high-entropy/dither/Cleanup may perform full count conversion beside an exact wall conversion | Instrument jobs and source pixels under an ordinary sheet workflow. Sharing evidence must preserve pending record identity, explicit Reuse subscribers, whole-GIF union, count scheduling, cancellation and no retained clip. Do not assume dual conversion is removable until tracing proves the ordering. |
| `src/Tile.svelte:34–40`; `src/lib/source-color-summary.js:11–25` | Original counting starts on Tile mount even while converted, possibly competing with first paint | This is current functionality/precomputation; no permission to defer it silently. Attribute cold summary/Original scans vs conversion, validate cached Original return and Preview subscriber behavior. |
| `src/Tile.svelte:235–245`; `src/lib/palette-animation-cache.js:28–47` | Cache acquire reruns on request object identity or dimensions; admission/release under opening Preview and rapid settings | Verify reservation/refs and actual frame conversions under/beyond 8 MiB, Keep/Cut, hidden wall and close. A source-level refcount suspicion is not retention evidence. |
| `src/lib/palette-state.js:75–82` / native save paths | Exact count conversion and native Save convert the same source near-simultaneously | Timed overlap can inflate export latency; record count queue state. Existing lazy streaming avoids clip retention; a broad export cache could regress memory/lifetimes. |

## Initial coverage ledger

All currently pending: startup/demo/both themes/restoration; picker/drop/paste plus still/GIF/single-frame GIF and fallback; Palette methods/caps/Cleanup/dither/Keep; all eleven 1-bit styles/inks/reanalysis; exact counts/Reuse/queue cancellation; Preview zoom/pan/hold/navigation; visible/offscreen under/over-budget animation; native Save/Copy/ZIP/drag snapshots/failure; editor/library/reset/persistence; repeated teardown and idle. Actual Codex Browser and USB Android are owned by coordinator/device profiler, not this reviewer. Isolated auxiliary Edge timing awaits reservation.

## Reviewer follow-through

The initial list above is a premeasurement snapshot, not the final project ledger. This reviewer subsequently ran the fresh baseline lifecycle checks recorded in `lifecycle-review.md`, independently aggregated and source-attributed the desktop trace in `profile-review.json`, and passed the D1 frozen/scalar differential plus 153 neighboring fallback/queue/snapshot/atomicity regressions recorded in `candidate-d1-review.md`. Fresh built-app pending-Reuse cancellation also passed both settings/source-removal paths in `queue-cancellation-results.json`: no stale editor appeared, and subsequent current drafts matched the current caption's 8/7 colors. The usage lazy module was artificially held to establish pending work, not to measure normal network latency. Coordinator/device/desktop receipts establish their own coverage. No initial pending entry becomes done solely because it was covered in an older study.
