# Second-audit native Android receipts

Observed baseline workflows at HEAD 3c47699 on the immutable 5371 build (profile pass on byte-identical 5373 sourcemap build). Task CPU is renderer-only; elapsed includes automation/native download transport.

## second-baseline-editor-extended-overbudget-teardown-failure-fallback-secondaudit-second-baseline-1792302879726.json

Viewport 448x819 DPR 2.25 portrait-primary; Chrome/155.0.8059.85; battery AC powered: false, USB powered: true, Wireless powered: false, Dock powered: false, status: 4, temperature: 346; rotation free. Errors: 0. Native outputs exact: 5. Restored: {"rotation":"free","downloadBehavior":"native default","ownedPageClosed":true}

| Stage | Task CPU ms | Elapsed ms | Max long task ms | Max rAF gap ms |
|---|---:|---:|---:|---:|
| palette editor open paste 256 colors keyboard Review page close | 563.4 | 1183 | 185 | 183 |
| closed editor empty wall idle | 75.4 | 1057 | 0 | 17 |
| transparent32: input import to current named wall paint | 45.1 | 93 | 0 | 17 |
| transparent32: native Save including download manager | 246.6 | 915 | 0 | 42 |
| silhouette32: input import to current named wall paint | 38.9 | 93 | 0 | 17 |
| silhouette32: native Save including download manager | 206.6 | 877 | 0 | 25 |
| partial-glow64: input import to current named wall paint | 50.3 | 99 | 0 | 17 |
| partial-glow64: native Save including download manager | 202.9 | 1062 | 0 | 33 |
| boundary4096: input import to current named wall paint | 61.1 | 120 | 0 | 17 |
| boundary4096: cap replacements2to4to8 Cleanup on-off | 276.2 | 902 | 0 | 25 |
| boundary4097: input import to current named wall paint | 78.1 | 161 | 0 | 17 |
| boundary4097: cap replacements2to4to8 Cleanup on-off | 222.4 | 843 | 0 | 17 |
| entropy512: input import to current named wall paint | 236.2 | 338 | 0 | 25 |
| entropy512: native Save including download manager | 385.4 | 1291 | 0 | 25 |
| entropy512: RGB dither8 replaced4 final current count | 1509.6 | 1876 | 0 | 217 |
| overbudget: input import to current named wall paint | 131.3 | 447 | 0 | 17 |
| 384x384x48 over8MiB index budget converted playback | 846.9 | 8941 | 0 | 17 |
| teardown0: input import to current named wall paint | 35.2 | 86 | 0 | 17 |
| teardown1: input import to current named wall paint | 39.8 | 90 | 0 | 17 |
| teardown2: input import to current named wall paint | 34.2 | 78 | 0 | 17 |
| teardown3: input import to current named wall paint | 53.0 | 87 | 0 | 17 |
| teardown4: input import to current named wall paint | 58.0 | 108 | 0 | 25 |
| teardown5: input import to current named wall paint | 55.5 | 98 | 0 | 17 |
| post six import/remove cycles demo idle | 74.9 | 1075 | 0 | 17 |
| failure-limit: input import to current named wall paint | 145.8 | 231 | 0 | 50 |
| limit: injected worker fetch failure gates Save and Retry recovers | 196.5 | 651 | 0 | 17 |
| failure-cleanup: input import to current named wall paint | 73.5 | 164 | 0 | 17 |
| cleanup: injected worker fetch failure gates Save and Retry recovers | 205.0 | 682 | 0 | 17 |
| worker-unavailable: input import to current named wall paint | 52.8 | 124 | 0 | 17 |
| worker unavailable genuine GIF: native Save including download manager | 189.4 | 866 | 0 | 17 |

## second-baseline-largeonebit-secondaudit-second-baseline-1792302918254.json

