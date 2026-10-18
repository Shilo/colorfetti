# Fresh native baseline receipts

These are observed baseline workflows, not candidate gains or universal budgets.
Task CPU is renderer-only; elapsed includes UI/observation/native download transport.

## baseline-editor-extended-overbudget-teardown-failure-fallback-wholeapp-baseline-1792300814711.json

Native viewport 448×819, DPR 2.25, portrait-primary.

| Stage | Task CPU ms | Elapsed ms | Max long task ms | Max rAF gap ms |
|---|---:|---:|---:|---:|

Native output files verified: 0. Errors: 1.

Error classified by investigation below; failed stages are not reported as passed.

## baseline-editor-extended-overbudget-teardown-failure-fallback-wholeapp-baseline-1792300827121.json

Native viewport 448×819, DPR 2.25, portrait-primary.

| Stage | Task CPU ms | Elapsed ms | Max long task ms | Max rAF gap ms |
|---|---:|---:|---:|---:|
| palette editor open paste 256 colors keyboard Review page close | 585.33 | 1230.2 | 187.0 | 183.4 |
| closed editor empty wall idle | 69.90 | 1066.9 | 0.0 | 16.8 |
| transparent32: input import to current named wall paint | 52.47 | 155.4 | 0.0 | 16.7 |
| transparent32: native Save including download manager | 240.25 | 1007.8 | 0.0 | 41.9 |
| silhouette32: input import to current named wall paint | 50.96 | 135.4 | 0.0 | 16.7 |
| silhouette32: native Save including download manager | 247.44 | 1222.8 | 0.0 | 33.1 |
| partial-glow64: input import to current named wall paint | 46.56 | 95.6 | 0.0 | 16.7 |
| partial-glow64: native Save including download manager | 192.09 | 871.2 | 0.0 | 25.0 |
| boundary4096: input import to current named wall paint | 57.54 | 120.7 | 0.0 | 16.8 |
| boundary4096: cap replacements2to4to8 Cleanup on-off | 270.70 | 1010.3 | 0.0 | 16.8 |
| boundary4097: input import to current named wall paint | 114.65 | 214.1 | 0.0 | 25.0 |
| boundary4097: cap replacements2to4to8 Cleanup on-off | 202.42 | 769.0 | 0.0 | 17.0 |
| entropy512: input import to current named wall paint | 209.40 | 283.2 | 0.0 | 16.7 |
| entropy512: native Save including download manager | 396.24 | 1259.7 | 0.0 | 33.5 |
| entropy512: RGB dither8 replaced4 final current count | 1586.07 | 1982.2 | 0.0 | 266.4 |
| overbudget: input import to current named wall paint | 134.02 | 420.0 | 0.0 | 16.8 |
| 384x384x48 over8MiB index budget converted playback | 878.61 | 8948.8 | 0.0 | 17.2 |
| teardown0: input import to current named wall paint | 57.83 | 124.9 | 0.0 | 16.7 |
| teardown1: input import to current named wall paint | 57.98 | 103.9 | 0.0 | 25.0 |
| teardown2: input import to current named wall paint | 49.37 | 80.7 | 0.0 | 16.7 |
| teardown3: input import to current named wall paint | 54.48 | 99.6 | 0.0 | 16.7 |
| teardown4: input import to current named wall paint | 61.79 | 102.8 | 0.0 | 16.7 |
| teardown5: input import to current named wall paint | 35.99 | 87.1 | 0.0 | 16.7 |
| post six import/remove cycles demo idle | 73.12 | 1065.8 | 0.0 | 16.8 |
| failure-limit: input import to current named wall paint | 89.15 | 174.4 | 0.0 | 16.7 |
| limit: injected worker fetch failure gates Save and Retry recovers | 177.94 | 635.0 | 0.0 | 16.9 |
| failure-cleanup: input import to current named wall paint | 67.60 | 159.0 | 0.0 | 16.8 |
| cleanup: injected worker fetch failure gates Save and Retry recovers | 197.31 | 661.0 | 0.0 | 16.9 |
| worker-unavailable: input import to current named wall paint | 63.57 | 135.7 | 0.0 | 16.7 |
| worker unavailable genuine GIF: native Save including download manager | 158.74 | 1083.7 | 0.0 | 25.0 |

Native output files verified: 5. Errors: 0.

Profile summary, entropy512: RGB dither8 replaced4 final current count:

- Sa index-8I8UNd-r.js:2: 502.25 ms self-sample
- Aa index-8I8UNd-r.js:2: 438.85 ms self-sample
- (idle) :-1: 394.28 ms self-sample
- (program) :-1: 375.04 ms self-sample
- Fa index-8I8UNd-r.js:2: 122.96 ms self-sample
- Ca index-8I8UNd-r.js:2: 31.09 ms self-sample

