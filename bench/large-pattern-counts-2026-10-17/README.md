# Rejected candidate: exact large-pattern caption proofs

Final decision: **NO SHIP**. Production `src/` remains identical to `34a95d9`.
The candidate was accurate, but repeated native Android Checker edits added
approximately 1.3–1.6 ms script CPU and 2.2–3.3 ms total task CPU per commit in
the isolated runs. No new long task or additional paint/layout cycle was found;
that did not establish the user's requested absence of performance harm.

The archived modules are research references, not imported by the application:

- `candidate-recolor.js` and `candidate-onebit-usage.js` preserve the tested
  implementation, changing only relative dependency paths for archival use.
- `candidate-proof-cases.js` preserves its eight additional test cases.
- `candidate.patch` reconstructs the complete proposed production/test diff on
  baseline `34a95d9`; `git apply --check` was verified after runtime restoration.
- `recolor-baseline.js` freezes the old mask implementation with relative imports
  adjusted to the unchanged helper modules. Future dependency changes can alter
  this oracle; the baseline revision and recorded source hashes remain essential.

Standalone reproducible checks from the repository root:

```powershell
node bench/large-pattern-counts-2026-10-17/check.mjs
node bench/large-pattern-counts-2026-10-17/parity.mjs
node bench/large-pattern-counts-2026-10-17/practical.mjs
node bench/large-pattern-challenge-2026-10-17/oracle.mjs
git apply --check bench/large-pattern-counts-2026-10-17/candidate.patch
```

The prototype and archived-core checks are not tests of a shipped feature.
The large oracle is CPU-intensive; never run it during comparative desktop timing.

To reproduce built candidate UI tests, use an isolated copy at the recorded
baseline, apply the patch there, install the same locked dependencies and build
to a separate output directory. Do not apply it over unrelated work or assume
that the ordinary current app contains this rejected candidate. During this
session baseline was at port5354 and immutable candidate at port5355; those
processes may no longer exist in a future session. Historical initial candidate
receipts used port5352 before that mutable test server was restored to baseline.

The actual Codex Browser and Android receipts, native PNGs, original and isolated
timing windows and acceptance decision are retained in the adjacent research
directories. Native browser measurements are distinct from Node helper timings;
no universal speed or accuracy claim is made.
