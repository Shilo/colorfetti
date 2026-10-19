# Independent adversarial review — aspect-aware wall

Reviewed commit `70835a9` against parent `765f76f0`, then the parent's resize-event
experiment (`index-0fIVHoMV.js`) and final native-flow correction
(`index-DZPr6Ww5.js` / `index-BpjnvH6m.css`).
The reviewer changed only this evidence directory. Production edits belong to
the parent agent. This is finite automated browser coverage, not a claim that
every possible screen, browser, physical phone or image has been tested.

## Finding submitted to the parent

**P3: new absolute tile positions can remain outside the viewport during a
WebKit touch viewport shrink.** Relevant implementation: `src/aspect-wall.css`
absolute positioning and `src/App.svelte` wall dimension measurement.

**Status: accepted and corrected by native flow.** Final independent WebKit
rapid and settled matrices contain every image wall and card in all444 states;
the root's independent native-frame trials corroborate immediate containment.
The remaining baseline control/minimum-height limits are described separately.

With six portrait sources, importing at 2560×1440 and then rapidly resizing to
240×320 can retain the old horizontal tile positions. The candidate had a wall
scrollWidth of 2536px and document width of 1401px at a 240px viewport; one trace
still showed this at the 300ms sample and recovered by 500ms. Source order,
captions and source raster data were intact after refitting. This is a resize
transient, not a persistent layout failure.

I challenged this finding against the unchanged baseline. The baseline can also
temporarily retain old layout/control geometry and expand the document during
WebKit's delayed resize processing. The exact portrait baseline trace retained
scrollWidth 408px at 240×320 until the 100ms sample; at 240×160 it retained 432px
until the 300ms sample. Candidate absolute positions amplify the temporarily
overflowing image wall. It would be inaccurate to describe all native resize
delay or document overflow as newly introduced by this change.

The parent independently reproduced stale candidate tile coordinates, rejected
an overflow clipping experiment, and tested direct measurements from native
window/visualViewport resize events. I reviewed that experiment's lifecycle and
scalar-only geometry. The experiment was subsequently removed: it cannot run
before WebKit delivers the native event.

**Resize-event experiment challenge:** the rapid70ms protocol-based matrix still detects stale
coordinates in WebKit. Event instrumentation proves that some of these samples
precede delivery of the browser's native resize event entirely. In the focused
post-fix portrait trace, the 70ms and 100ms samples had scrollWidth 1416px and no
window resize event. The event arrived at performance time 1673ms; the next
sample at 1733ms had scrollWidth 240px. Bundle identity is recorded in the same
JSON. These pre-event observations do not demonstrate a failure of the new
handler after event delivery. The experiment's 70ms protocol matrix must not be
reported as wholly passing.

**Final correction under review:** normal flex flow now contains each card before
JavaScript can refit it. A decorative, aria-hidden full-width row-break element
preserves each calculated balanced row. Tiles retain the same keyed fragments and
parent; source coordinates and row membership still come from the unchanged
algorithm. Each figure reserves its calculated artwork-plus-caption height and
is bounded by the available width. This removes the stale absolute x positions
that caused the newly amplified overflow. The experimental resize listeners are
absent. I inspected the final source and found no lifecycle, reparenting or source
ownership issue. The rapid and settled final-build matrix results are recorded
below.

Evidence:

- `webkit-matrix.json`: initial 444 rapid measurements, 11 transient failures.
- `webkit-touch-timing-matrix.json`, `webkit-timing-summary.json`: explicit
  70/100/200/300/500ms candidate traces.
- `webkit-touch-baseline-portraits-matrix.json`: exact baseline challenge.
- `webkit-touch-baseline-rapid-matrix.json`: baseline mixed-image sequence.
- `webkit-touch-post-fix-timing-matrix.json`: corrected-build rapid observations.
- `webkit-touch-post-fix-events-matrix.json`: native-event attribution and asset ID.
- `webkit-touch-slow-mixed-matrix.json`: original build 37/37 at 500ms settling.
- `webkit-final-flow-rapid-matrix.json`: final native-flow rapid measurements.
- `webkit-final-flow-settled500-matrix.json`: final native-flow settled measurements.

## Other hypotheses challenged and rejected

- **GIF playback regression:** simple additive and polynomial rolling checksums
  collide on the regular animated fixture patterns. SHA-256 canvas digests show
  three distinct frames on candidate and baseline, initially, after Preview and
  after portrait/landscape resizing. Fresh corrected-build mouse/touch browser
  checks also pass animation liveness. No GIF fix is justified by the invalid
  checksum tests. See `gif-challenge.json` and the corrected interaction report.
- **Desktop hover/hold failure:** intermittent first-strip hit tests immediately
  after Save were intercepted by the ordinary temporary Downloading toast. A
  failure screenshot identifies the toast over the art. Waiting for the existing
  toast to dismiss removes the failure. The title/action CSS was not responsible.
- **240×160 caption/control occlusion:** both baseline and candidate place the
  controls' upper edge at y=-32 at this extreme height; there is insufficient
  physical space for all existing controls. Baseline also fails native image
  interactions there. It is an existing minimum-height limitation, not a newly
  introduced regression. It is deliberately excluded from any blanket visual
  pass claim. Matching evidence: `edge-focus240*-interactions.json`.
- **WebKit ResizeObserver warnings:** the same warning is observed on baseline.
  It is retained in raw results rather than counted as a new source exception.
