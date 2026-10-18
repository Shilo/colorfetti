# Handoff: whole-app performance audit — performance only

## Session Metadata

- Created: October 17, 2026, America/Los_Angeles.
- Workspace: C:/Programming_Files/Shilocity/colorfetti; Windows/PowerShell.
- Branch at preparation: main. This handoff is a new, open task.
- Research/evidence checkout before the handoff-only commit: decf499efbcda66301c4589fc4178c0642a113e7.
- Runtime baseline: 34a95d97f65ec681d07b52ace85dc84e6c8ce56c (sources unchanged by the rejected feature study).
- The research-only commit above and a handoff-only commit follow that runtime
  revision; neither changes production sources. Record the actual HEAD
  and tree status on startup; do not assume later unrelated changes are included.
- Scope: investigate and improve performance while preserving all functionality.

## Handoff Chain

Fresh whole-app audit. Earlier palette/caption/Preview reports supply historical
context, not proof this new audit is done. No closed Keep-weighting handoff is
continued or reopened. The immediately preceding narrow pattern-count no-ship decision is
recorded in docs/research/2026-10-17-large-pattern-counts.md and
docs/research/2026-10-17-large-pattern-acceptance.md. The existing implementation
continues to withhold large unproven pattern counts until exact rendering.

## Current State Summary

**NEW, OPEN whole-app performance audit.** No profiling or runtime optimization
has been completed for this new audit. Previous caption, palette and Preview
reviews are historical evidence, not completion of this request. Their closed
two-round ledgers do not excuse skipping the fresh baseline and real application
traces required here. Never reopen the closed Keep-weighting study through a
historical handoff chain; Keep's current behavior is a preservation constraint.

## Important Context

The preceding large 1-bit pattern-count investigation is closed with NO SHIP.
Its accurate histogram candidate added repeatable native Checker CPU during
settings edits, so runtime sources remain identical to the revision above. Its
archived candidate is research, not a shipped feature to preserve or enable.
The user has requested this handoff for a separate session; do not create a new
user-owned chat automatically, and do not push or deploy.

Desktop and native functional exploration can run concurrently under separate
exclusive controllers. Comparative benchmarks still require isolated timed
windows, alternating matched A/B builds and attention to host CPU/device thermal
load. “In parallel” is not permission to contaminate measurements. Every unrun
coverage item is pending or blocked, never implicitly done.

## Immediate Next Steps

1. Verify the final baseline and working-tree ownership, read current contracts
   and the preceding task's final decision, then create a fresh audit checklist.
2. Reserve actual Codex Browser and USB Android independently; freeze licensed
   practical fixtures and matched production builds.
3. Run baseline traces across the workflow matrix below before proposing fixes.
   Rank reproduced bottlenecks, assign narrow file ownership and only then edit.

## Request and completion criteria

Improve practical speed and responsiveness throughout Colorfetti, on actual
Codex Browser and the connected USB Pixel 8 Pro, while retaining every existing
functionality and output rule. Use multiple subagents for independent profiling,
implementation and adversarial review. Measure before and after each candidate;
ship only demonstrated improvements without meaningful correctness, latency,
responsiveness, memory or lifecycle regressions in relevant supported workflows.

An audit that discovers no safe improvement is successful if the evidence is
complete and its remaining concerns are honestly documented. There is no quota of
optimizations. “Every technique” means consider appropriate techniques; do not add
workers, caches, pooling, batching or throttling simply to use more techniques.
Do not promise universal absence of bugs or constant frame time from finite tests.

The runtime baseline above retains the existing bounded count implementation;
the proposed histogram extension was rejected and is not part of it. Reverify the actual checkout before profiling. Do not silently
compare against an old feature baseline or discard its behavior to gain speed.

## Read first and establish the checkout

Workspace: `C:/Programming_Files/Shilocity/colorfetti` (Windows, PowerShell).
Repository: `https://github.com/Shilo/colorfetti`.

1. Read `AGENTS.md`, `CLAUDE.md`, the relevant current sections of
   `docs/superpowers/specs/2026-10-06-colorfetti-app-design.md`, and
   `docs/performance.md`. Their current contracts outweigh older spike narratives.
2. Inspect `git status --short`, `git rev-parse HEAD`, recent log and other active
   agents/tasks. Preserve unrelated edits; establish exact file ownership before
   workers edit anything. Reuse a suitable current checkout. Do not hard-reset,
   stash someone else's changes, update dependencies or perform broad formatting.
