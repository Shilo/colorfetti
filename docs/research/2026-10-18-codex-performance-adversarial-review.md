# Adversarial review of Codex's independent performance audit — October 18, 2026

**Recommendation: keep both fixes. No actionable production defect was reproduced.** Three independent sub-agents reviewed the implementation, test discovery and evidence; the coordinator challenged their findings and performed fresh current-build verification. No runtime change or revert is justified by this review.

Reviewed changes: `891fca2` (test discovery), `ae97d0e` (Preview focus-target lifetime), and `b58b38f` (audit evidence/report). The reviewed audit freezes runtime `ae97d0e`; concurrent filename work is included in that snapshot, while subsequent GIF work must remain separately attributed. This review started on clean `6f8238a`, whose App and Vite configuration match `ae97d0e` exactly. Other GIF/import work resumed afterward and was left untouched.

## What survives independent challenge

| Change / claim | Independent result |
|---|---|
| Release Preview's stored trigger after close | The local capture preserves the old focus/blur operation while synchronous clearing removes the persistent reference. All normal native close paths converge there. Clearing before tick also avoids a late callback clearing a newer trigger. No extra handler, conversion, cache or task was added. |
| About 22 MB less retained data | Supported for the tested removed 48-frame clip: 22,976,754 backing bytes before, 595,933 after; never-preview and tiny-trigger replacement controls corroborate the retaining path. This is last-preview-source backing storage, not whole-app peak memory, OS memory or an unbounded accumulation claim. |
| Test discovery fix | The added exclusion is narrowly **/.claude/worktrees/**, preserving defaults and root .tmp. Retained discovery records contain 324 paths before, the same intended 66 after, and precisely one additional ordinary future-fixture test when added. The current plain suite also discovers 66 files. |
| Exact retained exports | Independent artifact checks decoded/scalar-recolored 56 PNG/GIF/ZIP frames, 3,152,384 pixels, with zero RGB/alpha/delay/loop mismatches. Four focus PNG hashes agree. These are fresh checks of retained files, not new phone exports. |
| Source/evidence coverage | All 451 indexed artifact hashes match; all 96 declared implementation/configuration inventory entries are accounted for. Hashes prove provenance, not reading; source-review notes and direct implementation inspection supply separate review evidence. |

## Findings and concerns retained

### 1. CPU-regression uncertainty remains real

Pointer-close paired renderer CPU increased by **6.684 ms / 21.25%**, then **4.615 ms / 16.57%**. Keyboard increases were 2.229 ms and 1.179 ms. The measured close-event-to-next-task latency passed its stated gate, but that interval is only part of close, and the broad CPU window is not isolated handler cost.

The memory fix remains a reasonable narrow correction with a large demonstrated retained-memory benefit and unchanged tested behavior. It must not be advertised as a CPU speedup or proof of no performance regression. No fresh CPU/memory measurements were made in this review, and no third tuning round was run to manufacture a favorable result.

### 2. The CPU repeat rule's predeclaration is not independently established

The historical `bench/codex-independent-performance-2026-10-18/preview-trigger-decision.md:43` calls its CPU repeat criterion predeclared. The original retained plan explicitly states the **latency** 5 ms AND 5% limit, but does not specify the later CPU rule requiring four slower pairs. The final sidecar records that rule; the artifact set alone cannot prove when it was chosen. An earlier chat instruction may supply that chronology, but it was not verified here.

This is an evidence-provenance qualification, not proof that the rule was chosen after results or a reason to rewrite raw observations. The main audit already retains CPU uncertainty; it does not itself use the explicit word predeclared for this CPU rule. We preserve the original indexed artifacts and report unchanged and publish this dated qualification separately.

### 3. The memory claim is narrower than all possible retention paths

At the reviewed `6f8238a` boundary, persistent share/editor focus targets and source removal while Preview is mounted were separate hypotheses. They predate these fixes. Ordinary controls are modal-guarded, and this review did not reproduce a normal user path establishing a new defect. A later external commit, `1582c59`, now addresses share/editor trigger lifetime; its own evidence must be reviewed separately rather than describing those paths as still unfixed in today's checkout. Do not infer that all detached-control retention or the whole-app memory envelope is solved.

### 4. Current and frozen coverage must not be mixed

The old 1,071-pass result belongs to the audited frozen runtime plus filename tests. Our fresh **1,091-pass** result belongs to the then-clean `6f8238a`, including its separately committed GIF work. Subsequent uncommitted GIF/import changes arrived after our build; they are preserved and excluded from its immutable served files. Neither audit endorses every later live edit.

Process-cold startup, worker/GPU CPU, exhaustive memory peaks, cross-app clipboard/drag and Apple-platform coverage remain explicitly unrun in the audit. This review does not close those gaps. Cold Icon/Stencil blocking remains a real documented optimization opportunity; it was not fixed by the Preview correction.

## Fresh coordinator verification

All tests below are new for this review; browser checks used actual Codex Browser only. No Android device was accessed.

- Plain npm test, using process-local workspace TEMP/TMP to avoid the known sandbox SSR-temp setup failure: **66 files / 1,091 passed / 2 existing GC skips**, exit 0.
- Isolated production build: exit 0, then frozen in memory by the owned static server. Forty-two dist files are hashed in the current-build manifest.
- Thirteen browser check groups: repeated Enter/Escape focus return across two stills and an animation; pointer-close blur; animation Zoom/Compare/close/reopen at fresh Fit; 390×844 and 819×448 keyboard focus return without horizontal overflow; close followed by source removal, reopening a remaining image, and empty-wall recovery. No browser console errors.
- Current PNG Save before/after additional Preview cycles: byte-identical, 231 bytes, SHA256 `11ec392d1e3978ac4b0944050f821a3e1e3cbd6cfb5f729368ae978a4a2800ce`.
- Viewport restored, owned tab closed, owned server stopped, and only the two exact new downloads were removed after hash verification. Retained PNG copies remain in the review evidence. Original browser tabs, other processes, phone state and worktrees were not changed.

## Evidence and reproduction

Evidence: `bench/codex-performance-adversarial-review-2026-10-18/`.

- `evidence-check.mjs`, `evidence-results.json`, `evidence-review.md`: independent artifact, arithmetic, inventory and output checks. Run from repository root with Node; the existing independent decoder helper uses installed Sharp.
- `tests-current.log`, `build-current.log`: fresh suite/build receipts.
- `codex-ui.json`: actual Codex Browser check results and final empty-wall DOM.
- `current-build-manifest.json`, `record-current.mjs`: build hashes and observed timing boundary for later concurrent edits. The manifest is a historical receipt, not a claim that the mutable checkout remains unchanged.
- `current-before.png`, `current-after.png`: identical current-build Save witnesses.

The coordinator challenged the evidence reviewer's initial shorthand attribution of predeclaration to the main report. The reviewer checked the exact text and corrected it to the historical decision file above. The final combined reviewer independently checked the source, receipts, 451 old evidence hashes, 42 new dist hashes, UI records and PNG witnesses. Its filename-scope wording correction was applied. All three reviewers agree the two implementation fixes should remain; no speculative production patch was added. Nothing is pushed or deployed.

## Repeated final verification after resuming

At the user's request, the last verification steps were repeated before publication:

- All 451 historical artifact hashes, 96 inventory entries, paired arithmetic and retained native output checks passed again.
- An isolated Git-archive materialization of `6f8238a` reran the plain suite: **66 files / 1,091 passed / 2 existing skips**, then rebuilt successfully. This avoids testing another task's mutable edits. See `tests-repeat-frozen.log`, `build-repeat-frozen.log` and `repeat-frozen.mjs`.
- All 13 Codex Browser check groups passed again on the same immutable build. The repeated PNG is byte-identical before/after Preview and matches the first review's hash. No browser errors; viewport/tab/server/download cleanup was repeated. See `codex-ui-repeat.json`, `repeat-save.png` and `repeat-wall.jpg`.
- Rebuilt JS/CSS and binary assets are raw byte-identical. Four SVGs and `index.html` differ only by carriage-return bytes; every other character matches. The first driver's stricter CRLF comparison returned a diagnostic failure for HTML despite successful tests/build. The separate `check-repeat.mjs`/`repeat-checks.json` records the exact formatting difference and preserves that initial result. An initial follow-up assertion wrongly expected 41 raw-identical assets; checking the individual files corrected this to 37 raw-identical plus five CR-only text files. No application failure or changed performance gate is inferred from this verification-harness correction.

While the review was paused, other work committed `1582c59` (Share/editor trigger release) and `a5ac06b` (reverting synchronous small-palette-PNG compression). Both remain untouched and outside the immutable `6f8238a` execution evidence. In particular, do not describe the reverted small-PNG optimization as still present in current code, or interpret this review's retention recommendation as an endorsement of those later changes. Additional dirty GIF/import changes also remain outside scope. No new Android memory/CPU measurement was performed in this review.
