C-B5 banded live reanalysis: evidence (desktop Node 25, Windows; no browser or phone runs).

Setup: `git archive 0c61dd0 src/lib | tar -x -C .tmp/c-b5/frozen`; raw fixtures in
.tmp/second-audit-2026-10-17/review/raw (review/decode-fixtures.mjs). bench/recolor.old.js is
`export * from '../.tmp/c-b5/frozen/src/lib/recolor.js';` (ignored), so bench.mjs and equiv.mjs
take HEAD's module graph.

Timed runs were started from PowerShell with PriorityClass High and ProcessorAffinity 0x10
(one core), because unpinned A/A spread on this machine reached +-20%.

differential.mjs / .result.json   HEAD analyze vs candidate analyze + analyzeAsync (real clock and
                                  forced one-step bands), 3011 random images (widths to 9000,
                                  0x0/0xN/Nx0/1xN/Nx1), every fixtures-lib edge case, 96 fixture frames,
                                  6 sources (incl. unknown), cuts 0/1/64/128/255/256: 18504 identical.
equiv.txt                         bench/equiv.mjs after the change.
bench-{before,after}.pinned*.txt  bench/bench.mjs, three runs each side, alternating order.
sync-ab.mjs / .pinned.result.json synchronous analyze, A/A noise floor and candidate/HEAD.
timing.mjs / .pinned.result.json  sync paired ratios and the 2048 sheet reanalysis: longest
                                  main-thread stretch between posted tasks, task count, total.
vitest.txt                        full `npx vitest run`.
rejected-shared-*                 the first design (one row function for both paths) and why it lost.
