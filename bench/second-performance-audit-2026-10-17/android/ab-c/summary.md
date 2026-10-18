# Candidate C native A/B (Pixel 8 Pro, Brave)

A = base-repro (5381), B = cand-all (5382). Order ABBAABBAAB (slots 0-9 = pairs 0-4), fresh owned tab per trial, every workload after a page reload and fresh import.
Device-state change: before this run the user closed all other phone apps and every Brave tab; Brave restarted (PID 16561 -> 32363, socket re-discovered and verified before each batch). All 10 trials ran after the change. Judge only from these pairs; absolute numbers are NOT comparable with the earlier second-baseline receipts (taken with apps/tabs open).
Conditions: start: status: 2, level: 59, temperature: 360, Capacity level: 2; end: status: 4, level: 59, temperature: 368, Capacity level: 2. Per-trial temperature C: A36 B36.2 B36.2 A36.3 A36.4 B36.4 B36.8 A36.8 A36.8 B36.8. No rest needed (threshold 38 C). Temperature drifted up ~0.8 C; both variants rose over time, which ABBA alternation balances.

## Medians (5 trials each; CPU = renderer TaskDuration ms, LT = max Long Task ms)

| Workload | A CPU | B CPU | dCPU | A LT | B LT | dLT | Gate | Result |
|---|---:|---:|---:|---:|---:|---:|---|---|
| TARGET cold Icon 2048 | 738.1 | 738.5 | 0.1% | 496 | 476 | -4.0% | >=10% better CPU or LT | FAIL |
| TARGET cold Stencil 2048 | 399.3 | 399.8 | 0.1% | 156 | 160 | 2.6% | >=10% better CPU or LT | FAIL |
| TARGET cold Icon 1024 | 429.7 | 414.2 | -3.6% | 215 | 177 | -17.7% | >=10% better CPU or LT | PASS |
| TARGET cold Stencil 1024 | 292.5 | 304.3 | 4.0% | 89 | 90 | 1.1% | >=10% better CPU or LT | FAIL |
| TARGET Brightness R-G-Value 2048 | 568.6 | 443.9 | -21.9% | 151 | 114 | -24.5% | >=10% better CPU or LT | PASS |
| ADVERSE sprites8+effect Auto import | 123.2 | 112.8 | -8.4% | 0 | 0 | - | not >5% and >3ms worse CPU | PASS |
| ADVERSE kenney-sheet-1024 import | 120.0 | 133.3 | 11.0% | 0 | 0 | - | not >5% and >3ms worse CPU | FAIL |
| ADVERSE kenney-sheet-2048 import | 187.1 | 172.4 | -7.9% | 0 | 0 | - | not >5% and >3ms worse CPU | PASS |
| ADVERSE kenney-motion-256 import | 118.8 | 112.9 | -5.0% | 0 | 0 | - | not >5% and >3ms worse CPU | PASS |
| ADVERSE tiny all 11 styles | 1567.4 | 1551.1 | -1.0% | 0 | 0 | - | not >5% and >3ms worse CPU | PASS |
| ADVERSE tiny cold Icon 16px | 180.8 | 176.9 | -2.2% | 0 | 0 | - | not >5% and >3ms worse CPU | PASS |
| ADVERSE tiny cold Stencil 16px | 178.8 | 173.2 | -3.2% | 0 | 0 | - | not >5% and >3ms worse CPU | PASS |

## All trials (CPU ms / max LT ms)

