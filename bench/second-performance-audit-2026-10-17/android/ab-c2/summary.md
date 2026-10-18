# Candidate C round two native A/B/B (Pixel 8 Pro, Brave)

A = base-repro 5381, B1 = cand-analyze 5383 (C-seams+C-fused), B2 = cand-icon 5384 (C-icon). Gates: README "Candidate C", unchanged.
Triples (order recorded): A B1 B2 / B2 B1 A / B1 A B2 / B2 A B1 / A B2 B1 / B1 B2 A / A B1 B2. Positions: A 3/2/2, B1 2/3/2, B2 2/2/3 (first/second/third).
Fresh owned tab per trial; every trial runs every workload, each after reload + fresh import (B1 workloads on B2 and B2 workloads on B1 serve as untouched-path controls). Palette imports use the paste route; exact caption = paste dispatch to every caption count non-busy with a number (includes worker analysis outside renderer CPU).
Device: other apps/Brave tabs closed by the user before round one; Brave PID 32363 verified before the batch. Rest relaxed by coordinator (charging phone could not reach 35 C): rested 7.4 min, started at 35.6 C (rule: <=36.0 C or 10 min). Conditions: start: status: 2, level: 60, temperature: 356, Capacity level: 2; end: status: 4, level: 60, temperature: 376, Capacity level: 2. Per-trial C: A@35.6 B1@35.6 B2@35.7 B2@35.6 B1@35.7 A@35.7 B1@35.9 A@36.1 B2@36.1 B2@36.1 A@36.1 B1@36.6 A@36.6 B2@36.6 B1@36.6 B1@37.1 B2@37.1 A@37.4 A@37.4 B1@37.6 B2@37.6. Errors: 0. Judge only from these triples.

## B1 vs A

| Workload | A CPU | B1 CPU | dCPU | paired dCPU (median) | A LT | B1 LT | dLT | paired dLT | A caption ms | B1 caption ms | dCaption | Gate |
|---|---:|---:|---:|---|---:|---:|---:|---|---:|---:|---:|---|
| TARGET Brightness R-G-Value 2048 | 611.4 | 429.9 | -29.7% | -34,-34,-32,-28,-23,-26,-30 (-29.7%) | 162 | 111 | -31.5% | -32,-37,-38,-29,-22,-24,-31 (-31.5%) | - | - | - | >=10% better median CPU or LT: **PASS** |
| ADVERSE sprites8+effect Auto import | 116.5 | 117.1 | 0.4% | 15,-26,-1,6,10,5,2 (4.8%) | 0 | 0 | - | - | 230 | 221 | -4.1% | CPU not >5% and >3ms worse: **PASS** |
| ADVERSE kenney-sheet-1024 import | 163.0 | 153.5 | -5.9% | -27,-18,-6,-5,4,-10,-15 (-10.3%) | 0 | 0 | - | - | 321 | 312 | -2.7% | CPU not >5% and >3ms worse: **PASS** |
| ADVERSE kenney-sheet-2048 import | 192.7 | 204.5 | 6.1% | 20,2,-24,7,-8,7,29 (7.1%) | 0 | 0 | - | - | 445 | 420 | -5.7% | CPU not >5% and >3ms worse: **FAIL** |

