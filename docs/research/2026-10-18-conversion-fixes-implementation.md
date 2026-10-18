# Conversion and UX fixes: implementation and challenge record

October 18, 2026. Implements the eight confirmed recommendations M1–M8 from the
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
| M1 | Decoded artwork admission budget | Queued |
| M2 | Sampling disclosure and native-pixel inspection | Queued |
| M3 | Bounded per-file import diagnostics | Accepted after revisions and desktop retesting |
| M4 | ANIMEXTS GIF repeat metadata | Accepted after independent Save/ZIP verification |
| M5 | Enabled palette-editor text contrast | Accepted after revision and desktop retesting |
| M6 | Portable Save/ZIP/drag names | Accepted after actual Windows extraction and Save/ZIP/drag verification |
| M7 | Transparent GIF frame-bound cropping | Accepted after size-gate revisions and independent Save/ZIP verification |
| M8 | Exact PNG state compaction | Queued |

## Accepted changes and review discussions

Task-specific acceptance and evidence are recorded here as each task completes.

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