## baseline-largeonebit-wholeapp-baseline-1792300895824.json

Native viewport 448×819, DPR 2.25, portrait-primary.

| Stage | Task CPU ms | Elapsed ms | Max long task ms | Max rAF gap ms |
|---|---:|---:|---:|---:|
| largeonebit-kenney-sheet-1024: input import to current named wall paint | 148.25 | 287.2 | 50.0 | 41.6 |
| kenney-sheet-1024: first-style-preparation Stencil current paint | 375.75 | 681.9 | 80.0 | 100.0 |
| kenney-sheet-1024: first-style-preparation Icon current paint | 340.93 | 583.6 | 186.0 | 200.0 |
| kenney-sheet-1024: first-style-preparation Atkinson current paint | 156.51 | 439.6 | 0.0 | 33.4 |
| kenney-sheet-1024: first-style-preparation Checker current paint | 130.67 | 405.7 | 0.0 | 24.9 |
| kenney-sheet-1024: repeated-style-preparation Cutout current paint | 178.27 | 458.8 | 0.0 | 50.0 |
| kenney-sheet-1024: repeated-style-preparation Stencil current paint | 170.82 | 444.8 | 0.0 | 58.4 |
| kenney-sheet-1024: repeated-style-preparation Icon current paint | 130.50 | 476.9 | 0.0 | 16.7 |
| kenney-sheet-1024: repeated-style-preparation Atkinson current paint | 141.77 | 469.6 | 0.0 | 25.1 |
| kenney-sheet-1024: repeated-style-preparation Checker current paint | 155.31 | 483.9 | 0.0 | 16.8 |
| kenney-sheet-1024: Brightness rapid R-G-Value reanalysis | 217.16 | 794.0 | 0.0 | 25.0 |

Native output files verified: 0. Errors: 1.

Error classified by investigation below; failed stages are not reported as passed.

Profile summary, largeonebit-kenney-sheet-1024: input import to current named wall paint:

- (idle) :-1: 135.06 ms self-sample
- (program) :-1: 65.35 ms self-sample
- Wu index-8I8UNd-r.js:2: 13.72 ms self-sample
- ho index-8I8UNd-r.js:2: 11.87 ms self-sample
- b index-8I8UNd-r.js:2: 8.29 ms self-sample
-  index-8I8UNd-r.js:2: 7.57 ms self-sample

Profile summary, kenney-sheet-1024: first-style-preparation Stencil current paint:

- (idle) :-1: 301.97 ms self-sample
- (program) :-1: 115.06 ms self-sample
- lo index-8I8UNd-r.js:2: 36.04 ms self-sample
- ho index-8I8UNd-r.js:2: 25.76 ms self-sample
- b index-8I8UNd-r.js:2: 23.68 ms self-sample
-  index-8I8UNd-r.js:2: 17.45 ms self-sample

Profile summary, kenney-sheet-1024: first-style-preparation Icon current paint:

- (idle) :-1: 242.70 ms self-sample
- Ji index-8I8UNd-r.js:2: 105.97 ms self-sample
- (program) :-1: 74.87 ms self-sample
-  index-8I8UNd-r.js:2: 33.37 ms self-sample
- Bi index-8I8UNd-r.js:2: 31.81 ms self-sample
- blur :-1: 9.30 ms self-sample

## baseline-largeonebit-wholeapp-baseline-1792301038091.json

Native viewport 448×819, DPR 2.25, portrait-primary.

