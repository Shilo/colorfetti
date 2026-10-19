# Parent challenge of independent wall review

The requested order was followed: `70835a9` was committed and pushed to
`origin/main` before the independent adversarial review began. The reviewer owned
only `../adversarial-review/`; the parent independently reproduced and challenged
its hypotheses before editing production code.

## Accepted finding and correction

The new absolute pixel positions magnified a WebKit resize transient. Browser
resize events themselves can arrive late; the original flex wall already had
some transient workspace/control overflow. That baseline behavior does not
justify the candidate's much larger off-canvas image positions.

`resize-challenge.json` independently reproduces the candidate's old 1416px wall
scroll width at a 240px viewport. A synchronous resize handler was tried and
rejected: `resize-challenge-immediate-refit.json` still captured old positions
before WebKit delivered any resize event. Merely clipping overflow was also
rejected. Neither experiment is in the final production code.

The final correction uses native flex flow, width clamping and planned row-break
spans. It preserves ordered balanced rows, fixed artwork/caption allowances and
flat keyed Tile siblings. Cards can wrap and clamp even before JavaScript learns
the new viewport size. Source pixels, conversion, export and viewer sizing are
unchanged. The pure layout algorithm retains its tested x/y geometry; Tile no
longer consumes those coordinates for positioning.

`resize-challenge-native-flow.json` samples three independent 1440x1000 to
240x320 WebKit touch shrinks. All 24 candidate samples, starting at 16–21ms,
have zero out-of-bounds images and a 240px wall scroll width. This does not claim
that existing toolbar timing or all document-level WebKit resize behavior is
eliminated. The reviewer separately reran the final implementation.

## Findings challenged and rejected

| Hypothesis | Evidence and decision |
| --- | --- |
| GIF playback freezes after resize/Preview | The review's rolling checksum collided for three different source frames. `hash-challenge.mjs/json` independently demonstrates identical rolling values and different SHA-256 values. Browser checks with SHA-256 confirm changing frames. No playback fix warranted. |
| Hover action is covered after Save | The existing temporary Downloading toast was still visible. The corrected native test waits for its normal dismissal, then verifies the action is reachable. No source change warranted. |
| 240x160 controls cover artwork | Baseline reproduces the same controls at y=-32 and failed native interactions. This height lacks room for the existing interface; 320x240 remains in the native suite. Documented as an existing limit. |
| WebKit ResizeObserver warning | Matched baseline reproduces the same warning. Kept in raw reports, not silently counted as error-free. No unrelated observer rewrite warranted. |
| Native comparison or panel failures | Ambiguous Palette selectors, insufficient hold duration and unclosed panels were harness errors. Corrected tests use exact selectors, native input, the real hold threshold and isolated panel cleanup. |
| One-image import order changed | The main harness could accept the one-tile empty example before the one-image import finished. `waitWall` now requires the demo caption to disappear. This fixes testing, not app behavior. |

## Parent verification of the final build

Final bundle: `index-DZPr6Ww5.js`, `index-BpjnvH6m.css`.

- `../results/native-flow-full-full.json`: 162/162 Edge groups, zero page errors.
  Includes desktop/touch layouts, square and mixed/extreme collections, 36-image
  walls, portrait/landscape, panel fitting, Preview/PNG/ZIP exports, hover actions,
  keyboard focus, removal and stable Tile identity.
- `unit-native-flow.json`: all 82 files pass, 1371 tests pass, two existing skips.
  Command: `npm test -- --maxWorkers=2 --reporter=default --reporter=json
  --outputFile=bench/aspect-wall-2026-10-18/parent-verification/unit-native-flow.json`.
  An earlier run exhausted CPU alongside several browser engines and timed out
  four tests; these were timeouts, not assertion differences. The bounded-worker
  complete rerun passed without extending test timeouts.
- `../results/firefox-native-flow-confirmed-quick.json`: 13/13 groups pass,
  zero page errors. `../results/webkit-native-flow-confirmed-quick.json` also
  passes all 13 functional groups; it retains two baseline-matched desktop
  ResizeObserver notifications and therefore correctly has `pass: false` overall.
  Earlier `*-native-flow-quick.json` reports are superseded attempts affected by
  excessive concurrent load and the demo readiness race; they are retained as
  failed evidence, not presented as passing runs.
- `native-flow-browser.json`: direct Codex browser verification of the supplied
  aurora image with six other ratios at 1440x1000, 390x844, 844x390, 320x568,
  568x320 and 2560x1440. All retain single-line desktop captions, no mobile More,
  image bounds and no horizontal document overflow. Input mode stays mouse;
  separate browser suites supply actual touch emulation.
- `live-smoke.json`: deployed first commit tested in the Codex browser before the
  review correction. Final deployment is verified after the second push.
- `npm run build` and `git diff --check` pass. Rebuilding retains the same final
  JavaScript/CSS asset identities used by the browser checks.
- The independent final native Edge suite passes all 54/54 groups with zero
  page exceptions; both input contexts identify `index-DZPr6Ww5.js`. This is a
  fresh complete rerun after the production correction, not the earlier mixed-
  build run. The reviewer marked the accepted finding corrected and found no
  additional reproducible production defect.

Independent coverage and all limitations are recorded in
`../adversarial-review/REVIEW.md`. Finite browser/fixture matrices cannot prove
every possible resolution, ratio, orientation, combination or physical device.

The independent final WebKit rapid and 500ms matrices each cover 444 states.
Both have zero wall overflow, off-canvas tiles, overlaps or action-target failures.
Rapid raw flags are 11 document-only tiny-viewport toolbar timing observations
and two single-scroll observations during pending reflow. Both scroll cases
pass when settled. The settled matrix retains three document-only timing flags.
The focused controls trace proves old Palette/settings positions caused document
width 841px while the image wall was already contained at 240px; controls settled
and document width returned to 240px by the 130ms sample. These results close the
accepted image-position finding while preserving unrelated baseline limitations.
