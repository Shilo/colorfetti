# Conversion and UX fixes: implementation and challenge record

October 18, 2026. M1 and M3–M8 remain implemented; M2 was subsequently removed at
the user’s request to preserve the minimal Preview. Original recommendations:
[master review](2026-10-18-master-conversion-and-ux-review.md). Experimental
dither changes, local GIF tables and source mapping remain separate research.

Each task has a dedicated sub-agent, before/after desktop Codex Browser checks,
coordinator source/evidence review, challenge discussion and affected retesting
after revisions. The coordinator commits a task only after both agree on its
scope and evidence. No physical phone is used for these checks.

Baseline: commit `83ff77b`; 68 test files passed, 1,186 tests passed and two
existing tests skipped. Product source was clean before this run. Evidence lives
in `bench/conversion-fixes-2026-10-18/`; generated media is local except curated
screenshots in its `screenshots/` folder.

## Task ledger

| Task | Scope | State |
| --- | --- | --- |
| M1 | Decoded artwork admission budget | Accepted after ownership/parser revisions and final worker/fallback/browser checks |
| M2 | Sampling disclosure and native-pixel inspection | Reverted at the user’s request; original minimal Preview restored |
| M3 | Bounded per-file import diagnostics | Accepted after revisions and desktop retesting |
| M4 | ANIMEXTS GIF repeat metadata | Accepted after independent Save/ZIP verification |
| M5 | Enabled palette-editor text contrast | Accepted after revision and desktop retesting |
| M6 | Portable Save/ZIP/drag names | Accepted after actual Windows extraction and Save/ZIP/drag verification |
| M7 | Transparent GIF frame-bound cropping | Accepted after size-gate revisions and independent Save/ZIP verification |
| M8 | Exact PNG state compaction | Accepted after size/performance revisions and independent final desktop export checks |

## Current state after M2 removal

At the user's request, all newly added Preview inspection functionality and its
panel were removed, including pausing, frame selection, resolution labels, native
rendering queue and associated limits/APIs. Eight existing source/test files match
pre-M2 revision `2847e55` exactly; three inspection-only files are deleted. Existing
zoom/pan/Fit, comparison, continuous GIF playback and Save/Copy remain. M1 and
M3–M8 source fixes are unchanged.

An implementation sub-agent and a separate read-only reviewer challenged the
dependency/ownership boundary, then reviewed the coordinator's refreshed desktop
browser checks. The final reversion passes **1,357 tests in 82 files**, with two
existing skips; build passes (207 modules). Live checks covered still/GIF Preview,
playback, comparison, zoom/pan/Fit, Save/Copy, dismissal/reopening and 390×844 layout.
Both agents and the coordinator accepted the result with no outstanding finding
within this scope. Detailed review, evidence qualifications and current receipt:
`bench/conversion-fixes-2026-10-18/m2-reversion/README.md` and `validation.json`.

## Verification before M2 removal (historical)

The final product source passes **1,378 tests in 83 files**, with the same two
baseline skips; `npm run build` passes (209 modules). An additional read-only
integration audit checked leases through both PNG encoding passes, clipboard early
failure, canceled drag preparation and native close/reopen. It found no outstanding
confirmed lifetime regression. Source budgets, capture accounting and inspection
headroom remain defined logical limits, not a browser-process memory ceiling.

All eight tasks were challenged and revised where evidence required, then mutually
accepted. Focused counts below overlap and are not additive. Browser checks use
desktop Codex Chromium, including narrow viewports; no physical phone was used.
Independent Node/Sharp decoding verifies output pixels and applicable timing/repeats.
Known performance/coverage limits are documented per task; this is not a proof
against every possible browser or input. Machine-readable final receipt:
`bench/conversion-fixes-2026-10-18/final-validation.json`.

## Accepted changes and review discussions

Task-specific acceptance and evidence are recorded here as each task completes.

### M8 Exact PNG compaction

