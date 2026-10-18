# C-A1 round two native A/A1 (Pixel 8 Pro, Brave)

A = w2-base 5401, A1 = w2-a1 5402. Gate: README "C-A1", unchanged; judged on Checker. Wall: four distinct 512×512 crops (wave2/fixtures/kenney-crop-a..d, hashes verified before each run), 1-bit. Same touch drag as round one: calibration taps until track geometry is stable, 300 ms press without move, 40 touchMoves 50 ms apart across 40% of the real Threshold range, touchEnd. One smoke trial on A excluded (ab-w2b/smoke/).

## checker (7 pairs, order A A1 A1 A A A1 A1 A A A1 A1 A A A1)

Conditions: start: status: 2, level: 66, temperature: 346, Capacity level: 2; end: status: 4, level: 66, temperature: 349, Capacity level: 2. Per-trial C: A@34.6 A1@34.6 A1@34.6 A@34.6 A@34.6 A1@34.6 A1@34.6 A@34.7 A@34.7 A1@34.7 A1@34.7 A@34.9 A@34.9 A1@34.9. Errors: 0.

| Metric | A median | A1 median | Δ | paired Δ per pair (median) |
|---|---:|---:|---:|---|
| renderer CPU | 974.9 | 750.2 | -23.0% | -26, -25, -20, -21, -24, -31, -23 (-24.3%) |
| max Long Task | 0.0 | 0.0 | - | - |
| max rAF gap | 25.1 | 25.0 | -0.4% | -0, 32, -0, -7, 0, 0, 9 (0.0%) |
| release→final caption | 132.4 | 143.4 | 8.3% | 10, -15, 16, 10, -5, 12, -12 (10.1%) |
| drag window elapsed | 2116.2 | 2123.4 | 0.3% | 0, -1, 0, 1, -3, 2, -0 (0.4%) |

Final captions identical in all trials: yes (["512×512  ·  2 colors","512×512  ·  2 colors","512×512  ·  2 colors","512×512  ·  2 colors"]); final slider values: 229. Press without move: no caption change, no aria-busy (5 ms polling), value unchanged in every trial.

All trials (CPU / LT / rAF max / release→caption ms):

| Slot | Variant | CPU | LT | rAF | release→caption | moves | drag ms |
|---:|---|---:|---:|---:|---:|---:|---:|
| 0 | A | 975 | 0 | 25 | 141 | 40 | 2070 |
| 1 | A1 | 724 | 0 | 25 | 156 | 40 | 2069 |
| 2 | A1 | 724 | 0 | 25 | 113 | 40 | 2057 |
| 3 | A | 970 | 0 | 19 | 132 | 40 | 2069 |
| 4 | A | 951 | 0 | 25 | 125 | 40 | 2069 |
| 5 | A1 | 766 | 0 | 25 | 146 | 40 | 2070 |
| 6 | A1 | 755 | 0 | 25 | 143 | 40 | 2071 |
| 7 | A | 960 | 0 | 27 | 130 | 40 | 2041 |
| 8 | A | 1004 | 0 | 25 | 121 | 40 | 2102 |
| 9 | A1 | 760 | 0 | 25 | 114 | 40 | 2046 |
| 10 | A1 | 689 | 0 | 25 | 150 | 40 | 2070 |
| 11 | A | 1003 | 0 | 25 | 134 | 40 | 2046 |
| 12 | A | 977 | 0 | 23 | 142 | 40 | 2070 |
| 13 | A1 | 750 | 0 | 25 | 125 | 40 | 2085 |

Receipt: pairs-checker-1792309589725.json.

## atkinson (3 pairs, order A A1 A1 A A A1)

Conditions: start: status: 4, level: 66, temperature: 349, Capacity level: 2; end: status: 4, level: 66, temperature: 348, Capacity level: 2. Per-trial C: A@34.9 A1@34.8 A1@34.8 A@34.8 A@34.8 A1@34.8. Errors: 0.

| Metric | A median | A1 median | Δ | paired Δ per pair (median) |
|---|---:|---:|---:|---|
| renderer CPU | 1227.1 | 906.9 | -26.1% | -25, -28, -31 (-27.8%) |
| max Long Task | 0.0 | 0.0 | - | - |
| max rAF gap | 33.2 | 26.5 | -20.2% | 1, -20, -21 (-20.4%) |
| release→final caption | 132.4 | 146.3 | 10.5% | 11, 2, -17 (2.2%) |
| drag window elapsed | 2122.2 | 2206.1 | 4.0% | 5, 3, -0 (3.1%) |

Final captions identical in all trials: yes (["512×512  ·  2 colors","512×512  ·  2 colors","512×512  ·  2 colors","512×512  ·  2 colors"]); final slider values: 229. Press without move: no caption change, no aria-busy (5 ms polling), value unchanged in every trial.

All trials (CPU / LT / rAF max / release→caption ms):

| Slot | Variant | CPU | LT | rAF | release→caption | moves | drag ms |
|---:|---|---:|---:|---:|---:|---:|---:|
| 0 | A | 1210 | 0 | 33 | 132 | 40 | 2066 |
| 1 | A1 | 913 | 0 | 33 | 148 | 40 | 2149 |
| 2 | A1 | 907 | 0 | 27 | 146 | 40 | 2213 |
| 3 | A | 1256 | 0 | 33 | 143 | 40 | 2135 |
| 4 | A | 1227 | 0 | 32 | 128 | 40 | 2075 |
| 5 | A1 | 850 | 0 | 25 | 106 | 40 | 2081 |

Receipt: pairs-atkinson-1792309693859.json.

## Gate verdict (phone, Checker)

- Drag-window renderer CPU -23.0% (need <= -15%): PASS
- Release→final caption not worse by >50 ms and >20%: PASS
- Final captions identical: PASS
- Press without move unchanged: PASS

C-A1 on the phone: **ACCEPT**. Atkinson (informational): CPU -26.1%, release ok, captions identical, press ok.
