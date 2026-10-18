# Post-Claude performance review — October 18, 2026

Reviewed revision: `49f7ab2d4d2126d81ed01b533aee6701d7cb3f51`.
Production review range: `3c47699..49f7ab2` (five performance commits plus records/comments).

This was a source/evidence review with two independent read-only reviewers and coordinator challenge, followed by fresh unit/build verification. No browser/device was operated, no new performance timing was measured, and no runtime code was changed. Prior Claude browser/native Android receipts are historical evidence, not fresh Codex Browser tests.

## Decision

No actionable production correctness defect was identified in the reviewed changes. Preserve the five accepted optimizations. Claude's report accurately describes their presence and finite output checks, with these qualifications:

- The 445→298 ms final Rapid Brightness comparison is renderer CPU, not elapsed-to-final-paint. Repeated candidate A/B results are preferable to describing that smoke comparison as a general speedup.
- B4's tiny PNG compression gain is supported, but its above-threshold sheet1024 aggregate CPU regression triggered the script's REJECT. The coordinator's variation override is now explicit in the retained ledger; it is not an unqualified automatic gate pass. Unchanged-path reasoning alone cannot exclude scheduling/JIT effects. The next reviewer should inspect paired evidence, and run a bounded matched check only if uncertainty remains material.
- Histogram diagnostic floating-point cost totals can differ in final bits. Pixel outputs, selected subsets and Auto results are the exactness claims; not every diagnostic number is byte-identical.
- An 8 ms work-band target and no observed >=50 ms Long Tasks do not guarantee all functions are nonblocking. Very wide rows, shared animation seam work and cold structural preparation remain potential indivisible work.
- Prior desktop receipts use Claude's browser. Physical landscape, native desktop downloads, native clipboard/ZIP transport and Safari/iOS/macOS were not newly covered by that audit.

The evidence reviewer independently recomputed all ten retained final native PNG/GIF hashes against baseline and the recorded manifest: all match. See `bench/second-performance-audit-2026-10-17/android/final/output-comparison.json`.

## Fresh checks

- Host Vitest with nested scratch worktrees excluded: 66 files, **1058 passed, 2 existing GC-dependent skips**, exit 0 (`tests.log`).
- Isolated production build: exit 0 (`build.log`); output under `.tmp/claude-performance-handoff-review-2026-10-18/dist`.
- The coordinator inspected the previously omitted `build/hover-capability.js`: build-time selector transformation, no new runtime loop; its existing tests are included in the successful suite. This closes the inspection gap for this pass, but the older inventory still needs reconciliation rather than being called exhaustive as written.

Command used:

```powershell
npx vitest run --exclude '**/.claude/**' --exclude '.tmp/**' --exclude '**/node_modules/**' --exclude '**/dist/**'
npm run build -- --outDir .tmp/claude-performance-handoff-review-2026-10-18/dist
```

## Cleanup / test discovery concern

At review, `git worktree list` still showed two Claude checkouts:

- `.claude/worktrees/agent-a2312d58878913461` on `claude/c-b5-banded-analyze`.
- `.claude/worktrees/agent-a3e178b0e04490492` on `claude/c-b1-histogram`.

Plain `npm test` discovered **324 files**, including those copies and their archived `.tmp` sources, rather than the intended 66. That sandbox run also hit the known SSR-temp EPERM failure before any test executed; it is not a failed runtime assertion. The correctly scoped host run above passed.

The claim that all worktrees were cleaned is therefore not true for this checkout. No other task's worktree was removed. The receiving agent should confirm ownership and either complete owned cleanup safely or add narrowly justified test-discovery exclusions with a discovery regression check. Do not delete unrelated worktrees or broadly limit future test discovery.

## Review agreement and limits

Source reviewer: analysis arithmetic/band boundaries, caller-side abort checks, compression threshold/cancellation, caption cleanup/resume and summary/fallback ownership showed no actionable defect.
Evidence reviewer: the five speedups have retained measurements, exceptions and output witnesses; actual Codex Browser coverage and narrowly identified source probes remain appropriate next work.
Coordinator challenge: same-path attribution does not by itself disprove measured regressions; keep the B4 exception open to a focused independent check. Direct analyzeAsync entry/final abort checks are a future-proofing note, not a reproduced bug, because every current application caller checks immediately before and after. No speculative production fix is justified by this review.

This review does not certify universal performance optimality or absence of bugs. The continuation handoff identifies targeted next work and preserves completed evidence.
