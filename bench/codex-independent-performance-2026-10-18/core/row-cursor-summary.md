# Local nearest row cursor: rejected at native target gate

Research-only candidate: each `convert(state,start,end)` initializes local x/y/source-row values from its start, reads the same prepared xs/ys sample positions, and advances before alpha early-continue. It adds no persistent state, buffer, cache, source-equality shortcut or dither change. Native approval remains required; no production source was edited.

Both production variants use immutable `5ae11b13977f2ce3cc7ae67cf7bd220f8a8734ce` with only the candidate quantize coordinate block changed. Ports5407/5408 are baseline/candidate. Raw and canonical-LF source hashes plus full dist hashes are in `row-cursor-build-manifest.json`; both copies normalize quantize.js toLF.

Each Node round passed1,356 odd chunk-boundary checks,168 sync and168 async comparisons,84 independent scalar-nearest comparisons,504 nonzero fresh starts,48 unchanged dither/alpha cases, entry/progress cancellation and50 exact paired PNG preparations. Widths1/2/17/8191, source/sampled sizes, Cut1/128/255, Keep, both metrics, exact membership, low-color memo hits, entropy memo bypass and4097 RGBs with repeated runs were included. Auxiliary Edge passed20 full/sample/metric cohorts and200 paired timing trials without page errors.

| Whole PNG preparation, Node elapsed | Round1 baseline / candidate ms | Round1 delta | Round2 baseline / candidate ms | Round2 delta |
|---|---:|---:|---:|---:|
| tiny | 0.215 / 0.188 | -12.4% | 0.179 / 0.176 | -1.5% |
| sheet1024 | 43.513 / 41.121 | -5.5% | 44.262 / 42.544 | -3.9% |
| sheet2048 | 104.355 / 93.395 | -10.5% | 104.916 / 95.039 | -9.4% |
| entropy | 47.569 / 60.343 | 26.9% | 48.695 / 49.264 | 1.2% |
| partial | 68.150 / 100.822 | 47.9% | 69.353 / 66.697 | -3.8% |

The first Node entropy/Keep adverse elapsed results exceeded the predeclared meaningful limits. One unchanged-candidate repeat retained the same deterministic protocol and did not reproduce those magnitudes. Both rounds remain recorded; identical PNG bytes and unchanged encoding instructions alone do not disprove performance loss. The second2048 PNG median was9.4%/9.88ms lower; this is not a native target-gate pass.

Auxiliary Edge whole nearest2048 conversion medians were40.1→30.6ms Oklab (4/5 faster pairs) and39.8→29.8ms RGB (5/5). Sampled321×279 conversion was around1.1→0.9ms. These direct-core results justify a bounded actual-app/native experiment, not shipping. Node whole PNG timing includes compression worker startup; auxiliary conversion omits encoding/import/worker/UI.

Native gate remains fixed: at least10% AND10ms lower renderer CPU for practical1024/2048 nearest PNG/export, at least4/5 pairs faster, every paired output exact, and no adverse practical tiny/preview/entropy/Keep/dither/Cleanup/animation regression exceeding both5ms AND5%, new blocking or retained memory. No third correction/retry is planned.

Final native decision: **REJECT**, `row-cursor-native-decision.json` links the full
device arithmetic/raw receipts. Forty native outputs are exact. Paired sum CPU
savings are8.27%/12.117ms with3/5faster at1024 and7.11%/21.782ms with5/5 at2048.
No target meets the fixed10% AND10ms/4of5 gate. Native adverse expansion is unrun
after target failure, not passing. Production `quantize.js` remains unchanged.
