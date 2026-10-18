# Independent whole-app performance evaluation — October 18, 2026

The starting implementation is Claude's completed five changes at
`5ae11b13977f2ce3cc7ae67cf7bd220f8a8734ce`. Codex independently read the implementation,
consulted primary API guidance, wrote new scalar/differential probes, profiled actual
Codex Browser and authorized USB Android workflows, and challenged the results with
a separate reviewer. Claude's receipts are historical reference material.

Evidence and reproduction scripts are in
[`bench/codex-independent-performance-2026-10-18/`](../../bench/codex-independent-performance-2026-10-18/README.md).
This report does not claim every conceivable workload or platform was measured.

## New demonstrated improvement

Preview's saved focus-return button could retain a removed image or animation.
Svelte's delegated click closure on the detached button reaches the Tile's frame
buffers, while App kept the button after close. The fix captures the focus target
locally, clears App's stored target and input modality before `tick`, and performs
the same focus/blur return using that local target. It adds no listener, worker,
timer, converted-frame cache or pixel conversion change.

On the native Pixel 8 Pro, a controlled 48-frame 256×256 animation test, after
removal, an 11-second URL-expiry wait and two explicit GCs, retained 22,976,754 bytes
of backing storage after opening/closing Preview. Never opening Preview retained
595,193 bytes. Replacing the old trigger with a tiny image's Preview returned to
615,727 bytes. A retained heap snapshot independently corroborates
App → detached caption button → Tile closure → item.frames → ImageData buffers.
The isolated candidate returns to **595,933 bytes**, releasing about **22.38 MB**
for this fixture. This is bounded last-preview-source retention, not unbounded
accumulation, an OS-memory saving estimate or a whole-app peak-memory bound.

The fix is accepted and committed locally as `ae97d0e`. Forty native closes in
two matched rounds preserve keyboard Escape focus, native-touch pointer blur and
captions; four PNG witnesses have identical bytes and independently checked pixels.
Actual Codex Browser Enter-close returns the invoking caption button. Final native
cumulative retention is 595,853 bytes, with zero errors. The
[decision](../../bench/codex-independent-performance-2026-10-18/preview-trigger-decision.md)
preserves the original gates and all adverse evidence.

Close-event→next-task paired latency stays within the original 5 ms AND 5% gate.
This measures only that portion of close, not full end-to-end latency. Broader
renderer CPU trends slower: pointer paired +6.684 ms/+21.25% with 3/5 worse, then
an unchanged repeat +4.615 ms/+16.57% with 4/5 worse. The repeat misses its 5 ms
absolute criterion; this is retained uncertainty, not proof of no CPU regression.
Keyboard paired increases are 2.229 ms then 1.179 ms. Acceptance concerns the large
demonstrated memory release and preserved behavior; no CPU or latency speedup is
claimed. There was no third repeat.

## Claude's five changes, independently tested

Five alternating matched native pairs were retained for each target. These
medians describe the named work; percentages must not be added across overlapping
changes. `io-android/comparative-summary.json` and the independent review contain
all trials, paired deltas, ranges, exact witnesses and adverse phases.

| Change | Fresh native target evidence | Limits and adverse evidence |
|---|---|---|
| B1, non-luma analysis and zero seam-pair skip | With B5 disabled in both builds, 2048 sheet R→G→Value renderer CPU 534.9→430.7 ms; 5/5 pairs faster. Final paint 755.7→669.6 ms. | B5 supersedes part of the original synchronous loop. The initial 5394 reversal was incomplete; it supports no complete B1 claim. Valid comparison is 5399→5398. Tiny-wall ranges overlap. |
| B2, synchronous compression for ≤65,536 filtered PNG row bytes | 16px first-export handler→download-request 32.2→7.8 ms; repeat 38.9→6.5 ms; 5/5 faster. | Preparation benefit, not a universal native Save/CPU win. Inclusive first tiny Save and first partial-Keep CPU have adverse phases. Above-threshold 1024 repeat handler 92→98.5 ms and renderer CPU 76.1→81.7 ms are retained. Historical Claude aggregate REJECT plus coordinator override remains explicit. |
| B3, defer automatic exact captions during a real slider drag | Four distinct 512px sources, 40 native touch moves: renderer CPU 959.4→739.4 ms; 5/5 faster. Final threshold 229 and exact captions agree. | Stationary press leaves threshold/count unchanged. Release→caption 130.7→133.6 ms, paired +4.3 ms, worst +8.3 ms. The fresh native timing suite does not cover every held/cancel/replacement branch; source/unit checks are identified separately. |
| B4, reuse completed exact summaries | 2048 sheet Max colors 2→4→8 completion 736.7→203.8 ms, renderer CPU 226.0→149.6 ms; 5/5 faster. Four cap-8 PNG witnesses are byte-identical and independently decoded. | Cold Auto first series is slower. One preregistered unchanged repeat trends slower but misses the 16 ms AND 10% / CPU 10 ms AND 10% criteria. This adverse concern is inconclusive and retained; no claim of a universal Auto gain. |
| B5, posted analysis row bands | 2048 sheet R→G→Value renderer CPU 431.1→347.2 ms; final paint 614.2→483.1 ms; 5/5 faster. Off observed 80–106 ms tasks; on observed none ≥50 ms in these target windows. | Finite observation, not zero CPU or a hard 8 ms ceiling. Very wide rows, final publication, shared animation seams and cold structural prep remain indivisible. Tiny-wall ranges overlap. |