| Workload | 0:A | 1:B | 2:B | 3:A | 4:A | 5:B | 6:B | 7:A | 8:A | 9:B |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| onebit-sheet2048-for-Icon import | 121/53 | 128/51 | 149/51 | 143/60 | 188/67 | 203/89 | 218/81 | 192/79 | 219/76 | 216/86 |
| TARGET cold Icon 2048 | 622/357 | 529/332 | 560/315 | 738/496 | 688/451 | 750/476 | 767/486 | 845/563 | 807/545 | 739/477 |
| onebit-sheet2048-for-Stencil import | 141/0 | 149/0 | 152/0 | 167/0 | 167/62 | 188/51 | 171/54 | 192/59 | 190/55 | 194/58 |
| TARGET cold Stencil 2048 | 297/115 | 295/112 | 289/118 | 326/131 | 399/156 | 409/173 | 400/163 | 421/172 | 441/181 | 421/160 |
| onebit-sheet1024-for-Icon import | 89/0 | 106/54 | 91/0 | 99/0 | 110/53 | 143/81 | 121/64 | 164/101 | 131/75 | 150/81 |
| TARGET cold Icon 1024 | 420/215 | 375/177 | 426/206 | 410/193 | 430/201 | 414/175 | 391/175 | 478/220 | 534/248 | 460/201 |
| onebit-sheet1024-for-Stencil import | 92/0 | 86/0 | 94/0 | 118/56 | 105/54 | 131/71 | 170/74 | 153/81 | 135/80 | 147/86 |
| TARGET cold Stencil 1024 | 291/66 | 237/71 | 276/65 | 266/75 | 293/89 | 304/90 | 349/96 | 349/99 | 354/95 | 373/94 |
| onebit-sheet2048-for-brightness import | 126/0 | 108/0 | 122/0 | 140/0 | 182/54 | 180/0 | 162/0 | 181/53 | 157/0 | 160/0 |
| TARGET Brightness R-G-Value 2048 | 505/120 | 360/86 | 360/87 | 497/143 | 569/151 | 446/114 | 444/114 | 674/206 | 668/180 | 488/119 |
| ADVERSE sprites8+effect Auto import | 101/0 | 97/0 | 98/0 | 112/0 | 123/0 | 121/0 | 113/0 | 127/0 | 126/0 | 117/0 |
| ADVERSE kenney-sheet-1024 import | 120/0 | 91/0 | 88/0 | 77/0 | 120/0 | 133/0 | 166/0 | 112/0 | 179/0 | 141/0 |
| ADVERSE kenney-sheet-2048 import | 150/0 | 151/0 | 146/0 | 163/0 | 187/0 | 193/0 | 172/0 | 219/0 | 191/0 | 197/0 |
| ADVERSE kenney-motion-256 import | 120/0 | 87/0 | 108/0 | 120/0 | 115/0 | 125/0 | 116/0 | 107/0 | 119/0 | 113/0 |
| ADVERSE tiny all 11 styles | 1216/0 | 1156/0 | 1266/0 | 1313/0 | 1567/0 | 1608/0 | 1551/0 | 1648/0 | 1691/0 | 1708/0 |
| ADVERSE tiny cold Icon 16px | 149/0 | 146/0 | 148/0 | 157/0 | 181/0 | 188/0 | 201/0 | 185/0 | 195/0 | 177/0 |
| ADVERSE tiny cold Stencil 16px | 153/0 | 169/0 | 154/0 | 173/0 | 179/0 | 173/0 | 192/0 | 179/0 | 194/0 | 177/0 |

## Exact native outputs (encoded bytes A vs B)