Partial Keep considers at most 256 exact used target-index/alpha states, with a
dedicated EMPTY slot and per-entry tRNS. The complete indexed candidate replaces
RGBA only when strictly smaller. A challenged 109→118-byte counterexample keeps
the original 109 bytes, and tiny outputs skip candidate lookup allocation. Binary
Palette output remains byte-identical. Raw row buffers are serialized; bounded
packing and actual compressor cancellation remain intact.

Root and independent peer rejected unconditional legacy double encoding after a
16 MP fixture grew from about 163 to 424 ms. The agreed implementation limits that
optional pass to 262,144 pixels and fuses validation with baseline packing. Above
the cap, it compresses its two-bit baseline once. Exact cap-neighbor and 513×512
cases pass. Small legacy images with at most two actual RGBA states use one bit
only if the complete tagged file is smaller; losing and tied files retain two bits.
Legacy PNG now declares sRGB, preserving stored transparent RGB conventions.
The tag adds 13 bytes to unchanged baselines; metadata consistency does not imply
that every prior PNG displayed incorrect colors.

The coordinator repeated native desktop PNG decoding, actual App Keep Save and
two-image ZIP, plus a native-picker 4 MP legacy Save before/after. Keep Save shrank
386,902→231,802 bytes (40.1%) and ZIP 774,070→463,870. Large legacy Save stayed
two-bit, 612,977→612,990 bytes. The independent Node/Sharp oracle checks all stored
RGBA, including hidden transparent RGB, and the inserted sRGB chunk. The first
large SVG test input was rejected by native import; the final paired input is an
independently authored PNG with known RGBA. No product change was made for SVG.

Affected implementation tests passed 120 cases across nine files; a separate peer
passed 114 independent RGBA/Sharp cases and 85 direct unit tests. These overlap and
must not be summed. Desktop browser interaction was operated by the coordinator
because the child's surface was unavailable; the child independently challenges
raw receipts and exported bytes. Additional compression costs CPU; large legacy
still encoding remains synchronous with measurable validation overhead. Cooperative
legacy encoding remains follow-up research, with no universal speedup claimed.
Evidence: `bench/conversion-fixes-2026-10-18/m8/README.md` and `m8/PEER-REVIEW.md`.
[Final PNG validation screenshot](../../bench/conversion-fixes-2026-10-18/screenshots/m8-png-after.jpg).

A harness navigation/reload console message about MutationObserver was investigated
with early main-world instrumentation and unchanged production assets. All App
observer calls were valid, no main-world failure was recorded, and standalone App
load/reload was clean. The console-only harness message remains unassigned; no
product fix was justified or claim made that every console surface was clean.

### M2 Sampling disclosure and native inspection (removed)

The user subsequently rejected this UI/feature. Its runtime code, native queue,
frame controls, labels and size policy have been removed. The original Preview
source is restored exactly to revision 2847e55, preserving M1 ownership fixes and
all other export/editor/import improvements. The following acceptance record and
screenshots describe the historical feature. Current removal review and validation:
`bench/conversion-fixes-2026-10-18/m2-reversion/README.md`.

The final integration pass also fixed shared-cache joins that bypassed a viewer's
producer callback: every subscriber now receives actual producer settlement,
including warm hits. Native requests retain selected originals only in Palette,
charge selected legacy analysis to the capture ledger, and publish only pixels
plus opaque identity. Ordinary Palette records carry original-only/scalar identity
snapshots. Final 5238 browser checks repeated Palette playback/frame selection,
exact two-color GIF Reuse, 4 MP Icon native/Fit and 390×844 frame controls/resume;
all passed with no console warnings/errors. Both reviewers reaccepted this revision.
Paired focused validation passed 92 tests and all eighteen output comparisons.