3. Read the research index below, especially its rejected candidates and harness
   corrections. A dated benchmark result is historical evidence, not proof about
   the new HEAD. Verify paths, server options and selectors before reusing scripts.
4. Freeze the starting source and installed dependency set for matched A/B builds.
   Record complete revisions, lockfile hashes, build artifacts, browser versions,
   viewport/DPR/input mode and device conditions. Record source hashes if the
   initial tree is not clean. Avoid a mutable `dist/` shared by active tests.

Normal commands are `npm test` and `npm run build`. Focused tests use
`npx vitest run <owned-tests>`. Windows restricted-temp renames have blocked
Vitest/browser startup before tests run; report setup failures separately and use
an approved host run where necessary. Keep Chromium's sandbox enabled.

Every push to `main` deploys GitHub Pages. **Commit exact owned paths in separate
commits; do not push or deploy.** A new branch, if needed, uses `codex/`.

## Hard scope boundaries

- Preserve algorithms, arithmetic/tie order, actual palette tables/order/IDs,
  selected colors, alpha, mask geometry, output resolution and source coordinates.
  Do not accept a “faster” approximate matcher or changed aesthetic as optimization.
- Preserve all settings, defaults, reset/persistence semantics, UI wording/layout,
  keyboard/touch/pointer interactions, cancellation/retry behavior and accessibility.
  Do not make controls less responsive by silently delaying committed state.
- Preserve full-resolution exports, exact RGBA rules, GIF timing/loop and complete
  ZIP failure atomicity. Do not replace native encoders with canvas encoding.
- Do not lower preview quality, skip visible frames, alter animation policy, hide
  metadata, remove effects or disable functionality to improve a benchmark.
- Do not revive deferred Auto fitting, Auto Max colors, Keep alpha weighting,
  artist-controlled color protection, slider-efficiency marker or palette additions.
  PixelLab feature/visual parity research is not part of this performance-only task.
  Do not ship the rejected large-pattern-count feature as an optimization; this
  new audit preserves the current bounded count behavior.
- No browser security, sandbox, privacy, forced-dark or battery/thermal preference
  changes. No unapproved dependency/architecture rewrite. No Mac/iOS/Safari claim
  when those surfaces are unavailable.
- A hundred simultaneously imported images are diagnostic stress only, not a
  product goal or release blocker. Do not optimize that case at the expense of
  ordinary use or invent an image-count limit.

If a defect requires a behavior-changing fix, document and isolate it for the
owner rather than quietly expanding this audit. A reproducible memory leak,
unbounded obsolete work or duplicate calculation can be fixed within this scope
only while preserving the observable contract and independently testing it.

## Team orchestration and resource ownership

Use the concurrency slots available, in waves if needed. The coordinator must
continue actual review/testing; do not merely collect agent verdicts.

| Responsibility | Owned work | Boundaries |
|---|---|---|
| Coordinator | Baseline/checklist, actual Codex Browser testing, integration, final contracts and commits | Sole owner of App/Tile integration until explicit handoff; prevents overlapping changes and browser/device actions |
| Desktop profiler | Isolated sandboxed desktop builds, traces, cold/warm workload timings; first source-level candidate proposal | Own benchmark directory initially; no Codex tabs or Android without reservation; no production edits until approved file scope |
| Android profiler | Actual authorized USB Pixel 8 Pro, native browser workload/output checks and phone-specific bottlenecks | Sole device/CDP/download owner during reservation; can operate in parallel with desktop testing |
| Independent challenger | Audit measurement validity, outputs, cancellation and memory; challenge candidate before and after | Initially read-only production; must reproduce disputed findings, not infer a leak or win from summaries |

With four slots including the coordinator, run three workers. Rotate the fresh
integration-review role after profiling or have a completed worker release its
slot. Separate candidates may be implemented concurrently only with disjoint
modules and explicit owners. App.svelte/Tile.svelte/Dock.svelte and worker-client
cross-cutting changes must be serialized. Tell each worker they are not alone in
the checkout and must preserve others' edits.

Reserve both scarce surfaces explicitly. Root owns actual Codex Browser while the
device owner uses Android; other agents may use their own isolated sandboxed Edge
processes. If another task owns the phone, do not attach, navigate, rotate or alter
its CDP forwarding until release. Parallel desktop/native testing is encouraged;
two agents manipulating one phone or one test tab is not parallel validation.

