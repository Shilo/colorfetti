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