Preview now discloses its raster/source dimensions and offers full-source conversion
of one selected paused frame. GIF frame controls and Back to overview provide exact
inspection without caching a native clip. Whole-source palette, analysis and Cleanup
contexts remain authoritative; Save/Copy scopes remain whole-clip/first-frame.

Challenge rejected ROI approximations, corrected the cold Icon allocation estimate
to 84 MiB static logical headroom, separated subscriber/producer leases, added an
ordinary-producer settlement barrier, then made the native queue shared across
closed/reopened viewer instances. A final field-width adjustment protects four-digit
frame values. Each revision was rebuilt/retested. This headroom is separate from
source admission and is not an 84 MiB charged token or whole-process cap.

Focused validation passed 83 tests; eighteen independently Sharp-decoded production
Save comparisons matched every alpha and visible RGB channel. The coordinator
checked 4 MP B&W 4×4/100% native output at one source pixel/CSS pixel, Fit preserving
the 2048² raster, reopening, and actual GIF frames 1/8/20 with correctly moving
markers. Final 390×844 geometry has a 366px panel within the viewport, 68.47×44 field
and 44px arrows; Back to overview resumes sampling/playback. Unsupported 2049×2048
and 16,384×8 long-sheet cases passed. Final tabs had no console warnings/errors.
Both reviewers explicitly agreed after the agent challenged the coordinator's
browser receipts. The child browser was unavailable; no physical phone was used.
The before screenshot is labelled Original baseline, demonstrating old controls
and disclosure rather than claiming an identical converted-image comparison.

Evidence: `bench/conversion-fixes-2026-10-18/m2/REVIEW.md`.
[Native inspection](../../bench/conversion-fixes-2026-10-18/screenshots/m2-inspection-after.jpg),
[selected GIF frame at narrow desktop size](../../bench/conversion-fixes-2026-10-18/screenshots/m2-animation-inspection-narrow.jpg).

### M1 Artwork admission and ownership

A later integration audit reproduced a retained-generation gap: a matching export
held analysis A while wall updates created B and C. The corrective pass adds a
separate 128 MiB capture ledger for retained inputs and nonmatching replacements;
source admission remains 256 MiB. Palette asynchronous work uses original-only
projections and opaque weak identities, and viewer selection keeps only an ID.
Final desktop worker/fallback v5 checks each measured 60,224 actual typed bytes
covered by 60,224 source+capture bytes across A/B/C, exercised quota rejection and
recovery, and returned both ledgers to zero. Integrated App Save/ZIP, captions and
Reuse passed. This supersedes the earlier matching-free scratch assumption.

A 256 MiB logical source ledger admits complete serial decode/analysis jobs before
controlled expansion. Geometry/frame caps and a constant-storage GIF framing scan
prevent large logical screens or tiny-frame metadata from bypassing admission.
The ledger includes current/replacement analyses, import compositing/encoded scratch
and extra captured nonmatching export/count analyses. It never alters source pixels
or clip length. Native codecs, conversion/style caches, encoded output and delayed
GC remain outside this defined bound; this is not a whole-browser heap ceiling.

Challenge added independent active borrower leases, serialized actual reanalysis
settlement, worker/cache producer lifetimes, lazy original identity helpers and
count scratch. Existing tests caught five eager-getter regressions, which were fixed
without relaxing their expectations. Final adversarial work corrected malformed GIF
application-header alignment before GifReader, then stable-ID owner removal for
stale immutable tile/sheet references. Both reviewers agreed on the final revision.

The coordinator's baseline imported a 4097×4096 logical GIF containing one 1×1 patch.
Final v4 native-picker checks reject it with named recovery guidance, retain a valid
2×2 sibling, then remove/reimport that sibling successfully. Actual module worker
and cooperative fallback checks both pass exact source bytes, concurrent rejection,
queued cancellation, removed-source borrowing and recovery, returning the ledger to
zero (peak 103,822 bytes below the explicit 145,286-byte test budget). No console
warnings/errors appeared in those final checks. The child browser was unavailable;
the coordinator operated the browser and the agent challenged saved receipts.
Full current validation: 1,325 passed, two skipped across 78 files; build passed.
Evidence: `bench/conversion-fixes-2026-10-18/m1/REVIEW.md`.
[Final import screenshot](../../bench/conversion-fixes-2026-10-18/screenshots/m1-admission-after.jpg).