Viewport 448x819 DPR 2.25 portrait-primary; Chrome/155.0.8059.85; battery AC powered: false, USB powered: true, Wireless powered: false, Dock powered: false, status: 2, temperature: 347; rotation free. Errors: 0. Native outputs exact: 0. Restored: {"rotation":"free","downloadBehavior":"native default","ownedPageClosed":true}

| Stage | Task CPU ms | Elapsed ms | Max long task ms | Max rAF gap ms |
|---|---:|---:|---:|---:|
| largeonebit-kenney-sheet-1024: input import to current named wall paint | 158.8 | 277 | 51 | 50 |
| kenney-sheet-1024: first-style-preparation Stencil current paint | 360.0 | 660 | 69 | 92 |
| kenney-sheet-1024: first-style-preparation Icon current paint | 344.9 | 578 | 192 | 200 |
| kenney-sheet-1024: first-style-preparation Atkinson current paint | 157.7 | 469 | 0 | 42 |
| kenney-sheet-1024: first-style-preparation Checker current paint | 130.2 | 432 | 0 | 25 |
| kenney-sheet-1024: repeated-style-preparation Cutout current paint | 169.0 | 421 | 0 | 50 |
| kenney-sheet-1024: repeated-style-preparation Stencil current paint | 164.5 | 494 | 0 | 50 |
| kenney-sheet-1024: repeated-style-preparation Icon current paint | 140.5 | 457 | 0 | 25 |
| kenney-sheet-1024: repeated-style-preparation Atkinson current paint | 153.2 | 443 | 0 | 25 |
| kenney-sheet-1024: repeated-style-preparation Checker current paint | 108.7 | 397 | 0 | 17 |
| kenney-sheet-1024: Brightness rapid R-G-Value reanalysis | 259.4 | 816 | 54 | 42 |
| largeonebit-kenney-sheet-2048: input import to current named wall paint | 197.7 | 379 | 0 | 33 |
| kenney-sheet-2048: first-style-preparation Stencil current paint | 380.2 | 696 | 132 | 150 |
| kenney-sheet-2048: first-style-preparation Icon current paint | 609.5 | 914 | 449 | 450 |
| kenney-sheet-2048: first-style-preparation Atkinson current paint | 194.6 | 464 | 53 | 67 |
| kenney-sheet-2048: first-style-preparation Checker current paint | 150.4 | 413 | 0 | 33 |
| kenney-sheet-2048: repeated-style-preparation Cutout current paint | 185.8 | 442 | 0 | 58 |
| kenney-sheet-2048: repeated-style-preparation Stencil current paint | 165.1 | 475 | 0 | 58 |
| kenney-sheet-2048: repeated-style-preparation Icon current paint | 120.1 | 375 | 0 | 17 |
| kenney-sheet-2048: repeated-style-preparation Atkinson current paint | 156.0 | 478 | 0 | 33 |
| kenney-sheet-2048: repeated-style-preparation Checker current paint | 124.3 | 479 | 0 | 17 |
| kenney-sheet-2048: Brightness rapid R-G-Value reanalysis | 445.2 | 953 | 111 | 100 |
| onebit-partial-alpha: input import to current named wall paint | 36.4 | 83 | 0 | 17 |
| partialglow64: Opacity committed8-64-192 reanalysis cancellation | 122.2 | 569 | 0 | 17 |

## second-baseline-sheets-animation-preview-onebit-editor-secondaudit-second-baseline-1792302830220.json

Viewport 448x819 DPR 2.25 portrait-primary; Chrome/155.0.8059.85; battery AC powered: false, USB powered: true, Wireless powered: false, Dock powered: false, status: 2, temperature: 345; rotation free. Errors: 0. Native outputs exact: 5. Restored: {"rotation":"free","downloadBehavior":"native default","ownedPageClosed":true}