Control (B2's patch is absent from B1; B2 workloads on B1 vs A, median dCPU): TARGET cold Icon 2048 0.9%; TARGET cold Icon 1024 4.9%; ADVERSE tiny all 11 styles -3.1%; ADVERSE tiny cold Icon 16px -3.5%

## B2 vs A

| Workload | A CPU | B2 CPU | dCPU | paired dCPU (median) | A LT | B2 LT | dLT | paired dLT | A caption ms | B2 caption ms | dCaption | Gate |
|---|---:|---:|---:|---|---:|---:|---:|---|---:|---:|---:|---|
| TARGET cold Icon 2048 | 807.0 | 757.2 | -6.2% | -10,-20,4,-6,-6,4,-14 (-6.3%) | 561 | 475 | -15.3% | -7,-29,-6,-9,-15,1,-25 (-9.2%) | - | - | - | >=10% better median CPU or LT: **PASS** |
| TARGET cold Icon 1024 | 458.7 | 433.0 | -5.6% | -3,-16,-1,-29,32,-11,31 (-3.5%) | 219 | 208 | -5.0% | -18,-24,-0,-41,53,-20,58 (-17.8%) | - | - | - | >=10% better median CPU or LT: **FAIL** |
| ADVERSE tiny all 11 styles | 1623.1 | 1611.9 | -0.7% | -13,-4,2,-4,-1,7,-4 (-4.0%) | 0 | 0 | - | - | - | - | - | CPU not >5% and >3ms worse: **PASS** |
| ADVERSE tiny cold Icon 16px | 190.9 | 192.1 | 0.7% | 24,-17,1,-12,0,7,11 (1.1%) | 0 | 0 | - | - | - | - | - | CPU not >5% and >3ms worse: **PASS** |

Control (B1's patch is absent from B2; B1 workloads on B2 vs A, median dCPU): TARGET Brightness R-G-Value 2048 -0.0%; ADVERSE sprites8+effect Auto import -3.5%; ADVERSE kenney-sheet-1024 import -6.2%; ADVERSE kenney-sheet-2048 import 1.3%

## Verdict (phone, declared gates)

- C-seams+C-fused (B1): targets Brightness R-G-Value 2048 PASS; adverse FAIL (kenney-sheet-2048 import); exact bytes PASS (round one). Phone: **REJECT**.
- C-icon (B2): targets cold Icon 2048 PASS, cold Icon 1024 FAIL; adverse PASS; exact bytes PASS (round one). Phone: **REJECT**.

## All trials (CPU ms / max LT ms [/ exact caption ms])

| Workload | 0:A | 1:B1 | 2:B2 | 3:B2 | 4:B1 | 5:A | 6:B1 | 7:A | 8:B2 | 9:B2 | 10:A | 11:B1 | 12:A | 13:B2 | 14:B1 | 15:B1 | 16:B2 | 17:A | 18:A | 19:B1 | 20:B2 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| onebit-sheet2048-for-Icon import | 143/60 | 161/63 | 192/69 | 156/58 | 157/59 | 151/60 | 155/65 | 213/81 | 236/84 | 212/85 | 242/89 | 236/78 | 193/80 | 204/72 | 227/76 | 173/70 | 203/83 | 155/70 | 217/80 | 167/70 | 220/82 |
| B2 TARGET cold Icon 2048 | 693/445 | 674/435 | 621/416 | 593/343 | 632/385 | 742/484 | 733/482 | 854/602 | 890/568 | 793/521 | 846/574 | 869/578 | 807/561 | 757/475 | 865/591 | 838/543 | 830/536 | 801/533 | 879/610 | 814/534 | 756/459 |
| onebit-sheet1024-for-Icon import | 98/51 | 107/60 | 92/0 | 93/0 | 119/73 | 101/52 | 120/60 | 128/69 | 143/84 | 149/83 | 125/69 | 117/64 | 142/81 | 141/82 | 161/96 | 145/82 | 115/57 | 139/79 | 129/70 | 154/86 | 148/80 |
| B2 TARGET cold Icon 1024 | 433/253 | 456/238 | 418/208 | 321/130 | 434/237 | 383/171 | 439/206 | 494/237 | 489/236 | 433/188 | 613/320 | 587/293 | 440/204 | 578/312 | 481/212 | 505/231 | 416/171 | 466/215 | 459/219 | 536/271 | 600/346 |
| onebit-sheet2048-for-brightness import | 143/0 | 117/0 | 128/0 | 136/0 | 135/0 | 154/0 | 134/0 | 167/0 | 163/50 | 145/0 | 149/0 | 167/55 | 152/50 | 177/0 | 169/0 | 164/56 | 171/54 | 162/0 | 156/0 | 169/0 | 161/0 |
| B1 TARGET Brightness R-G-Value 2048 | 468/116 | 310/79 | 418/111 | 413/120 | 316/82 | 477/130 | 415/104 | 612/169 | 630/175 | 611/168 | 635/173 | 456/122 | 567/152 | 612/167 | 434/118 | 463/126 | 627/164 | 630/166 | 611/162 | 430/111 | 607/166 |
| B1 ADVERSE sprites8+effect Auto import | 93/0/195 | 107/0/201 | 112/0/172 | 95/0/195 | 104/0/184 | 141/0/234 | 115/0/202 | 117/0/230 | 111/0/230 | 128/0/290 | 117/0/234 | 125/0/242 | 107/0/218 | 113/0/237 | 117/0/250 | 117/0/221 | 118/0/235 | 112/0/230 | 117/0/219 | 120/0/235 | 147/0/242 |
| B1 ADVERSE kenney-sheet-1024 import | 123/0/259 | 90/0/213 | 97/0/223 | 109/0/240 | 105/0/255 | 128/0/279 | 153/0/257 | 163/0/321 | 165/0/336 | 114/0/325 | 168/0/312 | 160/0/335 | 137/0/368 | 160/0/290 | 144/0/312 | 159/0/362 | 176/0/337 | 177/0/333 | 190/0/353 | 161/0/326 | 153/0/312 |
| B1 ADVERSE kenney-sheet-2048 import | 140/0/385 | 169/0/399 | 139/0/327 | 175/0/437 | 153/0/359 | 150/0/382 | 156/0/435 | 206/0/472 | 205/0/507 | 215/0/451 | 200/0/484 | 215/0/456 | 221/0/445 | 181/0/442 | 205/0/411 | 206/0/448 | 195/0/441 | 193/0/434 | 170/0/456 | 220/0/420 | 213/0/453 |
| B2 ADVERSE tiny all 11 styles | 1289/0 | 1326/0 | 1127/0 | 1309/0 | 1276/0 | 1369/0 | 1573/0 | 1623/0 | 1651/0 | 1607/0 | 1675/0 | 1599/0 | 1626/0 | 1617/0 | 1542/0 | 1654/0 | 1612/0 | 1505/0 | 1680/0 | 1588/0 | 1613/0 |
| B2 ADVERSE tiny cold Icon 16px | 138/0 | 137/0 | 171/0 | 142/0 | 168/0 | 172/0 | 191/0 | 191/0 | 193/0 | 171/0 | 195/0 | 195/0 | 192/0 | 192/0 | 180/0 | 184/0 | 193/0 | 181/0 | 193/0 | 186/0 | 214/0 |

Caption texts (trial 0): ADVERSE sprites8+effect Auto import: 9 colors,8 colors,8 colors,7 colors,9 colors,7 colors,7 colors,3 colors,33 colors; ADVERSE kenney-sheet-1024 import: 26 colors; ADVERSE kenney-sheet-2048 import: 26 colors. Receipt: triples-1792305658566.json.