The new core tests independently compare 864 scalar, synchronous and asynchronous
analyses; 792 historical masks over all eleven styles; source-coordinate sampled
and full conversions; summary eligibility/fallback and weighted histogram subsets;
exact Auto palettes; alpha/256-color boundaries; caption counts; cancellation and
source ownership. The raw ledgers specify each count and oracle. Unused floating
diagnostic costs are not asserted bit-identical. Native outputs use independent
PNG/GIF decoding and scalar nearest-color checks; 1-bit export references retain
the frozen algorithm and are labeled accordingly.

## Whole-app coverage and source provenance

All 96 project-owned implementation/configuration inventory entries were assigned
and read in full, with function/block notes, call-site findings and cross-module
ownership review: root 5, core 21, I/O 22, UI/tooling 48. The generated lockfile is
reviewed as a dependency boundary, not as hand-written implementation. Vendor
library internals are not claimed exhaustively audited. Hashes establish source
provenance; the ledgers establish reading.

Fresh primary research is connected to the actual call sites: Svelte effects and
delegated events, browser task/transfer ownership, ImageDecoder/canvas/clipboard
constraints, typed arrays and safe integer weights, fflate's sync/async API,
Oklab's published matrices, layout and finite Long Task/LoAF observations. Links
and decisions are in the root/core/I/O/UI research ledgers; API novelty alone did
not justify a code change.

Actual Codex Browser is Windows Chrome 155, normally 1280×720/DPR1. Its real file
chooser, preview/settings/editor controls, PNG/ZIP/GIF downloads, clipboard write,
all eleven styles, cancellation and removal were exercised. Phone-width 390×844
and short-landscape 819×448 checks found no horizontal overflow; Preview and the
44px settings controls remained reachable. Temporary viewport overrides are
restored. Finite probe windows are observations, not conversion latency.

Native USB evidence is a Pixel 8 Pro with authorized ADB, Brave 1.97.59 /
Chrome 155, portrait CSS448×819/DPR2.25. Actual rotated native viewport is
947×364, not a simple transpose of portrait. One device owner serialized timing,
restore and cleanup. Tests include 1/2/4/8 distinct sprites, shared Auto, large
sheets, all styles, Keep/Cut, dithering, cap changes, Cleanup, animations including
over-budget clips, Preview/playback, editor acquisition/review/paging, worker
fallback/failure Retry, exact native PNG/GIF/ZIP exports, Copy and late-result
suppression on removal. Synthetic CDP/File/drop/paste inputs run real handlers
and decoders; they do not measure OS picker or cross-application transport.

All timing builds were immutable and measured outside build/test windows. B1's
partial reversal, early instrumentation errors, failed stale selectors, interrupted
server case, input-harness mistakes and failed/default-temp test runs are retained
and qualified rather than counted as application failures or discarded trials.
The early actual-Codex Long Task filter missed overlapping input tasks; those zero
arrays are not evidence of no tasks. The corrected v3 overlap/history/takeRecords
probe is labeled separately. Frame gaps and decoded outputs from earlier receipts
remain useful under their stated limits. The corrected v3 cold-2048 interaction
windows observe a 590 ms task / 599.8 ms frame gap for Icon and a 131 ms task /
149.8 ms frame gap for Stencil. Menu/selection events overlap a task, so these are
interaction windows, not isolated kernel timings. Complete final DOM receipts
were saved directly as well as by POST; navigation may cancel a pending POST and
older snapshots are not treated as complete final histories.

Concurrent chats changed export filenames in `1fe03ed` / `18de3f7`, and later
worked on GIF palette import. Filename changes are included in the final isolated
correctness build. Unrelated working-tree GIF/import/docs changes are preserved
and explicitly excluded from causal performance comparisons. Final provenance
records both the frozen audit source and any outside drift; baseline review is
not silently relabeled as a review of those new external implementations.

## Safe test discovery