| Stage | Task CPU ms | Elapsed ms | Max long task ms | Max rAF gap ms |
|---|---:|---:|---:|---:|
| kenney-sheet-1024: input import to current named wall paint | 155.8 | 269 | 0 | 25 |
| kenney-sheet-1024: native Save including download manager | 296.5 | 1149 | 0 | 41 |
| kenney-sheet-1024: RGB matching final paint | 188.6 | 488 | 0 | 42 |
| kenney-sheet-1024: dither4 final paint and count idle | 215.3 | 968 | 0 | 17 |
| kenney-sheet-2048: input import to current named wall paint | 189.1 | 413 | 0 | 25 |
| kenney-sheet-2048: native Save including download manager | 345.1 | 1167 | 0 | 33 |
| kenney-sheet-2048: RGB matching final paint | 121.3 | 433 | 0 | 17 |
| kenney-sheet-2048: dither4 final paint and count idle | 285.2 | 1031 | 0 | 33 |
| real-magic: input import to current named wall paint | 56.2 | 145 | 0 | 17 |
| real-magic: native Save including download manager | 168.8 | 1100 | 0 | 17 |
| real-magic: fresh converted playback | 76.0 | 1528 | 0 | 17 |
| kenney-motion-128: input import to current named wall paint | 80.3 | 201 | 0 | 17 |
| kenney-motion-128: native Save including download manager | 197.2 | 1128 | 0 | 17 |
| kenney-motion-128: fresh converted playback | 342.6 | 6095 | 0 | 17 |
| kenney-motion-256: input import to current named wall paint | 112.7 | 324 | 0 | 17 |
| kenney-motion-256: native Save including download manager | 332.7 | 1443 | 0 | 17 |
| kenney-motion-256: fresh converted playback | 562.5 | 8942 | 0 | 17 |
| preview: input import to current named wall paint | 239.1 | 421 | 0 | 100 |
| Preview zoom pan Original Fit return | 401.6 | 1560 | 0 | 17 |
| settled still wall idle | 82.7 | 1248 | 0 | 25 |
| onebit: input import to current named wall paint | 42.7 | 106 | 0 | 17 |
| 1-bit style Solid: committed paint | 159.9 | 462 | 0 | 25 |
| 1-bit style Lines: committed paint | 134.7 | 443 | 0 | 17 |
| 1-bit style Stencil: committed paint | 115.2 | 407 | 0 | 17 |
| 1-bit style Icon: committed paint | 154.0 | 536 | 0 | 25 |
| 1-bit style Checker: committed paint | 111.9 | 400 | 0 | 17 |
| 1-bit style Bayer: committed paint | 109.6 | 403 | 0 | 17 |
| 1-bit style Hatch: committed paint | 112.4 | 422 | 0 | 17 |
| 1-bit style Atkinson: committed paint | 109.9 | 417 | 0 | 17 |
| 1-bit style Noise: committed paint | 111.8 | 435 | 0 | 17 |
| 1-bit style Shape: committed paint | 110.0 | 383 | 0 | 17 |
| 1-bit Original cached repeat | 74.6 | 459 | 0 | 17 |
| palette editor open paste 256 colors keyboard Review page close | 546.3 | 1260 | 187 | 183 |
| closed editor empty wall idle | 94.2 | 1061 | 0 | 17 |

## second-baseline-startup-batches-secondaudit-second-baseline-1792302820107.json

Viewport 448x819 DPR 2.25 portrait-primary; Chrome/155.0.8059.85; battery AC powered: false, USB powered: true, Wireless powered: false, Dock powered: false, status: 2, temperature: 345; rotation free. Errors: 0. Native outputs exact: 0. Restored: {"rotation":"free","downloadBehavior":"native default","ownedPageClosed":true}

| Stage | Task CPU ms | Elapsed ms | Max long task ms | Max rAF gap ms |
|---|---:|---:|---:|---:|
| dark: empty demo settled | 60.7 | 666 | 0 | 17 |
| light: empty demo settled | 36.1 | 666 | 0 | 17 |
| sprites1: input import to current named wall paint | 46.4 | 100 | 0 | 17 |
| sprites2: drop import to current named wall paint | 57.1 | 128 | 0 | 17 |
| sprites4: paste import to current named wall paint | 56.8 | 116 | 0 | 17 |
| sprites8: input import to current named wall paint | 71.2 | 126 | 0 | 17 |
| sprites8-plus-effect-auto: input import to current named wall paint | 105.5 | 165 | 0 | 17 |

