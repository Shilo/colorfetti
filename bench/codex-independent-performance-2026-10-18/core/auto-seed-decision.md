# Auto seed membership candidate: rejected

One research-only change replaced `colors.includes(rgb)` with a Set membership check while retaining the ordered color array, strict tie arithmetic and algorithm. No production source was edited. The predeclared promotion gate required a practical whole-Auto gain; no licensed practical cohort enters this seed loop (four sprites29 RGBs; both sheets37). Stop after round1; no native candidate run or second correction round is justified.

All12 cohorts per engine produced exactly the same generated colors and all diagnostics. Five warmed alternating pairs per cohort timed whole core generation, including histogram, seed and refinement. Instrumented attribution ran separately.

| Cohort | Node before / after ms | Auxiliary Edge before / after ms | Edge delta | Faster Edge pairs | Original Edge seed share* |
|---|---:|---:|---:|---:|---:|
| tiny | 0.070 / 0.068 | 0.100 / 0.100 | 0.0% | 1/5 | 0.0% |
| boundary64 | 0.118 / 0.109 | 0.100 / 0.100 | 0.0% | 1/5 | 0.0% |
| exact128 | 0.811 / 0.973 | 0.700 / 0.700 | 0.0% | 1/5 | 27.3% |
| exact1024 | 6.366 / 5.747 | 4.200 / 4.200 | 0.0% | 4/5 | 34.2% |
| exact4096 | 13.822 / 11.538 | 9.400 / 8.300 | -11.7% | 5/5 | 32.9% |
| binned | 40.630 / 35.023 | 26.600 / 24.500 | -7.9% | 4/5 | 35.0% |
| assets4 | 3.317 / 2.936 | 2.300 / 2.100 | -8.7% | 5/5 | 28.0% |
| clip3 | 4.630 / 3.973 | 3.200 / 3.200 | 0.0% | 4/5 | 28.6% |
| partial | 2.004 / 1.663 | 1.400 / 1.300 | -7.1% | 5/5 | 29.4% |
| practical4 | 0.027 / 0.028 | 0.000 / 0.000 | below timer resolution | 2/5 | 0.0% |
| sheet1024 | 6.040 / 5.554 | 5.400 / 5.300 | -1.9% | 2/5 | 0.0% |
| sheet2048 | 22.221 / 21.834 | 21.800 / 21.700 | -0.5% | 3/5 | 0.0% |

*One instrumented observation of elapsed share; includes scheduler waits and is not CPU attribution. Raw timings retain every trial, including adverse/noisy cases.

Auxiliary Edge155.0.4283.62 ran with Chromium sandbox enabled. The restricted execution profile initially prevented Edge startup before any application code; the authorized host run succeeded, with no page errors. This is independent auxiliary browser core evidence, not actual Codex Browser or Android workflow evidence. Source PNGs were freshly decoded before timing; see the JSON limits for decoder and import/worker/UI exclusions.

Evidence: `auto-seed-candidate-plan.json`, `auto-seed-round1.json`, `edge-auto-seed-round1.json`, `auto-seed-decision.json`, research-only original/candidate modules, and reproducible probe scripts. Licensed fixture origins/recipes remain in `bench/practical-workloads-2026-10-16/manifest.json`.
