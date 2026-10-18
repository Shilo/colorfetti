# Codex challenge: native phone evidence (Pixel 8 Pro, Brave)

## Part 1: retention (Codex retention method (io-android/retention-probe.mjs): Remove all + 11 s + two explicit GCs, CDP Runtime.getHeapUsage backingStorageSize; touch via CDP Input.dispatchTouchEvent)

P = 18de3f7 :5431, H = 6f8238a :5432, F = H + trigger-release.patch :5433. Fixture kenney-motion-256.gif (256×256×48). Each trial: fresh owned tab; never-opened control (import→Remove all→11 s→2 GC) then, after reload, the scenario→Remove all→11 s→2 GC. Conditions start: status: 2, temperature: 327; end: status: 2, temperature: 335. Errors: 0.

| Scenario | Variant | control backingStorage MB (3 trials) | after scenario+removal MB (3 trials) | median removed MB |
|---|---|---|---|---:|
| preview | P | 0.599, 0.599, 0.599 | 22.981, 22.981, 22.981 | 22.981 |
| preview | H | 0.600, 0.600, 0.600 | 0.601, 0.601, 0.601 | 0.601 |
| share | H | 0.600, 0.600, 0.600 | 22.981, 22.981, 22.981 | 22.981 |
| share | F | 0.600, 0.600, 0.600 | 0.600, 0.600, 0.600 | 0.600 |
| reuse | H | 0.600, 0.600, 0.600 | 22.981, 22.981, 22.981 | 22.981 |
| reuse | F | 0.600, 0.600, 0.600 | 0.601, 0.601, 0.601 | 0.601 |
| sharepreview | H | 0.600, 0.600, 0.600 | 22.982, 22.982, 22.982 | 22.982 |
| sharepreview | F | 0.600, 0.600, 0.600 | 0.601, 0.601, 0.601 | 0.601 |

Focus after close (H vs F, identical descriptors expected except the removed-image labels):

- share: H {"afterSheetEscape":{"tag":"BUTTON","cls":"ib glass-btn tile-share","figure":0,"label":"Image actions for kenney-motion-256.gif"},"afterSheetBackdrop":{"tag":"BUTTON","cls":"ib glass-btn tile-share","figure":0,"label":"Image actions for kenney-motion-256.gif"}}; F {"afterSheetEscape":{"tag":"BUTTON","cls":"ib glass-btn tile-share","figure":0,"label":"Image actions for kenney-motion-256.gif"},"afterSheetBackdrop":{"tag":"BUTTON","cls":"ib glass-btn tile-share","figure":0,"label":"Image actions for kenney-motion-256.gif"}} → same
- reuse: H {"afterEditorClose":{"tag":"BUTTON","cls":"ib glass-btn tile-share","figure":0,"label":"Image actions for kenney-motion-256.gif"}}; F {"afterEditorClose":{"tag":"BUTTON","cls":"ib glass-btn tile-share","figure":0,"label":"Image actions for kenney-motion-256.gif"}} → same
- sharepreview: H {"afterSharePreviewClose":{"tag":"BODY","cls":"","figure":null}}; F {"afterSharePreviewClose":{"tag":"BODY","cls":"","figure":null}} → same
- preview (P vs H): P:BODY, H:BODY

Receipt: retention-1792323112053.json.

## Part 2e: Auto source-cold import (A w2-base :5401 vs B1 w2-b1 :5404)

10 alternating pairs (A B B A A B B A A B B A A B B A A B B A), fresh owned tab per trial, workload first in the tab. Errors: 0. Per-trial C: A@33.5 B@33.9 B@33.9 A@33.9 A@33.7 B@33.7 B@33.7 A@33.7 A@33.7 B@33.7 B@33.7 A@33.7 A@33.7 B@33.7 B@33.7 A@33.7 A@33.7 B@33.7 B@33.7 A@33.7.

| Metric | A median | B median | Δ | paired Δ ms per pair | paired median | B worse pairs |
|---|---:|---:|---:|---|---:|---:|
| paste→exact captions | 203.2 | 205.1 | 1.0% | -26.4, -0.5, -0.2, 6.8, 30.9, -24.9, -0.0, 17.7, 48.1, -12.6 | -0.1 ms (-0.0%) | 4/10 |
| renderer CPU | 137.0 | 137.6 | 0.5% | -4.9, 3.1, -1.1, 9.5, 3.9, -14.7, -0.2, 9.0, 6.5, -7.1 | 1.4 ms (1.1%) | 5/10 |
| max Long Task | 0.0 | 0.0 | - | 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0 | 0.0 ms (NaN%) | 0/10 |

Exact captions identical across all trials: yes.

Receipt: decide-auto/pairs-auto-1792323801182.json.

## Part 2f: sheet1024 palette Save (A w2-base :5401 vs B4 w2-b4 :5403)

10 alternating pairs (A B B A A B B A A B B A A B B A A B B A), fresh owned tab per trial, workload first in the tab. Errors: 0. Per-trial C: A@33.7 B@33.7 B@33.7 A@33.7 A@33.7 B@33.7 B@33.7 A@33.7 A@33.7 B@33.7 B@33.7 A@33.7 A@33.7 B@33.8 B@33.8 A@33.8 A@33.8 B@33.8 B@33.8 A@33.8.

| Metric | A median | B median | Δ | paired Δ ms per pair | paired median | B worse pairs |
|---|---:|---:|---:|---|---:|---:|
| click→download anchor | 111.8 | 124.8 | 11.6% | -12.6, 5.1, 17.9, 23.7, 6.7, 29.4, 4.6, 23.0, 17.8, -37.6 | 12.2 ms (10.4%) | 8/10 |
| renderer CPU | 76.4 | 81.6 | 6.8% | 3.3, 4.1, 7.0, 8.5, -5.2, 16.3, 2.3, 2.7, 7.9, -16.4 | 3.7 ms (4.9%) | 8/10 |
| max Long Task | 0.0 | 0.0 | - | 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0 | 0.0 ms (NaN%) | 0/10 |

Native Save bytes identical across all 20 trials: yes.

Receipt: decide-save/pairs-save-1792323830432.json.

