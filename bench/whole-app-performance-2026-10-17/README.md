# Whole-app performance audit — October 17, 2026

Starting revision: `217cb64360784c066e944f8121858d7726f0e4f2`, clean tree.
Production source matches runtime baseline `34a95d97f65ec681d07b52ace85dc84e6c8ce56c`.
This is a fresh audit. Historical receipts are references, not current acceptance.

Provenance correction after fresh review: clean status refers to startup. The
original raw source-hash observation was collected later, after another chat's
caption CSS edit, and is preserved as `observedSourceAtFreeze`. `manifest.source`
is now the exact217cb64 Git-object ledger (text LF normalized, PNG bytes exact).
Fresh materializations reproduce all measured runtime assets. The final source
validator separately identifies35fbb73's external caption CSS. Canonical native
output witnesses are explicitly staged despite the older PNG ignore policy.

## Ownership and measurement rules

- Coordinator owns Codex Browser test tab, integration, checklist and commits.
- Desktop agent owns `desktop/`, its own sandboxed Edge process.
- Android agent owns `android/`, exclusive USB Pixel controller and exact test files.
- Challenger owns `review/`, production read-only until specific assignment.
- App/Tile/Dock and all production sources remain coordinator-owned initially.
- Timed windows run serially, separated from compilation and full unit tests.
- Files are staged before measuring imports. Exact imported identities and fresh
  final committed paint/count distinguish readiness from the live demo.
- Main-thread TaskDuration excludes worker CPU. Instrumented rAF does not measure
  app idle scheduling. Native output files, independently decoded, establish pixels.
- No production changes until baseline and candidate criteria are recorded.
- No push or deploy. Preserve other active chat edits; inspect before staging.

## Frozen build

The original baseline was built at217cb64 with
`npm run build -- --outDir .tmp/whole-app-performance-2026-10-17/baseline/dist`.
On a later checkout, reproduce the historical tree without altering live source:

```powershell
node bench/whole-app-performance-2026-10-17/build-baseline.mjs
node bench/whole-app-performance-2026-10-17/server.mjs .tmp/whole-app-performance-2026-10-17/replay-baseline/dist 5371
node bench/whole-app-performance-2026-10-17/desktop/fixtures.mjs
```

Server loads assets once, excludes unrelated trailer media, and serves retained
practical fixtures at `/fixtures/`. Never rebuild under an active tab. A candidate
uses a separate immutable directory and port. `manifest.json` records exact hashes.

## Finite coverage checklist

Status starts pending; each row requires linked fresh receipts before passing.
Expand around reproduced costs, not a Cartesian product of settings and assets.

| Priority | Path | Required representative coverage | Status |
|---|---|---|---|
| P0 | Startup/demo | fresh/repeat/restored, both themes, import/remove/demo, module sizes | Checked Codex/desktop/native; process-cold universal budget not claimed |
| P0 | Import | 1/2/4/8 sprites + real GIF, 1024/2048 sheet, 32/48-frame clips; picker/drop/paste; cancellation/fallback | Checked; actual Codex picker/paste, native staged handlers/fallback; phone physical picker/paste pending |
| P0 | Palette | Auto/fixed/saved, Oklab/RGB, All/2/4/8/16, cleanup, dither sizes/amount, Cut/Keep, rapid replacement | Checked finite representatives and scalar/differential oracles |
| P0 | 1-bit | all eleven styles correctness; simple/structural/pattern/diffusion timing; reanalysis/drafts/None/equal inks | Checked; native large cold/warm costs retained; input cancellation suites supplement actual controls |
| P0 | Wall/counts | current identities/counts, cached Original, resize/scroll, queue cancellation/removal, demo guards | Checked current publication/Reuse races and native return; no estimated large pattern proof added |
| P0 | Preview | Fit/reverse steps, wheel/pinch/pan, compare/navigation, refinement cancellation, hidden wall | Checked Codex/native controls + focused input/refinement suites; physical pinch/trackpad pending |
| P0 | Animation | fresh visible progress, source/converted/offscreen/return, cache budgets/release | Checked practical and native over-budget clip + lifecycle/source suites |
| P0 | Export | PNG/GIF/ZIP/Copy/drag; snapshot/settings races, hover cancel, failure atomicity/partial alpha | Checked actual native files/Codex clipboard+ZIP and focused ownership/failure tests; OS drag-out and phone clipboard/ZIP transport pending |
| P1 | Editor/controls | acquisition routes, 256 colors, library/HEX/edit/delete, dialogs/selection, reset/persistence, touch/keyboard | Checked Codex/native editor + full built-app/storage/dialog suites; live network receipt separate |
| P1 | Idle/teardown | still/Preview/settings/editor idle; repeated source/export/remove; retained paths/object URLs/workers | Checked six desktop and six native cycles; no universal heap/retaining-path claim |
| P1 | Conditional stress | 4096/4097 colors, palette256, over-budget clip, no-worker, rapid cancellation | Checked native extended baseline and source/built-app regressions |