| Stage | Task CPU ms | Elapsed ms | Max long task ms | Max rAF gap ms |
|---|---:|---:|---:|---:|
| largeonebit-kenney-sheet-1024: input import to current named wall paint | 173.22 | 291.0 | 73.0 | 75.0 |
| kenney-sheet-1024: first-style-preparation Stencil current paint | 326.20 | 615.1 | 71.0 | 91.7 |
| kenney-sheet-1024: first-style-preparation Icon current paint | 474.56 | 817.6 | 300.0 | 300.1 |
| kenney-sheet-1024: first-style-preparation Atkinson current paint | 185.08 | 500.4 | 0.0 | 33.4 |
| kenney-sheet-1024: first-style-preparation Checker current paint | 138.91 | 411.0 | 0.0 | 25.1 |
| kenney-sheet-1024: repeated-style-preparation Cutout current paint | 163.64 | 418.5 | 0.0 | 50.0 |
| kenney-sheet-1024: repeated-style-preparation Stencil current paint | 150.81 | 475.8 | 0.0 | 33.3 |
| kenney-sheet-1024: repeated-style-preparation Icon current paint | 142.26 | 514.8 | 0.0 | 16.8 |
| kenney-sheet-1024: repeated-style-preparation Atkinson current paint | 148.95 | 473.5 | 0.0 | 25.2 |
| kenney-sheet-1024: repeated-style-preparation Checker current paint | 122.60 | 437.6 | 0.0 | 16.8 |
| kenney-sheet-1024: Brightness rapid R-G-Value reanalysis | 261.40 | 812.1 | 52.0 | 41.6 |
| largeonebit-kenney-sheet-2048: input import to current named wall paint | 208.10 | 470.3 | 0.0 | 41.5 |
| kenney-sheet-2048: first-style-preparation Stencil current paint | 410.52 | 717.4 | 131.0 | 150.0 |
| kenney-sheet-2048: first-style-preparation Icon current paint | 653.74 | 1074.9 | 471.0 | 474.9 |
| kenney-sheet-2048: first-style-preparation Atkinson current paint | 178.51 | 459.9 | 0.0 | 58.3 |
| kenney-sheet-2048: first-style-preparation Checker current paint | 121.52 | 395.2 | 0.0 | 16.7 |
| kenney-sheet-2048: repeated-style-preparation Cutout current paint | 193.12 | 436.2 | 0.0 | 58.4 |
| kenney-sheet-2048: repeated-style-preparation Stencil current paint | 172.69 | 485.2 | 0.0 | 41.6 |
| kenney-sheet-2048: repeated-style-preparation Icon current paint | 122.67 | 470.0 | 0.0 | 16.8 |
| kenney-sheet-2048: repeated-style-preparation Atkinson current paint | 166.71 | 524.2 | 0.0 | 41.8 |
| kenney-sheet-2048: repeated-style-preparation Checker current paint | 135.49 | 431.2 | 0.0 | 25.0 |
| kenney-sheet-2048: Brightness rapid R-G-Value reanalysis | 466.09 | 1072.4 | 121.0 | 108.2 |
| onebit-partial-alpha: input import to current named wall paint | 39.63 | 90.3 | 0.0 | 16.7 |
| partialglow64: Opacity committed8-64-192 reanalysis cancellation | 107.44 | 606.7 | 0.0 | 16.8 |

Native output files verified: 0. Errors: 0.

Profile summary, largeonebit-kenney-sheet-1024: input import to current named wall paint:

- (idle) :-1: 113.89 ms self-sample
- (program) :-1: 68.93 ms self-sample
- ho index-8I8UNd-r.js:2: 18.98 ms self-sample
- Wu index-8I8UNd-r.js:2: 12.25 ms self-sample
-  index-8I8UNd-r.js:2: 11.17 ms self-sample
- d index-8I8UNd-r.js:2: 9.55 ms self-sample

Profile summary, kenney-sheet-1024: first-style-preparation Stencil current paint:

- (idle) :-1: 279.25 ms self-sample
- (program) :-1: 100.75 ms self-sample
- lo index-8I8UNd-r.js:2: 33.01 ms self-sample
- ho index-8I8UNd-r.js:2: 28.34 ms self-sample
- b index-8I8UNd-r.js:2: 23.16 ms self-sample
-  index-8I8UNd-r.js:2: 11.81 ms self-sample

Profile summary, kenney-sheet-1024: first-style-preparation Icon current paint:

- (idle) :-1: 339.27 ms self-sample
- Ji index-8I8UNd-r.js:2: 161.40 ms self-sample
-  index-8I8UNd-r.js:2: 105.79 ms self-sample
- (program) :-1: 82.38 ms self-sample
- Bi index-8I8UNd-r.js:2: 17.06 ms self-sample
- (garbage collector) :-1: 11.17 ms self-sample

Profile summary, largeonebit-kenney-sheet-2048: input import to current named wall paint:

- (idle) :-1: 259.12 ms self-sample
- (program) :-1: 86.23 ms self-sample
- Wu index-8I8UNd-r.js:2: 29.38 ms self-sample
-  index-8I8UNd-r.js:2: 12.59 ms self-sample
- (garbage collector) :-1: 12.54 ms self-sample
- ho index-8I8UNd-r.js:2: 12.38 ms self-sample

Profile summary, kenney-sheet-2048: first-style-preparation Stencil current paint:

- (idle) :-1: 300.67 ms self-sample
- (program) :-1: 116.38 ms self-sample
- lo index-8I8UNd-r.js:2: 90.69 ms self-sample
- ho index-8I8UNd-r.js:2: 27.88 ms self-sample
- b index-8I8UNd-r.js:2: 18.61 ms self-sample
-  index-8I8UNd-r.js:2: 17.80 ms self-sample

