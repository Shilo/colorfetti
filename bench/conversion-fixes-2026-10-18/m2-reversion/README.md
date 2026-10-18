# Preview inspection removal and independent review

October 18, 2026. The user rejected the newly added pause/native-inspection mode
because it complicates Preview and covers the image. M2 is withdrawn. Editor
contrast, import feedback, source/capture accounting and all export fixes remain.

## Exact removal boundary

The implementation agent restored eight existing files exactly to pre-M2 revision
`2847e55`: ImageViewer, Pixels, Tile, navigation CSS, navigation logic/tests and
animation-cache logic/tests. Three inspection-only modules/tests were deleted.
Normalized source SHA-256 values and exact comparison results are in
`validation.json`. No other `src/` file changed from `87030e8`.

The pause/inspect buttons, selected-frame field/arrows, raster-status panel,
native-frame queue, added size/headroom policy, extended native zoom and supporting
callbacks/canvas cleanup API are removed. Existing bounded zoom sampling predates
M2 and remains. The ordinary animation-cache actual-producer source lease, opaque
source identities and M1 captured-analysis ledger remain intact.

Historical M2 receipts and probes stay archived under `../m2/`; those probes need
their original `c30e01a` checkout because their helpers are deliberately removed
from current runtime source. They are not current validation commands.

## Challenge and agreement

An implementation sub-agent challenged the dependency boundary before restoring
source. A separate read-only reviewer independently verified exact pre-M2 parity,
removed API/import/string references, continuous GIF timers, source ownership after
subscriber cancellation and unchanged export/editor/import sources. Both agreed
with the coordinator on removing the complete feature rather than hiding its UI.

The reviewer challenged a receipt claim: later saved accessibility snapshots omit
short-lived Save/Copy toasts. The coordinator's immediate live browser observations
did show `Downloading gray-20frames-colorfetti.gif…` and
`gray-20frames.gif copied as a still image.` These are recorded as manual observations,
not as independently retained download-byte or clipboard-pixel proof. No encoder
changed, and no new byte-parity claim is made from those toasts. This resolved the
evidence wording concern without source changes or redundant tests.

Both agents and the coordinator accepted the final reversion. No outstanding
reversion finding remains in the tested scope.

## Verification

- Full current suite: **1,357 passed, two existing skips, 82 test files**.
- Focused existing navigation/layout/cache/source-projection/capture tests:
  **88 passed across six files**. The removed native-feature tests are not current tests.
- Production build: **207 modules**, main `index-DzbaQAs6.js`.
- The coordinator manually used the user's existing desktop browser tab at port
  5173 after rebuilding/reloading. Still and GIF Preview expose only the original
  controls. GIF movement was observed in converted and Original views. Zoom to
  1.25, pan 44px, Fit reset, Compare, Space press/release, Save, Copy, Escape,
  Close and reopening passed. No JavaScript warnings/errors were recorded.
- At a temporary 390×844 desktop viewport, all seven toolbar controls stayed
  within the viewport and the inspection panel was absent. Original browser size
  was restored; no physical phone was used. Clipboard test data was cleared after
  testing; the initial clipboard was empty.

`browser-ui-receipt.json` records DOM geometry and the loaded asset;
`browser-console.json` records the empty warning/error list. Accessibility captures
record control presence; their late Save/Copy snapshots do not retain the toasts.

Screenshots: [before removal](../screenshots/m2-preview-before-reversion.jpg),
[restored GIF Preview](../screenshots/m2-preview-after-reversion.jpg),
[restored still Preview](../screenshots/m2-still-after-reversion.jpg),
[narrow layout](../screenshots/m2-preview-reverted-narrow.jpg).
