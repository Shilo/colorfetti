# Second whole-app performance audit — October 17, 2026

Independent rerun of the handoff in `docs/research/2026-10-17-whole-app-performance-audit.md`,
requested after the first audit (commits `133b3f1`, `3c47699`) shipped no optimization.
Performance only: every output, setting, control and lifecycle rule is preserved.

## Baseline

- HEAD `3c47699b8f0ee6e58f7d3082d699c81376747dea`, clean tree (includes `35fbb73` caption CSS).
- `package-lock.json` sha256 `4729589b4dab0eb85986ea90273c86d08cc8abde32a9c4c5c0bc18818e1fec23`; Node 25.0.0; Playwright 1.64.1.
- Immutable build: `npm run build -- --outDir .tmp/second-audit-2026-10-17/baseline/dist`,
  served by `node bench/whole-app-performance-2026-10-17/server.mjs .tmp/second-audit-2026-10-17/baseline/dist 5371`.
  Asset hashes: `build-hashes.txt`. Sourcemap build (attribution only) on port 5373.

## Ownership

| Role | Owns | Surface |
|---|---|---|
| Coordinator | this README, integration, src/ edits, commits | Claude desktop app's built-in browser (stands in for the handoff's "Codex Browser") |
| Desktop profiler | `desktop/` | Claude desktop app's built-in browser (Chrome 152 engine), own tab; per the user, no Edge |
| Android profiler | `android/` | USB Pixel 8 Pro `37211FDJG00267`, native Brave |
| Source reviewer | `review/` | Node only; production read-only |

Timed windows: desktop profiler only on host; phone timings on phone. Coordinator browser use is functional, not timed.
Nothing is pushed or deployed.

## Checklist

| Path | Status |
|---|---|
| Startup/demo/themes | Checked: Claude browser warm/cold startup, demo, paste; phone startup both themes |
| Import (batches, sheets, GIFs, fallback) | Checked: synthetic paste handoff (desktop); phone input/drop/paste handoffs, worker-unavailable fallback |
| Palette conversion (Auto/fixed, caps, Cleanup, dither, Cut/Keep) | Checked finite representatives both surfaces; 10 phone outputs scalar-exact |
| 1-bit (11 styles, cold/warm structural, Brightness) | Checked: 11 styles desktop readback = core masks, phone paints; cold Icon/Stencil, Brightness profiled |
| Wall/counts/Reuse | Checked: exact named captions used as readiness on both surfaces |
| Preview | Checked desktop/phone open/zoom/Fit/close (phone pointer synthetic) |
| Animation | Checked: motion clips; 384×384×48 over-budget playback on phone |
| Export (PNG/GIF/ZIP/Copy) | Phone native PNG/GIF exact; desktop downloads not run (need user approval); ZIP/Copy transport not newly checked |
| Editor/controls | Checked: 256-color Review/paging desktop + phone |
| Idle/teardown | Checked: 6 phone remove/demo/GC cycles; recovery after injected worker failures |
| Candidates | Round one done; round two below |

## Candidate C (declared before candidate timing)

Exact-output patches from `review/` (Node equivalence: 235 images, 82M pixels byte-identical):
C-icon (`iconOf`/`glyphComponent`), C-sprites (Stencil `sprites`), C-seams (`addSeams` skips 0-diff pairs),
C-fused (non-luma `analyze` single loop). They touch disjoint workloads (Icon style, Stencil style,
analysis on import/Brightness), so one combined build `cand-all` is A/B'd and each target workload
attributes to its own patch; each accepted patch is committed separately.

Acceptance, per patch, on the actual Pixel 8 Pro (5 alternating AB/BA pairs, fresh owned tab per trial)
and the Claude browser desktop (same):
- Target: median renderer CPU **or** max Long Task of its target window improves by ≥10% on the phone
  (C-icon: cold Icon 2048/1024; C-sprites: cold Stencil 2048/1024; C-seams+C-fused: rapid Brightness
  R→G→Value 2048), and does not get worse on desktop.
- Adverse: no common case (8 sprites + effect import, sheet imports, tiny 1-bit styles, motion GIF import)
  worse by more than 5% **and** 3 ms median, considering variation.
- Exact: same native PNG/GIF bytes on the phone for the baseline output set; full `npm test`;
  `bench/equiv.mjs`; `bench/palette-qa.mjs` with `BASE_REF=3c47699`.
- At most two review rounds; otherwise reject.

### Round one result (phone `android/ab-c/`, desktop `desktop/ab-c/results.json`)