### M6 Portable output filenames

One filename pipeline replaces the differing Save/ZIP/drag rules. Sanitization,
NFC normalization, complete-codepoint truncation and actual reserved device-name
protection precede case-insensitive collision numbering. Full output names retain
the existing suffix and correct PNG/GIF extension within 255 UTF-8 bytes. Source
labels remain intact. Challenge covered valid CON-colorfetti versus invalid
CON.note-colorfetti, superscript device numbers, Unicode collisions, ordinal growth,
trailing truncated dots and 1,200 long-emoji siblings. Both reviewers agreed.

The coordinator ran desktop before/after matrices and real App Save, Save all and
App drag callbacks. Before Save/drag names differed; after both offer a-b-colorfetti.png.
Independent Sharp checks verified both Saves and twenty ZIP entries with exact RGBA
and unchanged PNG bytes. Real Windows Expand-Archive failed on the actual before
ZIP, then extracted all ten after entries with exact filename/SHA-256 readback.
A separate 27-entry adversarial archive also extracted fully. Focused tests: 75
passed across five files. The synthetic drag callback test does not establish an
external OS drop; the child browser surface was unavailable, so the coordinator
operated the desktop browser and the agent independently challenged its receipts.
Evidence: `bench/conversion-fixes-2026-10-18/m6/README.md`.
[Final filename screenshot](../../bench/conversion-fixes-2026-10-18/screenshots/m6-filenames-after.jpg).

### M7 Transparent GIF bounds

Palette and asynchronous 1-bit exports consider independent transparent frame
rectangles after None remapping. Coordinator challenge rejected plain cropping:
five of 14,064 croppable binary 4×4 inputs grew. The final writer compares both
complete encoded blocks in one buffer and keeps only a strictly smaller result.
A 75% area gate avoids near-full candidates, and a further revision reserves
candidate output against the actual full-frame end, limiting unnecessary growth.
Both reviewers explicitly agreed after these revisions and repeated testing.

Affected validation passed 241 tests across thirteen files. All 14,064 shipping
size-gate cases were non-growing. Native desktop Chrome ImageDecoder and independent
Sharp checks preserve all alpha, visible RGB, logical dimensions, timing and repeats,
including first-cropped, empty-first, shrinking and both None choices. The coordinator
repeated the final browser matrix and real App Save/Save all after the last allocation
revision; the agent independently decoded those fresh artifacts. Save shrank 593→277
bytes; ZIP shrank 1,480→848. Opaque 256-color output retains exact bytes.

The agent's browser surface was unavailable for this task, so the coordinator
operated the desktop browser and the agent challenged its saved receipts. The
test-only iframe captures finished download Blobs, leaving production handlers and
encoders unchanged. Two compressions for eligible candidates add CPU; no universal
speedup or whole-heap bound is claimed. Evidence and reproduction commands:
`bench/conversion-fixes-2026-10-18/m7/README.md`.
[Final browser screenshot](../../bench/conversion-fixes-2026-10-18/screenshots/m7-gif-bounds-after.jpg).

### M3 Import errors

Failed local/URL batches retain valid additions and show a count, at most three
safe filename/recovery examples and the remaining count. Unknown browser failures
are described honestly; raw exceptions and signed URLs never appear. Zero GIF
dimensions are invalid data. Strict decoding is preserved.

