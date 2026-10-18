# Fresh cumulative review

Scope: audit-only diff `35fbb73859a6526dbd6e1ccfd3671e5181d8f954..133b3f1`.
The mobile-caption CSS/spec change in `35fbb73` is outside this audit. Reviewer
owns only this directory, has not edited production, attached a device/browser,
repeated timed benchmarks, pushed, or committed.

## Round one findings

1. **Retained output witnesses omitted from Git (P2).** The parent bench ignore
   policy drops PNGs. At the reviewed commit, 24 canonical paired PNG outputs and
   12 desktop 1-bit/Keep output witnesses existed locally but were absent from
   Git. `witness-paths.json` enumerates the exact paths, separately from generated
   inputs and screenshots. All 38 canonical native baseline/pair witnesses match
   their receipt hashes. Eleven 1-bit PNG hashes also match their style manifest;
   Keep exists and its original decoded contract remains in the interaction
   receipt. Stage these exact files so a fresh clone retains the asserted output
   witnesses. Keeping one baseline/candidate copy per case is sufficient: the
   280 count describes trial outputs, not 280 distinct retained files.

2. **Historical source manifest misattributes the external caption CSS (P2).**
   `manifest.json` claims clean revision `217cb64`, but its
   `src/mobile-image-actions.css` hash matches current `35fbb73` content. Comparing
   normalized Git source confirms this is the only substantive source mismatch;
   several other files have mixed Windows line endings. Consequently the final
   validator reports no outside-audit source difference. Correct the historical
   source ledger using exact Git-object provenance (or explicitly distinguish the
   captured later source) and report the external CSS separately. This does not
   invalidate measured runtime comparisons: fresh materializations of historical
   baseline and archived D1 reproduce every emitted JS/CSS/worker asset exactly.

## Independent checks

- Both reproduction scripts passed in new directories
  `.tmp/whole-app-performance-2026-10-17/final-review-{baseline,candidate}`.
  No old served build was rebuilt. Candidate matches all 40 retained artifact
  hashes. Baseline matches all runtime artifact hashes; the unrelated trailer is
  deliberately omitted, and its copied static webmanifest differs only in LF
  versus CRLF (normalized content identical).
- Production/dependency diff for the reviewed audit is empty. Quantizer source
  and tests match historical baseline; package lock matches historical and frozen
  hashes. Archived candidate hash matches the measured manifest.
- Recomputed the actual raw 120 desktop plus 160 native first/warm trials.
  Each group has five baseline and five candidate observations; all encoded
  hashes agree within each case. Native warmed targets are
  120.051→115.158 ms (−4.0758%) and165.918→154.613 ms (−6.8136%), both below the
  predeclared10% gate. Tiny warmed CPU is70.039→74.118 ms
  (+4.079 ms/+5.8239%), worse in four of five pairs. D1 rejection is supported.
  No new kernel or size-threshold experiment is needed.
- Main report and performance guide label desktop improvements as rejected code,
  preserve cold structural/editor baseline costs, separate actual Codex Browser,
  auxiliary Edge and USB Android, and disclose missing physical landscape,
  native gestures/transports and Safari/iOS/macOS. Existing historical studies
  are references and are not claimed as new production fixes.
- Full tests/build/QA were already passed and no production change is proposed,
  so this review does not repeat them. Cleanup records establish owned tabs,
  native files/settings and forwards were restored; root owns final helper-server
  termination. This reviewer did not inspect personal tabs/downloads or attach
  shared surfaces.

Commands and small receipts: `check.mjs`, `check-results.json`, and
`witness-paths.json`. Round-two closure follows coordinator corrections; no third
candidate round or production optimization is authorized by this review.

## Round two closure — PASS with disclosed coverage limits

Coordinator corrections resolve both findings. Independent `round-two.mjs`
checked all163 canonical historical source records directly against `git show`
at217cb64: zero hash/byte-length mismatches and exact source-file membership.
Text canonicalization replaces CRLF with LF and encodes UTF-8; binary PNG assets
retain raw bytes. All163 original raw worktree observations remain preserved in
`observedSourceAtFreeze`. Current normalized source and `final-validation.json`
both identify exactly the separately owned `src/mobile-image-actions.css` change.
The finalizer uses the same explicit encoding and rejects additional source
differences. Reproduced runtime build hashes remain unchanged.

All50 canonical native-output plus 1-bit/Keep witnesses now appear in the Git
index and exist on disk. The36 previously missing output PNGs were staged
explicitly; four additional Android before/after screenshot PNGs are layout
witnesses, separately identified from native encoded output. The desktop baseline
description now correctly says26 decoded export entries. No production source,
build configuration, dependency or public-asset changes are staged by this audit.
Exact round-two results are in `round-two-results.json` (`pass: true`).

No unresolved actionable audit finding remains within the two focused rounds.
The native D1 gate failure/adverse loss supports rejection; no current production
speedup is claimed. Physical Android landscape, remaining hardware gestures and
native transports, and Safari/iOS/macOS remain the explicit limits documented in
the main report. This review does not turn finite passing observations into a
universal frame-time, memory or correctness guarantee. Root retains ownership of
final helper-server cleanup evidence and the final audit-only commit; no push or
deployment was performed by this reviewer.
