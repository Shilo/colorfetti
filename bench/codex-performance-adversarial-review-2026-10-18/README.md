# Independent challenge of the Codex performance audit

Read `docs/research/2026-10-18-codex-performance-adversarial-review.md` for the decision, qualifications and scope boundaries. No runtime edit belongs to this review. The two original fixes are retained; later trigger-release/compression-revert and ongoing GIF work are outside the frozen execution scope.

- `node bench/codex-performance-adversarial-review-2026-10-18/evidence-check.mjs` verifies the old 451 indexed artifacts, inventory, paired statistics and native output witnesses. It operates on retained files, not a phone.
- `final-review.md` records the independent combined review; the dated report records coordinator challenges and corrections.
- `codex-ui.json` and `codex-ui-repeat.json` contain separate actual Codex Browser passes of the 13 check groups. PNG witnesses agree before/after Preview and across passes.
- `tests-current.log` / `build-current.log` are the initial then-clean 6f8238a checks. `tests-repeat-frozen.log` / `build-repeat-frozen.log` independently repeat them from a Git-archive source snapshot.
- `repeat-frozen.mjs` materializes that snapshot without resetting the live checkout. It refuses an existing target and preserves tests/build/comparison records. Its first comparison exits 1 for HTML carriage-return formatting despite successful tests/build; that diagnostic remains in `repeat-frozen.json`.
- `node bench/codex-performance-adversarial-review-2026-10-18/check-repeat.mjs` checks the repeat receipts and explicitly verifies the formatting-only discrepancy: 37 raw-identical files, four SVGs and HTML differing only by CR bytes. All JS/CSS/binary assets are raw-identical. See `repeat-checks.json`.

No fresh Android memory/CPU timing was collected. The review does not certify the mutable working tree after other tasks changed it. The original audit evidence and its integrity index were preserved unchanged.