Bound disagreement: each candidate receives at most two focused review/correction
rounds. Round one must produce reproducible findings and concrete acceptance
criteria. Round two reruns the corrected candidate and resolves each finding.
If evidence remains inconsistent or reviewers cannot establish safety, reject or
defer that candidate and record why. Do not keep optimizing narrower benchmark
subsets until a rejected idea appears to win. Unanimity must rest on recorded
evidence, not pressure to declare the app perfect. After the feature commits,
assign one fresh reviewer the entire cumulative diff and test evidence.

## Practical workload cohort

Freeze a manifest before candidate measurement. Reuse licensed retained fixtures
where appropriate, preserve licenses/hashes and record any generated transformations.
The same decoded inputs must be used for before/after on the same device.

| Cohort | Required cases and purpose |
|---|---|
| Empty/demo and tiny sources | Both themes; 16–32px sprites, fully transparent image, one/two-color silhouette; exposes fixed UI/metadata overhead |
| Realistic batches | 1, 2, 4 and 8 distinct sprites; eight sprites plus the genuine six-frame effect GIF; tests queue fairness/publication/layout |
| Individual sprite sheets | Licensed low-color transparent-gutter 1024×1024 and 2048×2048 sheets, plus one denser reasonable sheet if profiling calls for it; sampled wall versus exact export |
| Animations | Genuine small effect GIF; 128×128/32-frame and 256×256/48-frame motion assemblies; unequal source frame durations and loop metadata; visible/offscreen behavior |
| Expensive color input | One bounded high-entropy source and one partial-alpha glow/shadow fixture; exercise summary overflow, dithering and Keep without presenting photographs as normal pixel-art use |
| Conditional stress | 4096/4097 unique RGB boundary, large palette up to 256 colors, over-budget clip, worker fallback, rapid cancellation; investigate risk rather than optimize artificial failures |

The existing motion assemblies are not artist-authored character walk cycles.
The six-frame effect was transformed to binary-alpha GIF with assigned timing.
Keep these qualifications; validate against decoded fixture bytes, not an
imaginary unmodified upstream image.

## Coverage matrix: measure the whole app, fix only demonstrated costs

Build a finite, ranked matrix before the audit. Do not take a Cartesian product
of every control on every asset; cover all paths and expand around actual hot spots.

1. **Startup / demo / loading:** first visit, repeat visit, restored settings,
   both themes, empty demo, import/remove/return-to-demo, startup/lazy module sizes,
   first usable control and first current paint. Keep welcome/help behavior intact.
2. **Import:** file picker, actual file drop and paste routes where available;
   PNG, genuine GIF and single-frame GIF; batch atomic publication, native decode,
   worker/cooperative fallback, serial queue, cancellation/removal/source changes.
   Stage test-file serialization before timing and distinguish decoder, analysis,
   worker transfer, publication and layout time. Do not count Playwright base64/File
   construction as application import work.
3. **Palette conversion:** Auto shared-wall generation, fixed/saved palettes,
   Oklab/RGB, All versus 2/4/8/16 caps, exact-match/repeated-color/high-entropy paths,
   Cleanup Off/On, 2×2/4×4/8×8 dither at zero/nonzero/full strength, Cut/Keep,
   alpha boundary eligibility and rapid committed setting replacement.
4. **1-bit conversion:** all eleven styles at least for correctness; profile simple,
   structural and diffusion/pattern representatives, cold/warm preparations,
   Brightness/Opacity reanalysis and drag drafts. Include None/equal/opaque inks,
   transparent sources, multi-frame union and the final large-pattern-count policy.
5. **Wall and metadata:** responsive layout/resize, ordinary scrolling, count
   readiness/flicker, repeated settings, source removal/reimport, shared generated
   request, count queue saturation/cancellation and repeated cached Original.
   Caption changes must not restart conversion; stale/partial evidence must not
   become an exact count. Test the demo with the same identity guards.
6. **Preview:** open/close/return, Fit, repeated zoom steps, zoom back exactly to
   Fit, trackpad/wheel/buttons, pinch/pan, local hold/Space/Compare and navigation;
   sample refinement, canceled pending refinement, hidden-wall pause and idle.
   Pan-only events must not cause mask conversion or rearm refinement unnecessarily.
7. **Animation:** visible fresh frame progress after warmup, source versus converted
   playback, offscreen pause and return, Preview takeover, under/over the 8 MiB
   sampled-index budget, cache release and memory through repeated mounts.
8. **Export:** native Save PNG/GIF, Copy first-frame PNG, Save all ZIP and prepared
   drag-out. Test gesture snapshots during settings/source changes, hover leave,
   independent export subscribers, cancellation, native error handling, partial-alpha
   GIF refusal and atomic ZIP failure. Separate conversion/encoding/download-manager
   time; never weaken the output contract to hide encoding cost.