Acceptance: repeatable material gain with unchanged output/controls/cancellation,
no meaningful fast-path/adverse-case regression, native phone evidence, and an
independent challenge. At most two focused correction rounds per candidate.

## Baseline checks

Production build passed. Initial sandbox `npm test` failed before executing tests
because Vitest temp SSR cache rename returned EPERM; this is setup failure,
not 66 tested source failures. Approved host run: **66 files passed, 1050 tests
passed, two GC-dependent tests skipped** (`baseline-tests.log`).

An independent active chat subsequently committed `35fbb73` (mobile caption CSS
and its design contract). That is outside this audit. Baseline and D1 candidate
builds both use `217cb64` source; candidate materialization adds only the explicitly
owned quantizer diff. Final current-checkout integration must separately include
that unrelated commit without claiming it as an audit optimization.

## Candidate ledger

D1: source-sized nearest conversion addressing; owner desktop agent,
`src/lib/quantize.js` and behavioral tests only. Predeclared gates and source
attribution: `desktop/candidate-full-source.md`. Round-one independent review:
`review/candidate-d1-review.md`; bounded Int32 guard correction applied before
measurement. Correctness differential: 4896 cases, 433728 output pixels, 2856
scalar-nearest cases, 816 async cases and eight cancellation cases passed.
Final decision: **REJECTED — NO SHIP**. Native warm sheet1024/2048 Save CPU
gains4.1%/6.8% miss the declared10% gate. Native tiny warm CPU rises4.079ms/5.82%,
worse in four of five pairs, crossing the declared adverse floor. Favorable
desktop/kernel/first-export results do not override those outcomes. All280 paired
desktop/native downloaded files retained exact encoded-byte equality. The original
production quantizer/tests are restored. No production optimization was committed.

Source-level duplicate exact-count conversion is an investigation hypothesis,
not a measured defect or accepted optimization. Preserve existing pending-record
identity, explicit Reuse subscription and bounded streaming policy.

## Fresh baseline evidence map

- `manifest.json`: complete revision/source/build/dependency-lock hashes and
  licensed original practical-cohort manifest.
- `desktop/baseline/`: five practical cohorts, current named paint plus separate
  exact count publication,26 independently decoded native PNG/GIF/ZIP outputs.
- `desktop/baseline-profile/` and `review/profile-review.json`: recorded CPU
  samples and independent source attribution, excluded from gain comparisons.
- `desktop/diagnostic-manifest.json`: deterministic transparent/two-color/glow,
  bounded entropy, 4096/4097 boundary, single-frame GIF and 256-color palette.
- `android/baseline-summary.md`: actual USB Brave portrait measurements and
  precise failures/coverage limits. Five real native output files independently
  match source RGB/alpha/timing/loop. Some frame gaps exceeded 50 ms despite no
  Long Task above 50 ms; those observations remain retained.
- `codex/interactions.md`, native outputs and `output-verification.json`: actual
  IAB file-picker, clipboard Copy/paste, Reuse/editor, zoom/Fit, themes, None/equal
  inks, batch ZIP and partial-alpha Keep tests. Screenshots are layout evidence.
- `review/lifecycle-results.json`: six still mount/Preview/remove cycles and
  admitted animation. Settled still windows schedule no observed app rAF/timer or
  canvas work; one healthy lazy import worker is intentional. Heap observations
  do not establish universal leak absence or a whole-app memory bound.

Final restored full suite: **1050 passed, two existing GC skips**. Final production
build passed. Built-app regression against explicit217cb64 passed132 independently
decoded legacy exports,12 full-palette exports/clipboard PNGs,12 RGB preset cases
and13 extra integration categories, with no console errors. See final logs/JSON.

Fresh cumulative review: **PASS with documented limits** after two focused
correction rounds (`final-review/README.md`, `round-two-results.json`). All163
historical source records and all50 retained output witnesses are verified;
all280 trial output hashes agree by case. Root/phone cleanup receipts confirm
owned tabs closed, original device state restored and all six helper endpoints
unreachable. No production/dependency/config change belongs to the audit.

Baseline phone acquisition used staged synthetic import-event handoff; actual
Codex picker/paste are separate evidence. Physical landscape and Safari/iOS/macOS
remain unavailable; no emulated result satisfies those native gates.
