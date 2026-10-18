# C-B5 native A/B (Pixel 8 Pro, Brave)

A = w2-base 5401, B5 = w2-b5 5405. Gate: README "C-B5", unchanged. Order A B5 B5 A A B5 B5 A A B5 B5 A A B5; fresh owned tab per trial. 1-bit Checker, default inks, Brightness Luma -> R -> G -> Value; real Style-panel Brightness buttons clicked R, G, Value (as in earlier rounds). Window = first click .. every tile painted after the last commit with non-busy counts (+2 rAF). One smoke trial on A excluded (ab-b5/smoke/).
Conditions: start: status: 2, level: 71, temperature: 323, Capacity level: 2; end: status: 4, level: 71, temperature: 326, Capacity level: 2. Per-trial C: A@32.3 B5@32.3 B5@32.3 A@32.3 A@32.3 B5@32.3 B5@32.3 A@32.6 A@32.6 B5@32.6 B5@32.6 A@32.6 A@32.6 B5@32.6. Errors: 0.

| Workload | Metric | A median | B5 median | Δ | paired Δ per pair (median) |
|---|---|---:|---:|---:|---|
| ADVERSE tiny wall Brightness R-G-Value | max Long Task | 0.0 | 0.0 | - | - |
| ADVERSE tiny wall Brightness R-G-Value | elapsed to final current paint | 374.5 | 389.1 | 3.9% | 3, 2, -0, 15, 23, 10, -10 (2.9%) |
| ADVERSE tiny wall Brightness R-G-Value | last commit → final paint | 8.1 | 8.2 | 1.2% | 29, -44, 11, 31, 19, -5, -17 (10.5%) |
| ADVERSE tiny wall Brightness R-G-Value | renderer CPU | 167.0 | 175.0 | 4.8% | 2, 1, 7, 3, 11, 2, -3 (2.2%) |
| ADVERSE tiny wall Brightness R-G-Value | max rAF gap | 25.0 | 25.1 | 0.4% | -25, 0, 98, 34, -33, 0, 1 (0.4%) |
| TARGET sheet2048 Brightness R-G-Value | max Long Task | 93.0 | 0.0 | -100.0% | -100, -100, -100, -100, -100, -100, -100 (-100.0%) |
| TARGET sheet2048 Brightness R-G-Value | elapsed to final current paint | 641.8 | 559.4 | -12.8% | -19, -14, -10, -15, -18, -14, -1 (-14.4%) |
| TARGET sheet2048 Brightness R-G-Value | last commit → final paint | 83.6 | 73.3 | -12.3% | 3, -17, -5, -14, -14, -16, -15 (-13.8%) |
| TARGET sheet2048 Brightness R-G-Value | renderer CPU | 435.7 | 369.0 | -15.3% | -17, -17, -14, -15, -11, -18, -8 (-14.7%) |
| TARGET sheet2048 Brightness R-G-Value | max rAF gap | 83.4 | 16.9 | -79.7% | -82, -80, -82, -80, -79, -82, -77 (-79.7%) |

Final captions identical across all trials: yes (ADVERSE tiny wall Brightness R-G-Value: ["16×16  ·  2 colors","16×16  ·  2 colors","16×16  ·  2 colors","16×16  ·  2 colors"]; TARGET sheet2048 Brightness R-G-Value: ["2048×2048"]). Pixel readback is not compared on native Brave (per-origin farbling); output equality rests on captions here plus host exactness checks.

## Gate verdict (phone)

- Target max Long Task -100.0% (need <= -25%): PASS
- Elapsed to final current paint -12.8% (fail if > +10%): PASS
- Tiny reanalysis floor (elapsed and CPU, 5%/3 ms): PASS
- Captions identical: PASS

C-B5 on the phone: **ACCEPT**.

## All trials (max LT / to final paint / CPU / rAF max ms)

| Workload | 0:A | 1:B5 | 2:B5 | 3:A | 4:A | 5:B5 | 6:B5 | 7:A | 8:A | 9:B5 | 10:B5 | 11:A | 12:A | 13:B5 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| ADVERSE tiny wall Brightness R-G-Value | 0/375/174/33 | 0/385/177/25 | 0/390/186/25 | 0/384/184/25 | 0/390/168/17 | 0/389/180/33 | 0/404/171/33 | 0/352/166/25 | 0/315/158/25 | 0/386/175/17 | 0/407/171/25 | 0/369/167/25 | 0/379/167/25 | 0/342/162/25 |
| TARGET sheet2048 Brightness R-G-Value | 97/714/446/92 | 0/575/369/17 | 0/562/361/17 | 92/656/433/83 | 94/611/441/92 | 0/551/381/17 | 0/545/372/17 | 93/642/436/83 | 93/613/407/83 | 0/505/361/17 | 0/580/382/17 | 99/672/467/92 | 88/564/399/75 | 0/559/369/17 |

Receipt: pairs-1792312081482.json.