Profile summary, kenney-sheet-2048: first-style-preparation Icon current paint:

- (idle) :-1: 421.80 ms self-sample
- Ji index-8I8UNd-r.js:2: 287.80 ms self-sample
-  index-8I8UNd-r.js:2: 88.99 ms self-sample
- (program) :-1: 79.15 ms self-sample
- Bi index-8I8UNd-r.js:2: 59.91 ms self-sample
- ho index-8I8UNd-r.js:2: 14.23 ms self-sample

## baseline-sheets-animation-preview-onebit-editor-wholeapp-baseline-1792299916224.json

Native viewport 448×819, DPR 2.25, portrait-primary.

| Stage | Task CPU ms | Elapsed ms | Max long task ms | Max rAF gap ms |
|---|---:|---:|---:|---:|
| kenney-sheet-1024: input import to current named wall paint | 150.13 | 283.0 | 0.0 | 25.0 |

Native output files verified: 0. Errors: 2.

Error classified by investigation below; failed stages are not reported as passed.

Profile summary, kenney-sheet-1024: input import to current named wall paint:

- (idle) :-1: 128.44 ms self-sample
- (program) :-1: 68.49 ms self-sample
- Fa index-8I8UNd-r.js:2: 19.03 ms self-sample
- Wu index-8I8UNd-r.js:2: 15.89 ms self-sample
- za index-8I8UNd-r.js:2: 5.50 ms self-sample
- y image-import-client-DMvOPcbg.js:1: 4.18 ms self-sample

## baseline-sheets-animation-preview-onebit-editor-wholeapp-baseline-1792299924168.json

Native viewport 448×819, DPR 2.25, portrait-primary.

| Stage | Task CPU ms | Elapsed ms | Max long task ms | Max rAF gap ms |
|---|---:|---:|---:|---:|
| kenney-sheet-1024: input import to current named wall paint | 142.99 | 266.5 | 0.0 | 25.0 |
| kenney-sheet-1024: native Save including download manager | 265.00 | 1065.0 | 0.0 | 33.3 |
| kenney-sheet-1024: RGB matching final paint | 142.76 | 439.3 | 0.0 | 25.0 |
| kenney-sheet-1024: dither4 final paint and count idle | 187.41 | 1000.8 | 0.0 | 16.8 |
| kenney-sheet-2048: input import to current named wall paint | 186.56 | 428.4 | 0.0 | 41.7 |
| kenney-sheet-2048: native Save including download manager | 345.58 | 1118.1 | 0.0 | 41.7 |
| kenney-sheet-2048: RGB matching final paint | 184.76 | 603.7 | 0.0 | 75.0 |
| kenney-sheet-2048: dither4 final paint and count idle | 243.85 | 1004.5 | 0.0 | 16.8 |
| real-magic: input import to current named wall paint | 47.67 | 128.5 | 0.0 | 16.7 |
| real-magic: native Save including download manager | 187.35 | 1085.6 | 0.0 | 17.0 |
| real-magic: fresh converted playback | 81.10 | 1506.9 | 0.0 | 16.9 |
| kenney-motion-128: input import to current named wall paint | 63.07 | 165.4 | 0.0 | 16.8 |
| kenney-motion-128: native Save including download manager | 178.16 | 1045.9 | 0.0 | 16.8 |
| kenney-motion-128: fresh converted playback | 356.19 | 6073.8 | 0.0 | 17.0 |
| kenney-motion-256: input import to current named wall paint | 80.50 | 316.7 | 0.0 | 16.8 |
| kenney-motion-256: native Save including download manager | 328.06 | 1207.0 | 0.0 | 16.8 |
| kenney-motion-256: fresh converted playback | 622.33 | 8948.2 | 0.0 | 24.9 |
| preview: input import to current named wall paint | 229.44 | 352.1 | 0.0 | 100.0 |
| Preview zoom pan Original Fit return | 347.06 | 1412.1 | 0.0 | 25.0 |
| settled still wall idle | 78.92 | 1251.7 | 0.0 | 16.8 |
| onebit: input import to current named wall paint | 39.18 | 89.8 | 0.0 | 16.7 |
| 1-bit style Solid: committed paint | 149.68 | 460.6 | 0.0 | 33.5 |
| 1-bit style Lines: committed paint | 126.65 | 433.5 | 0.0 | 16.8 |
| 1-bit style Stencil: committed paint | 133.73 | 462.1 | 0.0 | 16.8 |
| 1-bit style Icon: committed paint | 111.19 | 421.8 | 0.0 | 16.8 |
| 1-bit style Checker: committed paint | 104.01 | 378.1 | 0.0 | 16.8 |
| 1-bit style Bayer: committed paint | 120.74 | 420.2 | 0.0 | 16.8 |
| 1-bit style Hatch: committed paint | 103.38 | 369.5 | 0.0 | 16.8 |
| 1-bit style Atkinson: committed paint | 98.90 | 396.0 | 0.0 | 16.9 |
| 1-bit style Noise: committed paint | 108.08 | 382.4 | 0.0 | 16.8 |
| 1-bit style Shape: committed paint | 96.92 | 369.9 | 0.0 | 16.7 |
| 1-bit Original cached repeat | 75.67 | 445.5 | 0.0 | 16.8 |

