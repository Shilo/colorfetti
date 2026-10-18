# C-B1 native A/B (Pixel 8 Pro, Brave)

A = w2-base 5401, B1 = w2-b1 5404. Gate: README "C-B1" + coordinator floors, unchanged. Order A B1 B1 A A B1 B1 A A B1 B1 A A B1; fresh owned tab per trial. Settings: Resurrect 64, Oklab nearest, dither none, Cleanup off, alpha cut 128. Max colors set through the real number field (input then change events dispatched on it, invoking the app's handlers); step time = commit to every caption non-busy with count <= cap and every tile painted after the commit. Import time = paste dispatch to every exact caption. One smoke trial on A excluded (ab-b1/smoke/).
Conditions: start: status: 2, level: 66, temperature: 351, Capacity level: 2; end: status: 4, level: 66, temperature: 352, Capacity level: 2. Per-trial C: A@35.1 B1@35.1 B1@35.1 A@35.1 A@35.1 B1@35.1 B1@35.1 A@35.1 A@35.1 B1@35.2 B1@35.2 A@35.2 A@35.2 B1@35.2. Errors: 0.

| Workload | Metric | A median | B1 median | Δ | paired Δ per pair (median) |
|---|---|---:|---:|---:|---|
| ADVERSE tiny wall import | elapsed to exact | 80.9 | 75.5 | -6.7% | -21, 26, 8, 7, 25, -20, -26 (6.9%) |
| ADVERSE tiny wall import | renderer CPU | 66.6 | 64.4 | -3.2% | -23, 9, -13, 7, 10, -14, -4 (-4.0%) |
| ADVERSE tiny wall import | max Long Task | 0.0 | 0.0 | - | - |
| ADVERSE tiny wall Max colors 2 | elapsed to exact | 93.4 | 86.3 | -7.6% | -8, 0, -5, -5, -10, -17, -10 (-7.6%) |
| ADVERSE tiny wall Max colors 2 | renderer CPU | 64.5 | 58.6 | -9.1% | -13, 15, -7, -25, 20, -15, 4 (-7.3%) |
| ADVERSE tiny wall Max colors 2 | max Long Task | 0.0 | 0.0 | - | - |
| ADVERSE tiny wall Max colors 4 | elapsed to exact | 38.5 | 38.2 | -0.8% | 3, 0, -13, 3, -10, -7, -16 (-6.8%) |
| ADVERSE tiny wall Max colors 4 | renderer CPU | 26.9 | 28.1 | 4.4% | 9, 12, -4, 20, -0, 8, -20 (7.8%) |
| ADVERSE tiny wall Max colors 4 | max Long Task | 0.0 | 0.0 | - | - |
| ADVERSE tiny wall Max colors 8 | elapsed to exact | 31.5 | 30.3 | -3.8% | 31, -27, 13, -1, -22, -9, 8 (-0.6%) |
| ADVERSE tiny wall Max colors 8 | renderer CPU | 29.0 | 25.6 | -11.6% | 60, -15, -13, -2, -3, -16, -33 (-12.7%) |
| ADVERSE tiny wall Max colors 8 | max Long Task | 0.0 | 0.0 | - | - |
| ADVERSE tiny wall Max colors 2-4-8 total | elapsed to exact | 163.1 | 158.2 | -3.0% | 2, -5, -4, -2, -12, -13, -8 (-5.0%) |
| ADVERSE tiny wall Max colors 2-4-8 total | renderer CPU | 119.2 | 117.1 | -1.8% | 6, 7, -8, -10, 10, -10, -11 (-7.7%) |
| ADVERSE tiny wall Max colors 2-4-8 total | max Long Task | 0.0 | 0.0 | - | - |
| ADVERSE Auto 8 sprites+effect import | elapsed to exact | 187.4 | 175.4 | -6.4% | -6, 3, -10, -10, -2, -5, 1 (-5.3%) |
| ADVERSE Auto 8 sprites+effect import | renderer CPU | 120.5 | 119.8 | -0.6% | 1, 7, -3, -4, -4, -3, 1 (-2.6%) |
| ADVERSE Auto 8 sprites+effect import | max Long Task | 0.0 | 0.0 | - | - |
| ADVERSE sheet2048 import | elapsed to exact | 309.8 | 308.8 | -0.3% | -14, -3, 9, -4, 7, 4, -7 (-2.7%) |
| ADVERSE sheet2048 import | renderer CPU | 155.8 | 146.9 | -5.7% | -12, -18, 1, -9, 12, 16, -8 (-8.2%) |
| ADVERSE sheet2048 import | max Long Task | 0.0 | 0.0 | - | - |
| TARGET sheet2048 Max colors 2 | elapsed to exact | 278.0 | 108.6 | -60.9% | -63, -57, -60, -55, -66, -61, -60 (-59.8%) |
| TARGET sheet2048 Max colors 2 | renderer CPU | 92.1 | 74.3 | -19.3% | -29, -19, -27, -16, -15, -20, -23 (-19.7%) |
| TARGET sheet2048 Max colors 2 | max Long Task | 0.0 | 0.0 | - | - |
| TARGET sheet2048 Max colors 4 | elapsed to exact | 243.4 | 51.2 | -79.0% | -80, -83, -77, -79, -78, -81, -78 (-79.0%) |
| TARGET sheet2048 Max colors 4 | renderer CPU | 70.4 | 40.8 | -42.0% | -36, -56, -33, -46, -38, -43, -43 (-43.0%) |
| TARGET sheet2048 Max colors 4 | max Long Task | 0.0 | 0.0 | - | - |
| TARGET sheet2048 Max colors 8 | elapsed to exact | 251.5 | 48.6 | -80.7% | -84, -84, -84, -79, -81, -78, -78 (-80.6%) |
| TARGET sheet2048 Max colors 8 | renderer CPU | 74.4 | 44.9 | -39.7% | -52, -57, -53, -35, -37, -33, -40 (-39.6%) |
| TARGET sheet2048 Max colors 8 | max Long Task | 0.0 | 0.0 | - | - |
| TARGET sheet2048 Max colors 2-4-8 total | elapsed to exact | 791.9 | 208.0 | -73.7% | -75, -75, -73, -71, -74, -73, -71 (-73.0%) |
| TARGET sheet2048 Max colors 2-4-8 total | renderer CPU | 241.0 | 159.4 | -33.9% | -38, -44, -37, -31, -28, -31, -34 (-33.7%) |
| TARGET sheet2048 Max colors 2-4-8 total | max Long Task | 0.0 | 0.0 | - | - |

Final captions identical across all trials for every step: yes. Native Save sheet2048 @ Max colors 8 (pairs 0-1, 4 files): identical bytes.

## Gate verdict (phone)

- Target Max colors 2→4→8 on sheet2048 elapsed to final paint/caption -73.7% (need <= -15%): PASS
- ADVERSE tiny wall Max colors 2-4-8 total (elapsed and CPU floor 5%/3 ms): PASS
- ADVERSE Auto 8 sprites+effect import (elapsed and CPU floor 5%/3 ms): PASS
- ADVERSE sheet2048 import (elapsed and CPU floor 5%/3 ms): PASS
- Exact (captions, bytes): PASS

C-B1 on the phone: **ACCEPT**. Retained-memory bound is a source/desktop check, not measured here.

## All trials (elapsed / CPU ms)

| Workload | 0:A | 1:B1 | 2:B1 | 3:A | 4:A | 5:B1 | 6:B1 | 7:A | 8:A | 9:B1 | 10:B1 | 11:A | 12:A | 13:B1 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| ADVERSE tiny wall import | 87/70 | 69/54 | 85/64 | 67/59 | 78/73 | 84/63 | 68/66 | 63/62 | 81/65 | 101/72 | 65/57 | 81/67 | 103/75 | 76/72 |
| ADVERSE tiny wall Max colors 2 | 93/67 | 86/59 | 84/64 | 84/56 | 91/63 | 86/58 | 87/48 | 92/64 | 99/58 | 90/70 | 84/56 | 101/66 | 108/84 | 97/87 |
| ADVERSE tiny wall Max colors 4 | 36/27 | 37/29 | 52/39 | 51/34 | 44/29 | 38/28 | 38/32 | 37/26 | 29/25 | 26/24 | 36/28 | 39/26 | 48/34 | 41/27 |
| ADVERSE tiny wall Max colors 8 | 32/22 | 42/35 | 23/25 | 32/29 | 27/29 | 30/26 | 35/29 | 36/29 | 26/23 | 20/23 | 21/21 | 23/25 | 36/39 | 39/26 |
| ADVERSE tiny wall Max colors 2-4-8 total | 161/117 | 165/123 | 158/127 | 166/119 | 161/122 | 155/112 | 161/108 | 165/120 | 154/106 | 136/117 | 142/105 | 163/117 | 192/157 | 176/140 |
| ADVERSE Auto 8 sprites+effect import | 172/113 | 162/114 | 175/118 | 170/111 | 172/110 | 155/107 | 175/120 | 194/125 | 197/129 | 193/124 | 180/122 | 190/125 | 187/120 | 188/122 |
| ADVERSE sheet2048 import | 292/144 | 250/127 | 309/146 | 317/178 | 308/156 | 335/158 | 299/147 | 311/162 | 310/162 | 332/182 | 321/165 | 310/143 | 314/153 | 292/140 |
| TARGET sheet2048 Max colors 2 | 298/108 | 112/76 | 106/72 | 246/90 | 288/102 | 116/74 | 121/77 | 268/92 | 320/87 | 109/74 | 108/71 | 278/89 | 260/97 | 105/75 |
| TARGET sheet2048 Max colors 4 | 256/72 | 52/46 | 47/41 | 269/93 | 220/66 | 51/44 | 51/38 | 243/70 | 243/69 | 52/43 | 51/41 | 262/72 | 230/69 | 50/39 |
| TARGET sheet2048 Max colors 8 | 255/79 | 41/37 | 45/36 | 279/84 | 255/80 | 41/38 | 51/45 | 245/69 | 250/71 | 49/45 | 55/47 | 252/70 | 229/74 | 51/45 |
| TARGET sheet2048 Max colors 2-4-8 total | 809/258 | 204/159 | 197/149 | 793/266 | 764/248 | 208/156 | 223/161 | 757/232 | 813/227 | 210/162 | 214/159 | 792/231 | 718/241 | 205/160 |

Receipt: pairs-1792309924756.json; native files in ab-b1/native/.