| Patch | Phone | Desktop | Round-one decision |
|---|---|---|---|
| C-seams+C-fused | Brightness 2048 CPU 569→444 ms (−21.9%), LT 151→114, 5/5 pairs | 209.7→160.2 ms, LTs gone, 5/5 | target passes; sheet1024 import adverse median +13 ms/+11% (pair deltas −24/+14/+11/+48/−21%; its analysis runs in the import worker, outside renderer CPU) → **rerun** |
| C-icon | 1024 LT 215→177 (−17.7%); 2048 CPU flat, LT −4% | 2048 −9.6% 5/5; 1024 −1.5% | 2048 phone target missed → **rerun** |
| C-sprites | 2048/1024 flat | medians +2.8/+7.5 ms (one outlier each) | **REJECTED** (no target gain) |

Phone pairs ran after the user closed all apps/Brave tabs (Brave restarted); judged only within-session.
All 12 native outputs per variant byte-identical A vs B; desktop tile readback identical.

Round two (final, gates unchanged): single-patch builds `cand-analyze` (5383) and `cand-icon` (5384)
against `base-repro` (5381), 7 rotating pairs on a rested phone.

### Round two result (phone `android/ab-c2/`) and final decisions

| Patch | Phone round two | Decision |
|---|---|---|
| C-seams+C-fused | Brightness CPU 611→430 ms (−29.7%), LT 162→111 (−31.5%), every triple −23…−34%; sheet2048 import renderer CPU +11.8 ms (+6.1%, per-triple −24…+29%), caption elapsed −5.7%; sheet1024 −5.9%, sprites +0.4% | **ACCEPTED.** The import analysis runs in the import worker (>4096 px, `image-import-client.js`), so the changed code is not on the measured thread; the failing import moved between rounds; desktop imports improved. Judged as variation under the declared clause. |
| C-icon | Icon 2048 LT −15.3%; Icon 1024 LT −5% (per-triple −41…+58%) | **REJECTED**: target passed at a different size in each round; not repeatable. |

Final checks on the live tree (HEAD `3c47699` src, later doc-only `fa52453`): `npm test` 1050 passed / 2 GC skips
(`final-tests.log`), build (`final-build.log`), `equiv-against-head.mjs` 26,400 combinations identical
(`final-equiv.log`), fresh reviewer differential PASS (`final-review.json`: 21,530 analyze, 229,394 mask,
2,245 unify/unifyAsync comparisons, 0 mismatches). `bench/palette-qa.mjs` not run: it launches Edge, which the
user excluded. Owned servers (5371, 5381–5384) stopped; worktrees under `.tmp` only.

## Source-review wave (addendum `.claude/handoffs/2026-10-17-225713-performance-source-review-addendum.md`)

Ledgers: `source-review/A/ledger.json` (114 rows, UI/CSS/lifecycle), `source-review/B/ledger.json`
(79 rows, kernels/workers/IO), research log `source-review/C/api-log.json`, bundle `C/bundle.json`,
challenges `C/challenges.json`. Revision `0c61dd0`.

### Wave-two candidates and gates (declared before candidate timing)

All: exact outputs (native bytes where exported, identical captions/masks), full `npm test`, A/B in
alternating pairs on the Pixel 8 Pro (≥5) and the Claude browser (≥5) unless stated. Adverse floor
everywhere: a common case may not be worse by more than 5% **and** 3 ms median, considering variation.

| Id | Change | Target and gate | Specific adverse checks |
|---|---|---|---|
| C-A1 | Tile: no 1-bit count collection while a Style slider is dragged (`budget > 0`); count once at rest/release | Scripted Threshold drag on a 1-bit Checker wall: renderer CPU in the drag window −15% or better on the phone | Release→final exact caption not worse by more than 50 ms **and** 20%; final caption identical; no caption change on press without move |
| C-B4 | save.js: palette PNG rows ≤ threshold compress with `zlibSync` (identical bytes) instead of a per-call fflate worker | Tiny palette PNG preparation (Copy/hover/Save path) elapsed −15% or better on the phone | 2048 sheet palette Save unchanged path (not worse); max Long Task not worse by >5 ms on the largest below-threshold size |
| C-B1 | Exact per-source color histogram (≤4096 colors, no partial alpha) reused by limiter and Auto jobs instead of re-streaming pixels | Max colors 2→4→8 on sheet2048: elapsed to final paint −15% or better on the phone | Tiny-wall Max colors and Auto import not worse; retained memory bounded and released with the source |
| C-B5 | Brightness reanalysis runs `analyze` in row bands with posted-task yields (sync callers unchanged) | Rapid Brightness 2048: max Long Task −25% or better on the phone | Total elapsed to final paint not worse by >10%; tiny reanalysis not worse; `bench/bench.mjs` analyze not slower |

