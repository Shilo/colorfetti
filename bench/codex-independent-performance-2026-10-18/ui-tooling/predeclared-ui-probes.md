# Predeclared bounded UI attribution

Written before this reviewer collects UI timings. Current baseline revision5ae11b1 is retained; production runtime is unchanged. Auxiliary Edge measurements, if performed, are diagnostics and do not replace actual Codex Browser or authorized Android acceptance.

## Editor Review

Observed by the exclusive native controller: a fresh approximately188ms Review long task. The hypothesis is that initial64 swatch setup (tooltip hidden elements/listeners and canvas2D contexts) explains a substantial part; the alternative is native style/layout unrelated to either.

Attribution clarification received after the auxiliary run: the native187ms task belongs to the full editor workflow; Review itself has not yet been isolated. The initial "Review" label above reflects the first report, not a proven function attribution. Native follow-up must separate panel open, editor open, method switch, Review and paging. The criteria below are unchanged.

Prepare immutable historical-source variants with `prepare-ui-variants.mjs`, not live edits. Variants are baseline, diagnostic tooltip-off, swatch-paint-off (canvas DOM retained), both-off, and raw-arrays (colors/baseline/selected only). The off variants intentionally remove behavior/paint and are **never shippable**. They measure causal share; no performance claim may use their output as equivalent.

Run three alternating matched samples of opening a new editor, pasting256 distinct HEX colors, selecting Review and waiting two frames for the64 displayed swatches. Record renderer TaskDuration/ScriptDuration/LayoutDuration/RecalcStyleDuration, click-to-ready/double-rAF, long tasks, DOM count, visible swatches and total color count. All variants use same host, viewport, fixed seeded settings, inputs and dependency set. No concurrent builds/profilers. First separate module/process-cold observations from warmed trials. A review256 then page2/page1 sequence separates mount from update.

Attribution proceeds only if removing one subsystem consistently reduces the target by >=15ms and >=10% in paired medians, with direction in each pair. Raw arrays are eligible only if their full-app benefit independently clears >=10ms and >=5%; a2ms kernel result cannot justify a change for the188ms stall. These are diagnostic prioritization rules, not a license to change behavior. No threshold retuning after timing.

Only after attribution may the coordinator authorize a narrow equivalent candidate. Native and actual Codex Browser must then confirm it. Any candidate must preserve accessible descriptions at initial mount, immediate keyboard focus tooltip, mouse350ms/touch500ms timing, pointer-cancel/scroll/Escape/blur behavior, dynamic descriptions and full teardown; swatches must preserve exact opaque paint, forced-dark protection, empty clearing and invalid-input atomicity. Require existing unit assertions, fresh UI behavior, no repeatable unrelated workflow regression >5ms and >5%, no extra retained source/cache and no new long task. Stop after at most two challenge/correction rounds.

## CanvasGrid

First use counters, not a production variant. Record actual root CSS variable calls/same values, #app childList callbacks and callback CPU, first-art clientWidth/BCR reads, and style/layout totals during import1/2/4/8, ten preset changes with rail open, editor256 Review/paging, removing the first tile and returning to demo. Source predicts redundant callback→measure→same-anchor writes; double-rAF coalescing and browser same-value handling may make cost negligible.

Do not infer layout invalidation or a speedup from write counts alone. An equivalent trigger/equality candidate is worth testing only if combined measured CPU/style/layout share is >=5ms in a common single action or >=10% of the relevant repeated workflow. Geometry/phase must match at settled frames for both themes, resize, short portrait/landscape, first tile replacement and tool refits. No added scroll lag, reanchor drift, listener growth or stale anchor. If cost is below those bounds, document the lead without shipping complexity.