9. **Palette editor / interaction:** open/close, image/file/paste/Lospec/manual
   paths, full 256-color paging, saved library/HEX backup/edit/delete, theme swatches,
   dialogs/selection gestures, internal versus external drag/drop, settings panels,
   tooltips/keyboard/pointer cancellation and Reset/persistence. Avoid unnecessary
   live external service calls in performance loops; use stable owned network fixtures
   and one normal integration check where necessary.
10. **Idle / teardown / memory:** settled still wall; Preview open/closed; settings,
    palette editor and dialogs open/closed; animation visible/offscreen; repeated
    import/settings/export/remove cycles; outstanding workers/listeners/timers/object
    URLs/subscribers/controllers/queues and detached source retention. Distinguish
    intentional live caches from leaked dead sources.

## Matched measurement protocol

Create isolated immutable before/after production builds with identical installed
dependencies, instrumentation and server configuration. Never rebuild underneath
an active tab: old lazy-chunk requests otherwise become false app failures. Assign
different ports, record build hashes and reload a fresh owned tab per variant.
Do not trust stale Vite CSS after checkout. Profile development builds only to
locate a hypothesis, then validate release builds.

Use at least five warmed alternating A/B pairs for material kernels/workflows where
practical, plus repeated fresh-context/cold-source observations. Alternate AB/BA or
use a recorded randomized order. Cold-source wrappers are not a cold browser/JIT;
label source-cold, module-cold, process-cold and warmed trials separately. Include
both low-color fast paths and worst supported palette/entropy/animation cases for
the affected code. Report all trials, medians, variation and adverse cases; do not
discard outliers without a recorded environmental cause.

Record phone charging state, thermal/power status if available without unrelated
private diagnostics, viewport/DPR, foreground state and browser version. Avoid
comparing different phone and desktop fixture sizes as a speed ranking. Repeat
ambiguous results with the device rested, rather than attributing thermal noise to
the code. Automated desktop work may run beside native tests; isolate CPU-intensive
compilation and device transport from the operation being timed.

Metrics must answer a concrete user-visible question:

- input/commit to first paint and to **current final** conversion/count readiness;
- elapsed completion, renderer TaskDuration, ScriptDuration, style/layout/paint and
  worker duration/transfer cost where measurable;
- Long Task durations/count, maximum and p95 rAF gaps, event/input delay and frame
  progress; rAF sampling only during the stated window;
- cache hit/miss, conversion count, worker job/transfer count, queue delay and obsolete
  canceled work; use test-only counters with an uninstrumented sanity pass;
- JS heap/ArrayBuffer retention, known backing-store sizes, post-teardown identities
  and targeted heap retaining paths where needed. Browser/native/GPU allocations
  and all-Brave process PSS are different measurements and not an app heap bound.

TaskDuration includes posted-task work more faithfully than ScriptDuration in
earlier MessageChannel-heavy cases; neither includes all worker CPU. Aggregate
CPU across task slices is not one long blocked task. Zero tasks >50 ms does not
mean zero dropped frames. A cooperative 8 ms target does not bound JIT, a single
synchronous mask, compression, allocation, GC or scheduler overshoot.

Instrumentation must be idempotent per document, removable and outside production
bundles. An instrumented rAF loop cannot prove the app schedules idle rAFs.
Wrappers that retain detached nodes can manufacture their own “leak.” Inspect
retaining paths and repeat without those wrappers before changing production.

Readiness must check the imported filenames/source identities, actual displayed
dimensions, final committed settings and fresh expected paint/publication. A demo
must not satisfy a one-image readiness query. A prior RGB paint must not satisfy
the later dither phase. A healthy unchanged cache hit need not repaint; distinguish
that result from a test that demands new conversion. GIF progress must be counted
in a fresh observation window, after scrolling the actual clip into view; previous
cumulative paints and offscreen pause are not proof of playback failure.

## Accuracy and functionality gates

Before candidate work, retain native outputs from the exact baseline and compute
independent manifests. After each candidate, require the same input/settings to
produce the same visible RGB, every alpha byte, dimensions, GIF frame count/delay/
loop, whole-clip palette membership and caption count. Ignore arbitrary hidden
RGB only where alpha is zero, and state that exception. Validate PNG/GIF/ZIP with
Sharp or another independent decoder, including every ZIP entry. For bit-preserving
encoder changes, require native encoded-byte equality where meaningful; decoded
equality alone must not hide lost timing/format metadata.