| Output | A sha256 | B equal | Independent check of A |
|---|---|---|---|
| kenney-sheet-1024 | 6acc247466f62315… | yes | scalar Oklab oracle exact (RGB, alpha, dims, delays/loop) |
| kenney-sheet-2048 | ea42619273149ba3… | yes | scalar Oklab oracle exact (RGB, alpha, dims, delays/loop) |
| real-magic | 1916b8093c0d7216… | yes | scalar Oklab oracle exact (RGB, alpha, dims, delays/loop) |
| kenney-motion-128 | 270f4db2f8da8e0f… | yes | scalar Oklab oracle exact (RGB, alpha, dims, delays/loop) |
| kenney-motion-256 | 1689433d660b81db… | yes | scalar Oklab oracle exact (RGB, alpha, dims, delays/loop) |
| transparent32 | e3603df8fd507c1b… | yes | scalar Oklab oracle exact (RGB, alpha, dims, delays/loop) |
| silhouette32 | 1c30399a7a2c4301… | yes | scalar Oklab oracle exact (RGB, alpha, dims, delays/loop) |
| entropy512 | b8af76438dcad509… | yes | scalar Oklab oracle exact (RGB, alpha, dims, delays/loop) |
| partial-glow64 | 27b412cab66ed2d5… | yes | scalar Oklab oracle exact (RGB, alpha, dims, delays/loop) |
| worker-unavailable | 1916b8093c0d7216… | yes | scalar Oklab oracle exact (RGB, alpha, dims, delays/loop) |
| onebit-icon-sheet1024 | 9710eefe7092a902… | yes | 1-bit: byte equality only (no independent style oracle) |
| onebit-stencil-sheet1024 | c3f7b90ca11dd5f6… | yes | 1-bit: byte equality only (no independent style oracle) |

Exact gate (phone bytes): PASS — 12 outputs per variant. npm test / bench/equiv.mjs / palette-qa are host gates owned by the coordinator.

## Per-patch phone verdict

- C-icon: targets cold Icon 2048 FAIL, cold Icon 1024 PASS; adverse FAIL; exact PASS → phone REJECT. Desktop gate pending (desktop profiler).
- C-sprites: targets cold Stencil 2048 FAIL, cold Stencil 1024 FAIL; adverse FAIL; exact PASS → phone REJECT. Desktop gate pending (desktop profiler).
- C-seams+C-fused: targets Brightness R-G-Value 2048 PASS; adverse FAIL; exact PASS → phone REJECT. Desktop gate pending (desktop profiler).

Errors: pairs 0, exact 0. Receipts: exact-1792304849759.json, pairs-1792304675122.json; native files in native/.

## Supplementary: within-pair deltas (not the declared gate)

Every workload, including untouched palette paths, rose ~30-40% from slot 0 to 9 (e.g. tiny 11 styles 1216 -> 1708 ms) while temperature rose only 0.8 C, so per-variant medians carry drift noise. Each pair compares adjacent A and B.

| Workload | per-pair dCPU % (pairs 0-4) | median | per-pair dLT % | median |
|---|---|---:|---|---:|
| TARGET cold Icon 2048 | -15, -24, 9, -9, -8 | -9.3% | -7, -36, 6, -14, -12 | -12.5% |
| TARGET cold Stencil 2048 | -1, -11, 3, -5, -4 | -4.4% | -3, -10, 11, -5, -12 | -5.2% |
| TARGET cold Icon 1024 | -11, 4, -4, -18, -14 | -10.7% | -18, 7, -13, -20, -19 | -17.7% |
| TARGET cold Stencil 1024 | -19, 4, 4, 0, 5 | 3.7% | 8, -13, 1, -3, -1 | -1.1% |
| TARGET Brightness R-G-Value 2048 | -29, -28, -22, -34, -27 | -27.7% | -28, -39, -25, -45, -34 | -33.9% |
| ADVERSE sprites8+effect Auto import | -4, -12, -2, -11, -7 | -7.4% | - | - |
| ADVERSE kenney-sheet-1024 import | -24, 14, 11, 48, -21 | 11.0% | - | - |
| ADVERSE kenney-sheet-2048 import | 1, -10, 3, -21, 3 | 0.7% | - | - |
| ADVERSE kenney-motion-256 import | -28, -10, 9, 9, -5 | -5.0% | - | - |
| ADVERSE tiny all 11 styles | -5, -4, 3, -6, 1 | -3.6% | - | - |
| ADVERSE tiny cold Icon 16px | -2, -6, 4, 9, -9 | -2.3% | - | - |
| ADVERSE tiny cold Stencil 16px | 11, -11, -3, 7, -9 | -3.2% | - | - |