## second-profile-largeonebit-editor-secondaudit-second-profile-1792302982539.json

Viewport 448x819 DPR 2.25 portrait-primary; Chrome/155.0.8059.85; battery AC powered: false, USB powered: true, Wireless powered: false, Dock powered: false, status: 4, temperature: 352; rotation free. Errors: 0. Native outputs exact: 0. Restored: {"rotation":"free","downloadBehavior":"native default","ownedPageClosed":true}

| Stage | Task CPU ms | Elapsed ms | Max long task ms | Max rAF gap ms |
|---|---:|---:|---:|---:|
| palette editor open paste 256 colors keyboard Review page close | 579.1 | 1159 | 188 | 183 |
| closed editor empty wall idle | 69.8 | 1066 | 0 | 17 |
| largeonebit-kenney-sheet-1024: input import to current named wall paint | 176.7 | 304 | 82 | 75 |
| kenney-sheet-1024: first-style-preparation Stencil current paint | 365.9 | 646 | 73 | 92 |
| kenney-sheet-1024: first-style-preparation Icon current paint | 405.4 | 710 | 206 | 208 |
| kenney-sheet-1024: first-style-preparation Atkinson current paint | 186.6 | 435 | 0 | 58 |
| kenney-sheet-1024: first-style-preparation Checker current paint | 150.7 | 409 | 0 | 33 |
| kenney-sheet-1024: repeated-style-preparation Cutout current paint | 190.1 | 476 | 0 | 58 |
| kenney-sheet-1024: repeated-style-preparation Stencil current paint | 183.8 | 466 | 0 | 50 |
| kenney-sheet-1024: repeated-style-preparation Icon current paint | 118.9 | 390 | 0 | 17 |
| kenney-sheet-1024: repeated-style-preparation Atkinson current paint | 213.1 | 505 | 0 | 67 |
| kenney-sheet-1024: repeated-style-preparation Checker current paint | 137.5 | 414 | 0 | 25 |
| kenney-sheet-1024: Brightness rapid R-G-Value reanalysis | 249.7 | 752 | 50 | 33 |
| largeonebit-kenney-sheet-2048: input import to current named wall paint | 187.8 | 405 | 57 | 50 |
| kenney-sheet-2048: first-style-preparation Stencil current paint | 407.4 | 684 | 132 | 150 |
| kenney-sheet-2048: first-style-preparation Icon current paint | 603.1 | 904 | 409 | 408 |
| kenney-sheet-2048: first-style-preparation Atkinson current paint | 205.9 | 485 | 52 | 67 |
| kenney-sheet-2048: first-style-preparation Checker current paint | 175.9 | 461 | 0 | 58 |
| kenney-sheet-2048: repeated-style-preparation Cutout current paint | 184.1 | 438 | 0 | 58 |
| kenney-sheet-2048: repeated-style-preparation Stencil current paint | 170.7 | 420 | 0 | 42 |
| kenney-sheet-2048: repeated-style-preparation Icon current paint | 118.5 | 394 | 0 | 25 |
| kenney-sheet-2048: repeated-style-preparation Atkinson current paint | 146.0 | 396 | 0 | 33 |
| kenney-sheet-2048: repeated-style-preparation Checker current paint | 116.3 | 390 | 0 | 17 |
| kenney-sheet-2048: Brightness rapid R-G-Value reanalysis | 518.0 | 1123 | 118 | 117 |
| onebit-partial-alpha: input import to current named wall paint | 37.4 | 87 | 0 | 17 |
| partialglow64: Opacity committed8-64-192 reanalysis cancellation | 59.1 | 469 | 0 | 17 |