Use the retained independent scalar nearest matcher for nearest-color checks.
For cap/Cleanup/dither integration, the frozen source modules outside the browser
are useful references but are **not independent algorithm oracles**. Also apply
independent alpha/membership/coordinate/timing checks and targeted differential
tests. A benchmark importing the candidate core to define “expected” proves little.
Reproduce output mismatches before changing the algorithm.

Native Brave can perturb canvas readback RGB by ±1. **Do not use canvas screenshots,
getImageData hashes or browser re-encoding as the exact native output oracle.**
Pull the uniquely named real native download and decode it independently. Canvas
paint counters remain useful for readiness and progress, without asserting pixel
truth. Pixel transport and native clipboard transport are separate: Copy can round
translucent RGB outside the app even when Save is exact. Do not “fix” that by
changing source colors or replacing the shared PNG preparation.

Run focused tests for changed contracts plus existing neighboring suites. After
accepted fixes run the complete `npm test`, production build and relevant built-app
regressions. `bench/palette-qa.mjs` uses `BASE_REF`; set it to the actual audit
baseline when comparing old/new instead of accidentally comparing HEAD with itself.
Add tests for a concrete bug, invalidation or lifecycle risk, not implementation
mirrors or timer microbenchmarks masquerading as correctness tests.

## Browser and Android operating rules

For actual Codex Browser, discover the enabled browser runtime/tool and read its
documentation. Do not inspect runtime source, invent undocumented methods or treat
an ordinary headless Edge run as Codex Browser testing. Own a distinct test tab;
preserve user tabs/work. Read-only DOM inspection is fine; exercise real app inputs
for end-to-end actions instead of mutating app state through evaluate. Follow the
runtime's upload/download and screenshot APIs. Save app-scoped screenshots and
clear accepted receipts identifying actual Codex versus auxiliary Edge tests.

Android defaults from earlier sessions (verify; do not assume):

- ADB: `C:/Users/shilo/AppData/Local/Android/Sdk/platform-tools/adb.exe`.
- Pixel 8 Pro serial: `37211FDJG00267`; native Brave was version 155 and CSS
  portrait viewport 448×819 at DPR 2.25.
- ADB must report `device`, not unauthorized/offline, and the phone must be
  unlocked. Never bypass the lock. If unavailable, continue desktop and record
  native acceptance as blocked; do not substitute emulation or fabricate coverage.
- Discover the **active Brave process-specific** DevTools socket by matching
  `pidof com.brave.browser` with `/proc/net/unix`. A generic old
  `chrome_devtools_remote` forward can attach to the wrong/stale process. Use a
  reserved localhost forward, verify target URL and own only a test tab.
- CDP attachment can change download behavior to a host path Android cannot use.
  Restore the native default download behavior before native Save, capture previous
  test overrides where available and leave the session restored afterward.
- Name each source/output with an exact unique audit prefix. Pull only the exact
  known test download pathname. Do not list personal Downloads, inspect unrelated
  tabs, take broad screen/private diagnostics or remove wildcard-matched files.
  Retain a manifest of created files and remove only those exact owned files.
- Keep test-origin storage isolated or capture/restore only the test origin's
  keys. Do not clear browsing data, alter personal preferences, install software
  or change global appearance/security/forced-dark flags.
- Never call `browser.close()` on a shared native Android browser attachment.
  Close only owned pages, remove owned forwards/listeners/temporary settings and
  detach the driver. Preserve the user's browser and other tasks' pages.
- Test portrait and physically rotated landscape if the phone is available for
  it; record real screen orientation and viewport. Emulated landscape is useful
  additional coverage, not evidence of a physical rotation. Restore any explicitly
  changed rotation state; prefer not changing system policy at all.

The device had browser auto-dark enabled during earlier tests. Dedicated tiny
paint-only canvases protect critical swatch RGB without affecting file output.
Do not remove those canvases for a nominal DOM/CSS simplification or claim the
entire Light theme is guaranteed against browser overrides.

## Architecture Overview — deliberate fast paths

- Import uses lazy native decoding followed by serial worker analysis, with a
  tiny still cooperative route. Original RGBA stays immutable. Fallback re-decodes
  immutable Files; cancellation must not trigger fallback or stale publication.
- Palette All, Cleanup Off and dither Off/zero bypass their optional expensive
  stages. Auto generation is shared over the captured wall, not per tile/frame;
  matching, caps, display and Original must not regenerate it.
