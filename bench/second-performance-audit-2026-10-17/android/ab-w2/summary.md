# Wave-two native A/A1/B4 (Pixel 8 Pro, Brave)

A = w2-base 5401, A1 = w2-a1 5402 (C-A1), B4 = w2-b4 5403 (C-B4); builds from 0c61dd0. Gates: README "Wave-two candidates and gates", unchanged.
Triples: A A1 B4 / B4 A1 A / A1 A B4 / B4 A A1 / A B4 A1 / A1 B4 A / A A1 B4. Fresh owned tab per trial; every trial runs every workload (each candidate is the other's control).
Fixtures: drag wall dungeon-wizard, dungeon-archer, dungeon-knight, dungeon-potion, kenney-sheet-1024 (4 distinct 16px sprites + sheet1024; Checker). Tiny Save dungeon-knight; below-threshold threshold255 synthetic (8bpp, 65280 row bytes); above-threshold kenney-sheet-1024, kenney-sheet-2048. Palette Saves: fixed Resurrect 64, Oklab, no cap.
Drag: CDP Input touch on the real Threshold range: calibration taps until track geometry is stable, press 300 ms without moving, then 40 touchMoves 50 ms apart across 40% of the track and touchEnd. Drag window = touchStart..touchEnd + 2 rAF. release→caption = slider pointerup/touchend to every count non-busy with a number (polled per rAF). click→download = in-page Save click to the app's download anchor click.
Conditions: start: status: 2, level: 66, temperature: 328, Capacity level: 2; end: status: 4, level: 66, temperature: 347, Capacity level: 2. Per-trial C: A@32.9 A1@32.9 B4@33.3 B4@33.1 A1@33.1 A@33.1 A1@33.4 A@33.6 B4@33.6 B4@33.8 A@33.8 A1@33.9 A@34.1 B4@34.1 A1@34.1 A1@34.3 B4@34.3 A@34.3 A@34.3 A1@34.7 B4@34.7. Errors: 0. Two smoke trials on A before the run are excluded (ab-w2/smoke/).

## A1 vs A (medians of 7; paired = within-triple % deltas)

| Workload | Metric | A | A1 | Δ | paired Δ (median) |
|---|---|---:|---:|---:|---|
| A1 TARGET Threshold drag window | CPU | 589.2 | 524.7 | -10.9% | -13,-8,-17,-9,-9,-17,-5 (-9.0%) |
| A1 TARGET Threshold drag window | LT | 0.0 | 0.0 | - | - |
| A1 TARGET Threshold drag window | rAF max | 18.1 | 18.0 | -0.6% | -30,37,-23,-1,25,0,11 (0.0%) |
| A1 TARGET Threshold drag window | release→caption | 145.2 | 138.9 | -4.3% | -2,-13,6,-5,40,-22,2 (-2.4%) |
| B4 TARGET tiny palette Save | CPU | 68.1 | 73.0 | 7.1% | 15,27,29,7,4,-5,-2 (6.9%) |
| B4 TARGET tiny palette Save | click→download | 66.4 | 68.2 | 2.7% | 3,72,30,6,7,-5,-2 (6.2%) |
| B4 TARGET tiny palette Save | LT | 0.0 | 0.0 | - | - |
| B4 ADVERSE below-threshold 255px palette Save | CPU | 86.6 | 84.8 | -2.0% | -13,-2,3,1,2,22,-4 (0.9%) |
| B4 ADVERSE below-threshold 255px palette Save | click→download | 97.5 | 102.1 | 4.7% | -7,6,8,12,-3,-5,-6 (-3.3%) |
| B4 ADVERSE below-threshold 255px palette Save | LT | 0.0 | 0.0 | - | - |
| B4 ADVERSE sheet1024 palette Save | CPU | 98.5 | 100.2 | 1.7% | 2,14,-5,2,-6,7,7 (1.9%) |
| B4 ADVERSE sheet1024 palette Save | click→download | 133.4 | 140.8 | 5.5% | 0,13,-5,4,-10,13,6 (3.7%) |
| B4 ADVERSE sheet1024 palette Save | LT | 0.0 | 0.0 | - | - |
| B4 ADVERSE sheet2048 palette Save | CPU | 154.4 | 154.4 | 0.0% | -5,0,9,-9,-3,-8,6 (-3.4%) |
| B4 ADVERSE sheet2048 palette Save | click→download | 266.0 | 269.0 | 1.1% | 3,2,5,-4,-9,-6,19 (2.3%) |
| B4 ADVERSE sheet2048 palette Save | LT | 0.0 | 0.0 | - | - |

## B4 vs A (medians of 7; paired = within-triple % deltas)

| Workload | Metric | A | B4 | Δ | paired Δ (median) |
|---|---|---:|---:|---:|---|
| A1 TARGET Threshold drag window | CPU | 589.2 | 593.0 | 0.6% | 2,-1,-8,5,-3,-1,1 (-0.9%) |
| A1 TARGET Threshold drag window | LT | 0.0 | 0.0 | - | - |
| A1 TARGET Threshold drag window | rAF max | 18.1 | 18.7 | 3.3% | -26,41,-25,23,3,15,3 (3.4%) |
| A1 TARGET Threshold drag window | release→caption | 145.2 | 132.6 | -8.7% | -9,-1,-0,-13,18,-3,-6 (-2.5%) |
| B4 TARGET tiny palette Save | CPU | 68.1 | 54.4 | -20.1% | -29,-37,-11,-51,-16,-17,-17 (-17.4%) |
| B4 TARGET tiny palette Save | click→download | 66.4 | 25.2 | -62.0% | -65,-60,-55,-76,-57,-62,-64 (-61.6%) |
| B4 TARGET tiny palette Save | LT | 0.0 | 0.0 | - | - |
| B4 ADVERSE below-threshold 255px palette Save | CPU | 86.6 | 88.9 | 2.7% | -14,43,0,27,-12,14,15 (14.0%) |
| B4 ADVERSE below-threshold 255px palette Save | click→download | 97.5 | 71.6 | -26.6% | -36,14,-22,2,-35,-31,-27 (-26.7%) |
| B4 ADVERSE below-threshold 255px palette Save | LT | 0.0 | 0.0 | - | - |
| B4 ADVERSE sheet1024 palette Save | CPU | 98.5 | 108.8 | 10.5% | 14,-2,3,13,18,0,-0 (3.0%) |
| B4 ADVERSE sheet1024 palette Save | click→download | 133.4 | 133.1 | -0.2% | 13,4,-2,1,11,-2,-12 (0.9%) |
| B4 ADVERSE sheet1024 palette Save | LT | 0.0 | 0.0 | - | - |
| B4 ADVERSE sheet2048 palette Save | CPU | 154.4 | 148.3 | -3.9% | -14,-3,6,-15,6,-11,4 (-3.4%) |
| B4 ADVERSE sheet2048 palette Save | click→download | 266.0 | 270.1 | 1.5% | 4,2,7,-11,3,-1,0 (2.5%) |
| B4 ADVERSE sheet2048 palette Save | LT | 0.0 | 0.0 | - | - |

## Exactness

- Final drag captions identical across all 21 trials: yes (["16×16  ·  2 colors","16×16  ·  2 colors","16×16  ·  2 colors","16×16  ·  2 colors","1024×1024"]); final slider value set: 220.
- Press without move: no caption change, no aria-busy observed (5 ms polling), value unchanged in every trial.
- Native Save bytes identical across A/A1/B4 for every workload and trial: yes (TARGET tiny palette Save: 1 hash; ADVERSE below-threshold 255px palette Save: 1 hash; ADVERSE sheet1024 palette Save: 1 hash; ADVERSE sheet2048 palette Save: 1 hash).

## Gate verdicts (phone)

- **C-A1**: drag-window CPU -10.9% (need <= -15%) FAIL; release→caption 145.2→138.9 ms PASS (fail only if >50 ms and >20% worse); captions identical PASS; press-without-move PASS; Save controls floor FAIL → phone **REJECT**.
- **C-B4**: tiny click→download -62.0% (need <= -15%) PASS; 255px below-threshold max LT Δ 0.0 ms (need <= +5) PASS; sheet1024/2048 Save + drag control floor FAIL; bytes PASS → phone **REJECT**.

Desktop gates and npm test are owned by others.

## All trials

| Workload | Metric | 0:A | 1:A1 | 2:B4 | 3:B4 | 4:A1 | 5:A | 6:A1 | 7:A | 8:B4 | 9:B4 | 10:A | 11:A1 | 12:A | 13:B4 | 14:A1 | 15:A1 | 16:B4 | 17:A | 18:A | 19:A1 | 20:B4 |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| A1 TARGET Threshold drag window | CPU | 579 | 502 | 593 | 605 | 563 | 611 | 499 | 601 | 555 | 603 | 576 | 525 | 589 | 570 | 536 | 503 | 600 | 606 | 576 | 549 | 583 |
| A1 TARGET Threshold drag window | LT | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| A1 TARGET Threshold drag window | rAF max | 24 | 17 | 18 | 25 | 24 | 18 | 18 | 23 | 17 | 22 | 18 | 18 | 18 | 19 | 23 | 18 | 20 | 18 | 18 | 20 | 18 |
| A1 TARGET Threshold drag window | release→caption | 146 | 143 | 133 | 148 | 130 | 149 | 139 | 131 | 131 | 110 | 127 | 121 | 103 | 122 | 145 | 113 | 142 | 145 | 146 | 149 | 138 |
| B4 TARGET tiny palette Save | CPU | 71 | 81 | 50 | 51 | 103 | 81 | 88 | 68 | 60 | 33 | 68 | 73 | 68 | 57 | 71 | 65 | 56 | 68 | 66 | 65 | 54 |
| B4 TARGET tiny palette Save | click→download | 65 | 67 | 23 | 24 | 103 | 60 | 87 | 67 | 30 | 16 | 66 | 71 | 63 | 27 | 67 | 64 | 26 | 67 | 70 | 68 | 25 |
| B4 TARGET tiny palette Save | LT | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| B4 ADVERSE below-threshold 255px palette Save | CPU | 95 | 83 | 82 | 124 | 85 | 87 | 85 | 83 | 83 | 106 | 84 | 84 | 98 | 86 | 100 | 95 | 89 | 78 | 87 | 84 | 100 |
| B4 ADVERSE below-threshold 255px palette Save | click→download | 110 | 102 | 71 | 113 | 105 | 99 | 102 | 95 | 74 | 96 | 94 | 105 | 111 | 72 | 107 | 92 | 67 | 98 | 96 | 91 | 71 |
| B4 ADVERSE below-threshold 255px palette Save | LT | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| B4 ADVERSE sheet1024 palette Save | CPU | 95 | 97 | 109 | 96 | 112 | 98 | 100 | 106 | 109 | 111 | 98 | 100 | 108 | 127 | 101 | 109 | 102 | 102 | 88 | 94 | 87 |
| B4 ADVERSE sheet1024 palette Save | click→download | 135 | 136 | 154 | 133 | 144 | 128 | 142 | 149 | 146 | 127 | 126 | 131 | 144 | 160 | 131 | 150 | 129 | 132 | 133 | 141 | 118 |
| B4 ADVERSE sheet1024 palette Save | LT | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| B4 ADVERSE sheet2048 palette Save | CPU | 167 | 158 | 144 | 149 | 154 | 154 | 153 | 140 | 148 | 143 | 170 | 154 | 151 | 160 | 146 | 155 | 148 | 167 | 146 | 154 | 152 |
| B4 ADVERSE sheet2048 palette Save | click→download | 263 | 271 | 272 | 278 | 277 | 271 | 257 | 243 | 259 | 250 | 280 | 269 | 266 | 273 | 241 | 256 | 270 | 272 | 258 | 306 | 258 |
| B4 ADVERSE sheet2048 palette Save | LT | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

Receipt: triples-1792308986301.json; native outputs in ab-w2/native/.

## Floor failures in detail (strict medians; decision left to the coordinator)

- C-A1 controls: tiny palette Save CPU 68.1→73.0 ms (+7.1%, +4.9 ms; paired +6.9%) and sheet1024 Save click→download 133.4→140.8 ms (+5.5%, +7.4 ms; paired +3.7%). A1 changes only 1-bit Tile counting while dragging, so these palette-Save paths are untouched; this is variation. The C-A1 target fails anyway: −10.9% median, −9.0% paired, against a −15% requirement.
- C-B4: sheet1024 Save CPU 98.5→108.8 ms (+10.5%, +10.3 ms). The paired median is +3.0% and click→download is −0.2%. sheet1024 rows exceed 64 KiB, so B4 leaves that path unchanged, as the identical bytes and elapsed time show. The README's own B4 checks pass: sheet2048 Save CPU −3.9%, elapsed +1.5% (+4 ms); the 255px below-threshold max Long Task Δ is 0 ms (elapsed −26.6%, CPU +2.7%).