Native output files verified: 5. Errors: 1.

Error classified by investigation below; failed stages are not reported as passed.

Profile summary, kenney-sheet-1024: input import to current named wall paint:

- (idle) :-1: 117.01 ms self-sample
- (program) :-1: 67.53 ms self-sample
- Fa index-8I8UNd-r.js:2: 19.02 ms self-sample
- Wu index-8I8UNd-r.js:2: 13.36 ms self-sample
-  index-8I8UNd-r.js:2: 8.45 ms self-sample
- za index-8I8UNd-r.js:2: 6.86 ms self-sample

Profile summary, kenney-sheet-1024: dither4 final paint and count idle:

- (idle) :-1: 814.73 ms self-sample
- (program) :-1: 85.33 ms self-sample
- Ca index-8I8UNd-r.js:2: 35.04 ms self-sample
- getBoundingClientRect :-1: 6.77 ms self-sample
- La index-8I8UNd-r.js:2: 6.47 ms self-sample
- requestAnimationFrame :-1: 3.76 ms self-sample

Profile summary, kenney-sheet-2048: input import to current named wall paint:

- (idle) :-1: 220.60 ms self-sample
- (program) :-1: 86.14 ms self-sample
- Wu index-8I8UNd-r.js:2: 29.95 ms self-sample
- Fa index-8I8UNd-r.js:2: 14.45 ms self-sample
- copyTo :-1: 10.96 ms self-sample
- (garbage collector) :-1: 8.91 ms self-sample

Profile summary, kenney-sheet-2048: dither4 final paint and count idle:

- (idle) :-1: 773.57 ms self-sample
- (program) :-1: 98.92 ms self-sample
- Ca index-8I8UNd-r.js:2: 72.56 ms self-sample
- La index-8I8UNd-r.js:2: 8.28 ms self-sample
-  :-1: 6.21 ms self-sample
- getBoundingClientRect :-1: 5.74 ms self-sample

Profile summary, preview: input import to current named wall paint:

- (program) :-1: 139.00 ms self-sample
- (idle) :-1: 123.71 ms self-sample
- Fa index-8I8UNd-r.js:2: 19.18 ms self-sample
- Wu index-8I8UNd-r.js:2: 17.43 ms self-sample
-  index-8I8UNd-r.js:2: 11.84 ms self-sample
- (garbage collector) :-1: 8.20 ms self-sample

## baseline-startup-batches-wholeapp-baseline-1792299907201.json

Native viewport 448×819, DPR 2.25, portrait-primary.

| Stage | Task CPU ms | Elapsed ms | Max long task ms | Max rAF gap ms |
|---|---:|---:|---:|---:|
| dark: empty demo settled | 49.59 | 664.2 | 0.0 | 16.8 |
| light: empty demo settled | 37.57 | 655.3 | 0.0 | 16.8 |
| sprites1: input import to current named wall paint | 47.95 | 95.6 | 0.0 | 16.7 |
| sprites2: drop import to current named wall paint | 53.64 | 109.4 | 0.0 | 16.8 |
| sprites4: paste import to current named wall paint | 53.93 | 91.2 | 0.0 | 16.7 |
| sprites8: input import to current named wall paint | 61.63 | 102.6 | 0.0 | 16.7 |
| sprites8-plus-effect-auto: input import to current named wall paint | 100.92 | 166.8 | 0.0 | 16.7 |

Native output files verified: 0. Errors: 0.

Failed harness receipts remain explicit: Save selector matched viewer and dock; editor toolbar Palette selector matched both family tab and toolbar; Review pointer auto-scroll was intercepted by header/textarea (keyboard cause not proved); large binary-sheet Opacity chip was correctly absent. Corrections scope the toolbar/viewer, use keyboard Review (passed), and assert absent binary-alpha control with separate partial-alpha reanalysis. These failures are not production performance defects and failed stages are not marked passed. No app behavior change was made.