- Limit/Cleanup/generated clients share serial jobs with subscriber-specific
  cancellation, acknowledged 128 KiB transfers and cooperative fallback. A canceled
  preview must not cancel an independent captured export subscriber. Last-subscriber
  cancellation must retire unstarted and running obsolete work appropriately.
- Palette animations reserve sampled indexes/used buffers within a shared 8 MiB
  budget; this excludes source/analysis/canvas/encoder/Cleanup memory. Do not replace
  streaming with an unbounded whole-clip RGBA cache or mislabel that budget as total.
- Original skips conversion; returning to an unchanged still reuses its completed
  record. Preview pauses hidden wall playback. Pan changes presentation, not source
  sampling; refinement is debounced only for changed zoom targets and budgets
  4,194,304 pixels across a clip or existing Fit raster, whichever is larger.
- Counts retain tiny exact metadata and preserve pending text. Nearest uses weak
  per-frame RGB/max-alpha summaries capped at 4096 colors; high entropy bypasses.
  Original has a separately cached scalar union with a transient 2 MiB bitset when
  needed. Cold summary scans serialize; spatial counts use real export conversion.
  Closing Preview must not cancel wall requests. Exact count metadata must not
  mutate a pending record identity that an explicit Reuse subscriber awaits.
- A full prepared-palette saturation is a proof for converted count early exit;
  Original cannot stop at selected palette size. GIF captions describe the whole
  clip, not the currently displayed frame. Large 1-bit pattern counts still need
  exact rendering evidence; resized pattern masks do not prove membership. The
  histogram proof extension is archived and rejected due native CPU cost. Do not
  enable it or remove accurate unknown states as a performance-only change.
- 1-bit live reanalysis captures immutable sources and publishes the captured wall
  atomically; unchanged matching analysis retains identity. Draft sliders defer
  new heavy work and discard detached/stale native events. Existing structural
  preparation and permitted masks can remain synchronous; yielding once before
  a long function does not make that function cooperative.
- Export scheduling yields between files/frames but retains captured sources and
  settings. Full palette GIF uses preflight plus sequential encoding/backpressure.
  Whole-clip pre-baking to save CPU would increase memory and requires a separate
  case; preserve export gates, retries, failure ownership and ZIP atomicity.

## Candidate decision record and review requirements

For each proposed fix, create a small record containing:

1. Reproduction, real affected workflow, owner/files and baseline trace/source
   attribution. Distinguish repeated work, hot arithmetic, blocking, queue delay,
   layout thrash, allocations and instrumentation artifact.
2. Narrow hypothesis; expected unchanged behavior; cost of extra metadata/cache/
   synchronization; affected settings, dimensions, cancellation and lifecycle keys.
3. Baseline correctness outputs and the exact matched test sequence.
4. Candidate A/B results on desktop and native phone, cold/warm and adverse cases,
   including all raw receipts and a final uninstrumented integration check.
5. Independent challenge, coordinator response/reproduction and round-two result.
6. Accept/reject/defer with rationale. For accepted work, exact separate commit,
   focused/full test status, native output manifests and cleanup confirmation.

Set acceptance criteria before looking at candidate medians. A repeatable material
gain in the target workload, with no meaningful loss on common fast paths or the
affected worst cases, is required. Faster total throughput does not excuse a new
input stall, higher unbounded memory, slower cancellation, reduced fidelity or
changed controls. Tiny noisy differences are not a win. A large cache needs a
global/lifetime bound and release evidence; a worker needs transfer/startup/fallback
costs; a lower-level loop change needs equivalent numeric/tie semantics.

Do not claim zero overhead. Explain bounded additional work and why its measured
tradeoff passes the gate. If the candidate helps only a subset but harms another
supported common path, reject or narrow it only where a clear structural safe
predicate was proposed independently of cherry-picked results.

## Evidence and reproduction index

Prior documents to read, with the limitations above kept intact:

- `docs/research/2026-10-17-caption-acceptance.md`,
  `2026-10-17-caption-integrated-review.md`, `2026-10-17-count-speed.md`,
  `2026-10-17-onebit-caption-counts.md`, `2026-10-17-original-caption-counts.md`:
  current count scheduling, caches, exactness, previous bounded-mask correction.
- `docs/research/2026-10-16-performance-priorities.md`: corrected CPU methodology,
  representative dither costs, rejected arithmetic cache with a 256-color loss.