Local commit `891fca2` extends Vitest's existing default exclusions with
`**/.claude/worktrees/**`, retaining `.tmp/**`. Before the fix, 324 discovered files
included 258 copied tests in two registered nested worktrees. Afterward, exactly
66 intended files remain. A temporary ordinary future-test fixture was discovered
as the 67th file and executed, then only that owned fixture was removed. Both
registered worktrees were preserved. This avoids a narrow allowlist that would
silently hide future project tests.

The plain suite passed 66 files / 1,058 tests with two existing GC-dependent skips
using a process-local workspace TEMP/TMP directory. Earlier default-temp Vite SSR
rename EPERM errors are recorded separately; no security setting or global temp
configuration was changed. After the runtime fix, the isolated cumulative code
matching `ae97d0e` passes **66 files / 1,071 tests / two existing skips**, and the
production build passes. The additional 13 tests belong to the concurrent filename
commits. An initially incomplete snapshot omitted a brand-QA CLI invoked by a test;
adding that exact tracked dependency resolves it without runtime/test-exclusion
changes. Its failed log is retained. Native cumulative full PNG, 48-frame GIF,
1-bit PNG and two ZIP payloads decode exactly, with all GIF delays/loop preserved;
Copy, focus and raw ImageDecoder PNG checks pass. Actual Codex Browser's final
PNG matches the independently verified baseline bytes under its new filename;
256-color review, 64-swatch paging, keyboard stepping, focus and Reset pass.

## Rejected candidates and remaining costs

Only demonstrated practical improvements are promoted. New candidates have
written gates, matched evidence, exactness checks and at most two focused rounds.

- Replacing generated-palette seed membership scans with Set helped synthetic
  high-color cases slightly. Practical sprites/sheets skip that loop. Rejected;
  no runtime edit.
- Disabling tooltip/swatches did not reproduce a consistent native editor gain.
  Fresh attribution places the 180–190 ms task at Paste256 plus Tab/blur; Review
  itself has <1 ms layout and no observed ≥50 ms task. Both-off diagnostics remove
  behavior, are not shippable, and fail the declared every-pair gain gate. This
  corrects the earlier attribution to Review without asserting a browser-internal
  cause. Input focus/IME/automation may contribute.
- The canvas-grid demo/editor counter probe found redundant CSS writes but no
  material benefit under the declared significance threshold. Import, resize and
  source-replacement attribution remains unmeasured; no scheduling/caching rewrite.
- The nearest-conversion row cursor passes exact differential/auxiliary checks and
  40 exact native outputs, but fails the native target gate. Paired first+repeat
  export CPU savings are 12.117 ms/8.27% at 1024 (only 3/5 faster) and
  21.782 ms/7.11% at 2048 (5/5). Neither meets 10% AND 10 ms with 4/5 faster.
  Favorable independent-median ratios do not override the fixed paired gate.
  Rejected with no production quantizer edit; native adverse expansion was not run
  after target failure and is not claimed passed. Both Node rounds, including
  initial entropy/Keep adverse results, remain visible.

Cold native 2048 Stencil/Icon still show approximately 128/413 ms tasks; 1024
approximately 73/231 ms. They remain the leading practical CPU opportunities.
Earlier independently rejected flood rewrites were not revived to produce a
quota. The whole-app memory envelope still includes original frames, analysis,
Cleanup maps, temporary overlapping exports and browser resources; the 8 MiB
animation-index budget is not a whole-app bound.

Worker transfer/resource diagnostics separate RPC wall time from CPU. A completed
summary request transfers 444 bytes in the measured low-color case, while Cleanup
streams the 16,777,216-byte source. Seven created workers close on document teardown;
the healthy import worker is intentionally reusable. Main renderer profiles do not
include worker CPU. Android all-browser PSS includes unrelated tabs and is not an
isolated app heap or peak allocation measurement.

Not measured: browser process-cold startup, iOS/Safari/macOS, physical pinch or
manual handset rotation, cross-app native drag/drop and clipboard pixel readback,
worker/GPU CPU profiles, exhaustive large-photo/batch peak-memory bounds. These
remain limitations, not passing gates. Cleanup preserves the shared native browser,
unrelated tabs, existing ADB mappings and settings; exact owned resources are listed
in restoration receipts. Native cleanup leaves zero owned tabs, default download
behavior and original rotation settings, removes forward 9345 and thirteen owned
reverse mappings, and preserves existing 9333/9334 and 5352/5354 mappings. All
commits remain local; no push or deployment.

The [final independent review](../../bench/codex-independent-performance-2026-10-18/review/final-verdict.md)
approves the narrow memory correction and qualified evaluation for frozen runtime
`ae97d0e`, with no blocking finding in that reviewed scope. It independently checks
paired arithmetic, all 42 final asset hashes, retained output witnesses, source
provenance, test/build logs and cleanup. It retains the CPU uncertainties and
unrun branches above and does not endorse later external GIF/import work.