- **Firefox browserContext.close protocol failure:** the first run completed all
  222 mouse cases before the automation context-close operation failed. A fresh
  touch-only run completed all 222 remaining cases without page exceptions.

## Coverage and results

- Independently authored production-app matrix: 37 viewport sizes per input mode
  and six collections, **444 Edge states passed** with no page exceptions.
- **444 Firefox states passed** across the completed mouse run and touch resume.
  Firefox's touch-capable viewport is not an iOS/Safari emulation.
- Widths 240–2560px, heights 160–1440px; exact threshold neighborhoods around
  320,360,390,430,520/521,568,768,800,844; portrait and landscape, mouse and touch.
- Eighteen source shapes including square,4:3,3:4,16:9,9:16,1:2,2:1,1:4,4:1,
  1:8,8:1,11.99:1,12:1,12.01:1,256:1,1:256,16384:1 and1:16384. Mixed and reversed
  order, twelve squares, pure portraits, pure strips, and eight 1024×2048 sources
  with long filenames exercise minimum card/caption widths and source admission.
- Assertions cover horizontal bounds, complete caption reachability, no overlaps,
  retained source order on resize, retained Tile instances, action hit targets, title widths,
  resolution bounds and expected desktop/touch affordances.
- Focused native suite: **54/54 groups passed** after fixing its own false
  assumptions. It checks tool occlusion with panels open, raster aspect ratio,
  native mouse holds, native Edge touch holds, Space comparison release, real
  caption Preview, zoom/Fit, PNG Save dimensions, touch action sheets, focus
  through orientation and SHA-256 animation playback. Its run straddled the
  parent's build; it is not claimed as a single-bundle final-build matrix.
- The resize-event experiment's fresh 390×844 mouse/touch suite passed6/6.
- Final native-flow390×844 mouse/touch suite: **6/6 groups passed**, both contexts
  identified as `index-DZPr6Ww5.js` in `edge-focus390-interactions.json`.
- Final native-flow full WebKit rapid matrix: **444/444 wall/card geometry states
  pass**. Raw431/444 complete groups pass:11 document-only240px flags and2 single
  scroll-to-bottom observations during a still-changing scrollHeight remain in
  the unfiltered evidence. The exact mixed650×1440 and square768×360 sequences
  both pass in the settled rerun, rejecting the inference that their captions are
  unreachable. The harness initially scrolled to an old, smaller scrollHeight.
- Final native-flow full WebKit500ms matrix: **444/444 wall/card geometry states
  pass**. Raw441/444 complete groups pass, with3 document-only240px flags. None
  is a wall overflow, off-canvas card, overlap, caption bound, More target,
  retained identity or stable-scroll reachability failure. Known baseline
  ResizeObserver warnings remain preserved in both raw reports.
- Focused final native-flow attribution independently confirms document841px
  versus wall240px. Palette/PICO-8/settings controls retain old x580–835px
  coordinates before their separate layout measurement, while every image and
  caption stays within the wall. At the130ms sample the document is240px and no
  control remains outside it. See `webkit-touch-final-flow-controls-matrix.json`.
- Final native-flow full native interaction suite: **54/54 groups passed**, no
  page exceptions. Both mouse and touch contexts identify `index-DZPr6Ww5.js`.
  It repeats all13 viewport profiles,320×240 through2560×1440, against the final
  native-flow build, including tool/panel occlusion, both-axis raster ratios,
  native holds and comparison release, keyboard Space, hover action hit tests,
  caption Preview, zoom/Fit, real PNG Save dimensions, touch sheets, orientation
  focus and SHA-256 GIF liveness. See `edge-interactions.json`; the earlier
  mixed-build report is preserved as `edge-superseded-interactions.json`.

Source inspection covered ordered-row balancing, strip boundaries, source-shape
invalidation, keyed component identity, both-axis contain/sampling, caption footer
allowances, hover targets, source-count/export ownership and the viewer's separate
sizing. No additional concrete production bug was reproduced. No production fix
was proposed for speculative concerns or invalid harness failures.

## Reproduction

Install the repository dependencies and build with `npm run build`. The scripts
use the installed sandbox-enabled Edge and bundled Playwright Firefox/WebKit
paths shown in their source. PNG files are generated in memory from deterministic
pixels; source admission limits remain in force. `interactions.mjs` also reads
the existing generated fixture manifest. Baseline comparisons require the
parent's isolated `.tmp/aspect-baseline/dist` build of `765f76f0`.

PowerShell examples:

```powershell
node bench/aspect-wall-2026-10-18/adversarial-review/review.mjs
$env:ENGINE='webkit'; $env:TOUCH_ONLY='1'; $env:TRACE='1'; $env:TAG='timing'
node bench/aspect-wall-2026-10-18/adversarial-review/review.mjs
# Use a fresh shell, or clear prior environment filters before the full run.
$env:ENGINE='webkit'; $env:SLOW='1'; $env:TAG='settled500'
node bench/aspect-wall-2026-10-18/adversarial-review/review.mjs
node bench/aspect-wall-2026-10-18/adversarial-review/interactions.mjs
node bench/aspect-wall-2026-10-18/adversarial-review/gif-challenge.mjs
```

No physical Android/iPhone device or shipping Safari was controlled. WebKit is
Playwright's Windows WebKit, not proof of every Safari behavior. Native clipboard,
all possible animation formats/content, all browser zoom/system-font settings and
arbitrary source combinations are outside these finite checks.