- `docs/research/2026-10-16-practical-workloads.md`: accepted practical cohort,
  transport/readiness/progress instrumentation corrections, native decoded outputs.
- `docs/research/2026-10-16-preview-navigation-performance.md` and
  `2026-10-16-preview-navigation.md`: proven pan/idle deduplication, listener/timer
  cleanup and refinement limits; do not manufacture a new animation loop.
- `docs/research/2026-10-16-android-theme-diagnosis.md`: forced-dark/readback limits.
- `docs/research/2026-10-13-performance-stability-fixes.md`,
  `2026-10-13-live-onebit-reanalysis.md`,
  `2026-10-13-onebit-export-and-palette-recovery.md`: worker/cancellation/export
  contracts and cold synchronous work that yielding does not eliminate.

Useful retained harnesses/receipts (inspect assumptions before rerunning):

- `bench/practical-workloads-2026-10-16/{README.md,manifest.json,fixtures.mjs,desktop.mjs,workflows.mjs,verify-native.mjs}`.
- `bench/android-theme-practical-2026-10-16/workloads.mjs` and its per-case final
  receipts; older aggregate Android receipts were superseded for timing.
- `bench/desktop-performance-review-2026-10-16/desktop.mjs`, `desktop-results-v3.json`,
  `dither-candidate.mjs`, `dither-final-checks-256.json`: candidate explicitly rejected.
- `bench/android-performance-review-2026-10-16/{workflows.mjs,workflow-v3-results.json,large-save.mjs}`.
- `bench/caption-acceptance-2026-10-17/`,
  `bench/caption-integrated-review-2026-10-17/check.mjs`,
  `bench/count-speed-2026-10-17/benchmark.mjs`,
  `bench/onebit-caption-counts-2026-10-17/check.mjs`.
- `bench/viewer-performance-build.mjs`, `bench/viewer-performance-server.mjs`,
  `bench/viewer-performance-review/` (test-only instrumentation has its own costs).
- `bench/bench.mjs`, `bench/equiv.mjs`, `bench/palette-qa.mjs`; preserve a frozen
  pre-change recolor reference for exact mask equivalence before editing hot loops.
- `bench/claude-audit-2026-10-15/device/audit-lib.mjs` contains useful independent
  decode/scalar helpers. Do not assume old absolute paths/browser socket IDs work.

## Required final deliverables

- Versioned updated audit checklist, frozen workload/build manifest, before/after
  raw receipts, traces/summaries and reproducible commands under a newly dated
  `bench/` directory. Avoid committing huge disposable profiles/downloads when a
  small manifest plus a useful retained trace establishes the finding.
- Separate commits per demonstrated production fix; separate benchmark/docs-only
  commits for rejected investigations. Stage exact paths and preserve unrelated work.
- Current source contracts updated only where a lifecycle/cache implementation
  changes them; no user-visible feature/spec change hidden in performance docs.
- Fresh combined reviewer report resolving all concrete findings within the
  bounded rounds, plus coordinator challenge and focused/full retest receipts.
- Actual Codex Browser and actual USB Android evidence, correctly labeled versus
  headless auxiliary/emulated checks. Include app-scoped before/after screenshots
  where they verify preserved layout/interaction; screenshots are not pixel oracles.
- Concise user-facing report: what got faster, approximate measured magnitude and
  affected workload, what stayed the same, rejected changes, known costs/limits,
  untested hardware, exact local commits and confirmation nothing was pushed.

If native authorization or availability blocks testing, clearly state the unmet
gate and finish all independent work. Do not label a desktop-only candidate fully
accepted for mobile. Avoid ending with speculative extra features or another
unbounded review cycle: deliver the measured decisions and remaining concrete risks.


## Critical Files

| File | Responsibility to preserve |
|---|---|
| src/App.svelte | Source/analysis/settings identity, shared queues, imports, exports, publication and failure ownership |
| src/Tile.svelte | Sampled conversion, one completed preview, masks/Original, animation readiness, metadata and gestures |
| src/Dock.svelte | Commit timing, draft cancellation, responsive settings and stored controls |
| src/ImageViewer.svelte | Preview fit/zoom/pan integration, hidden wall and comparison |
| src/lib/recolor.js | Exact legacy analysis/mask arithmetic, shared tone lookup and histogram proofs |
| src/lib/onebit-usage.js | Bounded exact counts, conservative unknown states and cancellation |
| src/lib/quantize.js | Exact membership/ties/alpha, cooperative Palette conversion |
| src/lib/palette-state.js | Captured export settings, lazy shared conversion preparation |
| src/lib/image-import-client.js | Worker/cooperative decoding/analysis, transfer ownership and fallback |
| src/lib/palette-limit-client.js | Shared subset jobs, queue/cache/subscriber cancellation |
| src/lib/palette-cleanup-client.js | Shared spatial preparation and cancellation |
| src/lib/palette-animation-cache.js | Sampled clip budget and lifecycle |
| src/lib/save.js | Native PNG/GIF/ZIP bytes, snapshots and atomicity |
| docs/performance.md | Current measured contracts, rejected candidates and limits |