Coordinator challenges corrected an ineffective geometry test, removed whole-name
array allocation, ruled out MIME guesses and extended dense-report visibility
from a fixed nine seconds to a bounded 9–30 seconds. The agent's final challenge
added the complete Unicode bidi-control property, including Arabic Letter Mark.
Every revision was rebuilt and retested in the desktop browser. Both reviewers
agreed on the final fix. A transient mutable-build test failure was investigated;
stable retesting passed and final served bundles are frozen in memory. The exact
cause of the transient failure is not asserted.

The coordinator independently repeated baseline and candidate native file-picker
imports of a valid and malformed GIF, confirming valid wall preservation and named
guidance. Agent checks include mixed URLs, misleading valid MIME/name, a 20-file
bounded report at 375×720, notice persistence beyond nine seconds, actual canceled
network response and no late wall/message after Remove all. Focused validation:
135 tests across seven suites and production build passed. These overlapping
focused suites are not added to a full-suite total.

Evidence: `bench/conversion-fixes-2026-10-18/m3/REVIEW.md`, `validation.json`,
browser-state/cancellation receipts and focused tests. Final frozen candidate is
`http://127.0.0.1:5203/after-v4/`.
Screenshots: [before](../../bench/conversion-fixes-2026-10-18/screenshots/m3-import-before.png),
[after](../../bench/conversion-fixes-2026-10-18/screenshots/m3-import-after.png).

### M5 Palette editor contrast

The initial two-rule correction fixed Save and unselected method labels. Continued
challenge found the same defect in Cancel and visible hints (3.3358:1 in light).
The agent extended the correction to four editor-scoped roles, then repeated the
affected browser checks. The coordinator independently inspected both revisions
in the real editor, including the revised secondary text and footer colors.
Both reviewers agreed on the revised scope and solution before commit.

The final 109 enabled-state observations have a worst measured ratio of 5.4242:1;
light hints reach at least 5.923:1 and Cancel at least 12.375:1. Checks include both
themes, actual hover and keyboard focus, selected methods, desktop/narrow desktop
viewports, disabled empty drafts, 65-color pagination and save/reopen of exact RGB
colors. Production build passed. The change does not add conversion work.
Forced-color emulation was unavailable in this browser; existing UA/system-color
behavior remains, without claiming it was exercised.

Evidence: `bench/conversion-fixes-2026-10-18/m5/contrast-results.json`, raw computed
captures, `contrast-receipt.mjs` and `source-build.json`.
Screenshots: [before](../../bench/conversion-fixes-2026-10-18/screenshots/m5-editor-before.jpg),
[after](../../bench/conversion-fixes-2026-10-18/screenshots/m5-editor-after.jpg).

### M4 GIF repeat metadata

A bounded extension-gap scan now recognizes the ANIMEXTS alias using the same
canonical payload/last-valid precedence as NETSCAPE. It does not search or rewrite
arbitrary bytes. Existing strict errors, GCE scope and single-frame still semantics
are preserved. Coordinator challenges added a local-table-only first frame and
identifier decoys in color-table/image data. The agent added and reran those tests.
Both reviewers explicitly agreed after final review.

The coordinator independently ran the desktop browser decoder/worker/Save/ZIP
matrix, imported the finite-repeat fixture into the real production App and clicked
Save. Independent Sharp decoding of that fresh 85-byte output confirmed three total
plays, two 2×1 frames and 100/200 ms delays. Agent evidence also independently checks
every RGBA byte in the actual Save and both ZIP entries, absent/infinite/finite/max
repeat counts, GCE scope, split/truncated data and trailer/payload decoys. Targeted
validation: 111 tests passed and production build passed. Native IAB download-event
capture was unavailable; the test-only iframe captures completed Blobs at anchor
transport without replacing production encoding, snapshots or gestures.

Evidence and exact reproducible commands:
`bench/conversion-fixes-2026-10-18/m4/README.md`, `oracle-results.json`, browser
receipts and unit-test receipt. [Browser verification screenshot](../../bench/conversion-fixes-2026-10-18/screenshots/m4-gif-repeat-after.png).