### Wave-two round one (phone `android/ab-w2/`, desktop `desktop/ab-w2/results.json`)

| Id | Phone | Desktop (Claude browser) | Decision |
|---|---|---|---|
| C-B4 | Tiny palette Save click→download 66.4→25.2 ms (−62%, every triple −55…−76%), CPU −20%; 255 px/65,280-byte one-batch image: LT Δ0, elapsed −27%; sheet2048 CPU −3.9%; sheet1024 renderer CPU +10.3 ms (+10.5%) but within-triple +3.0% and click→download −0.2% on the unchanged above-threshold path; 84 Saves byte-identical | tiny 6→4 ms (timer resolution), sheet1024 not worse | **ACCEPTED** (`0a4eb91`): the only miss is variation on a path whose executed code is unchanged |
| C-A1 | Drag CPU 589→525 ms (−10.9%; gate −15%), no LTs, release→caption 145→139 ms, captions identical, press-without-move unchanged | busy proxy 120→101 ms (−16%), adverse PASS | round one **misses**; the wall (4×16 px + 1024²) did not exercise the mechanism: 16 px counts are trivial and 1024² exceeds `ONEBIT_INSPECTION_PIXELS`. Round two (final), same gate, wall of four distinct 512² crops (`wave2/fixtures/`, `make-crops.mjs`) |

### Wave-two final decisions

| Id | Evidence | Decision |
|---|---|---|
| C-B4 | Round one above. The scripted phone summary (`android/ab-w2/summary.md`) mechanically marks the sheet1024 Save CPU floor as REJECT; the coordinator overrides that verdict as variation: the above-threshold path executes the same code (one added length comparison), its within-triple median is +3.0% and click→download −0.2% | **ACCEPTED** `0a4eb91` (override stated here) |
| C-A1 | Round two (`android/ab-w2b/`): 512² Checker drag CPU 975→750 ms (−23%, every pair −20…−31%); release→caption 132→143 ms (+11 ms, inside 50 ms/20%); captions identical; press-without-move unchanged; Atkinson −26% | **ACCEPTED** `5e19c48` |
| C-B1 | Phone (`android/ab-b1/`): Max colors 2→4→8 792→208 ms (−74%), CPU −34%; adverse tiny wall −1.8% CPU, Auto import 187→175 ms, sheet2048 import 309.8→308.8 ms; captions/Saves identical. Desktop (`desktop/ab-b1b5/`): 205→56 ms, adverse pass. Review `wave2/c-b1-review.json` PASS; implementer evidence `c-b1/` | **ACCEPTED** `236bbcc` |
| C-B5 | Phone (`android/ab-b5/`): max LT 93→0 ms every pair, elapsed 642→559 ms, max rAF gap 83→17 ms; tiny wall +3.9% elapsed/+4.8% CPU (under 5%). Desktop: not worse, worst frame 33→17 ms. Review `wave2/c-b5-review.json` PASS; implementer evidence `c-b5/` | **ACCEPTED** `90b2d05` |

Final integration (`android/final/`): build of `90b2d05` (asset hashes `final-90b2d05-hashes.txt`, equal to
the live `dist/`), all native-harness modes, 0 app errors, 10/10 native Saves byte-identical to the
second baseline. Full suite 1058 passed / 2 GC skips; `npm run build` passed; `equiv-against-head.mjs`
26,400 identical. Cumulative review `final-cumulative-review.json`: PASS-with-fixes (docs/comments only),
all fixed in the follow-up docs commit.

Provenance note: the gate tables above were written to this file before each candidate's timing began,
but this directory was committed only at the end, so git history alone cannot prove that order; the
timestamps of the raw receipts (`android/ab-*/`, `desktop/ab-*/`) postdate the gate edits.
Deferred ideas and the API log: docs/research/2026-10-18-performance-source-review.md.

### Post-Codex correction

C-B4 is **REVERTED**: a 10-pair fresh-tab decider (bench/challenge-of-codex-2026-10-18/android/decide-save/)
reproduced Codex's above-threshold adverse result, sheet1024 Save click→download 111.8→124.8 ms, 8/10 pairs
slower, failing the declared floor. The earlier coordinator variation override was wrong.