## Files Modified

For this new whole-app audit: none of the runtime has been audited or optimized
yet. This handoff is the deliverable that starts that work. The preceding narrow pattern-count candidate was not shipped. Its research and
acceptance reports explain the rejection and preserve a replayable patch. No
production source was changed by that study. List future modified paths and exact candidate
commits in a new audit ledger; never present old commits as new audit fixes.

## Decisions Made

| Decision | Rationale |
|---|---|
| Fresh baseline and workflow matrix | Old closed reviews cover narrower scopes and cannot establish current whole-app performance |
| Exact functionality/output preservation | This is a performance audit, not permission to alter algorithms, controls or product behavior |
| Exclusive controllers, parallel independent surfaces | Desktop and USB testing can run concurrently without two agents manipulating the same device |
| Matched isolated comparative measurements | Host load, thermal state, cold engines and transport can fabricate speed differences |
| At most two review/correction rounds per candidate | Require concrete reproduced findings, reject unsafe ideas and avoid endless agreement-seeking |
| Separate commits and no push | Keep reviewable changes; main pushes deploy the site |

## Assumptions Made

- Dependencies and hardware may change between sessions: verify actual versions,
  device authorization and active browser socket before relying on saved paths.
- The connected Pixel 8 Pro remains the intended Android surface. An unavailable
  or locked phone is a coverage dependency, not permission to substitute emulation.
- Current functionality, spec and arithmetic are the acceptance reference. A
  newly discovered correctness defect that requires changed behavior is isolated
  for a separate decision rather than folded into a speed-only patch.
- There is no target to optimize 100 simultaneous images, no promise of universal
  optimality and no minimum quota of changes. Rejected safe-to-defer candidates
  are valid outcomes with retained evidence.

## Potential Gotchas

- The live demo also lives under .grid. Require exact imported names and identities
  so its ready count or canvas cannot satisfy a one-image assertion.
- A rebuilt mutable dist can leave stale lazy chunks in old tabs. Use immutable
  variant builds and fresh owned tabs rather than treating that setup artifact as
  an application bug.
- A phone's high DPR can make a 769px fixture render exactly while a desktop samples
  it. Record actual canvas dimensions; a correct existing exact count is not an
  invalid histogram guess.
- Uniquely name each different test source, not just each run or style. Otherwise
  Android duplicate filenames can cause a later pull to read an earlier output.
- Shape with the first selection None intentionally maps visible pixels to the
  remaining ink. Its caption can correctly report one; do not "fix" that contract.
- Warm count kernels are not total UI costs. First publication, module/JIT work,
  layout and GC need integrated input/paint observations with matched windows.
- The prior narrow count test saw noisy fresh-page aggregate CPU changes; focused
  warm input/paint checks and output equality are required before accepting any
  future candidate, not just citing a very fast helper timing.

## Environment State

- No external service or credential is necessary for the performance audit.
- Python tooling for handoff validation is available at
  C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe.
- Native browser must retain sandbox/security settings. Auxiliary Edge launch
  uses chromiumSandbox: true; no --no-sandbox flag is permitted.
- Prior local app preview: localhost port 5352. Frozen pre-pattern-count build:
  localhost port 5354. These are session processes and may have stopped by the time
  of handoff; verify and create newly isolated builds for this audit.
- Old ADB forward 9334 targeted the then-active Brave process; discover the current
  socket rather than assuming that PID still exists. Do not disturb another task's
  forward, page or device reservation.
- Environment-variable values must never be copied into logs or this handoff.

## First message to the new session

Read this handoff as a NEW OPEN task. Use multiple subagents to run the fresh
whole-app performance audit and measured performance-only fixes. Reserve actual
Codex Browser and the authorized USB Pixel 8 Pro separately, measure current
behavior before edits, compare exact outputs and functionality after each fix,
challenge candidates within two focused rounds, commit accepted fixes separately,
and do not push or deploy. Preserve every existing feature and output rule.
