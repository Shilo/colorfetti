# Auxiliary editor causal probe decision

Fresh24 samples, three alternating pairs for each of four alternatives, Edge155.0.4283.62, headless,927×827,DPR1, browser sandbox enabled. Five source variants were independently built from baseline5ae11b1 with installed dependencies; all builds exited0. Each trial used a new context/page with fixed light theme and ENDESGA32, new editor,256 distinct gray HEX entries and64 visible swatches. Browser process was shared; these are source/page-cold cases within a warm browser process, not full process-cold or phone results.

| Diagnostic alternative | Baseline CPU median | Alternative CPU median | Median paired CPU saving | Every pair faster | Predeclared attribution gate |
|---|---:|---:|---:|---|---|
| No tooltip action |21.84ms|20.85ms|2.40ms|No|Fail|
| No swatch painting, canvas DOM retained |20.84ms|20.53ms|−0.74ms|No|Fail|
| Both omitted |23.63ms|16.69ms|4.12ms|Yes|Fail: below15ms absolute|
| Raw colors/baseline/selection arrays |21.80ms|21.26ms|0.94ms|No|Fail|

Layout duration was below1ms in every sample. Script differences were small. The both-off click-to-two-frames changed47→30ms and46.5→30.3ms in two pairs, but44.6→43.4ms in the third; do not present a stable16ms latency improvement or ship behavior-removing diagnostics. Raw arrays did not clear their10ms/5% full-app gate. These results do not reproduce or explain the native whole-editor187–188ms task and cannot replace native causal attribution. No runtime candidate is accepted from this probe.

Raw receipt: editor-attribution.json; paired arithmetic: editor-attribution-summary.json; execution log: editor-attribution-host.log. Initial restricted-process Edge launch attempts failed before any page opened (editor-attribution.log and editor-attribution-workspace-temp.log). The same local harness succeeded through approved host execution with Chromium sandbox explicitly retained; no user browser/profile was attached.

**Long Task qualification:** the initial auxiliary harness filtered entries by start after the document click marker, which could exclude an input task beginning just before that marker, and did not drain pending records on disconnect. Its raw longTasks arrays are therefore incomplete; no zero-Long-Task claim is supported. Renderer TaskDuration/ScriptDuration/LayoutDuration/RecalcStyleDuration deltas and click-to-two-frames arithmetic do not depend on that filter. The runner source now uses time overlap and takeRecords for future runs. Existing raw receipts remain unchanged and are not relabeled corrected. Native follow-up must use the corrected observation logic.

Native next falsifier is three alternating pairs of **base versus both-off**, recording distinct stages (palette panel, new editor, Paste colors, Review and paging) plus full flow. The previous native187ms task was captured in a full editor workflow, not yet conclusively isolated to Review. If both-off cannot reliably remove>=15ms and>=10% of a reproduced stage, stop this mechanism; do not infer a shared-tooltip or canvas architecture rewrite from a generic editor task.

## Subsequent native falsifier, collected by the exclusive Android controller

The planned follow-up is complete; [native receipt](../io-android/editor-causal-all-codexio-editor-causal-1792319566983.json) belongs to that controller and is not auxiliary Edge evidence. Its three alternating base5401/both-off5404 pairs used corrected Long Task overlap/draining. The long task occurred in **Paste256 HEX plus Tab blur**, with baseline185/180/183ms and both-off185/190/179ms. Review had no>=50ms task and less than1ms layout. Whole-flow TaskDuration was539.073/542.843/565.066ms baseline versus509.861/536.443/449.947ms diagnostic, savings5.4%/1.2%/20.4%. The predeclared materiality/reliability gate fails; no individual variants or further editor retries were justified. Native keyboard/blur/IME transport may contribute to the slow Paste stage, so these trials neither prove a production app bottleneck there nor attribute it to tooltip/paint. The diagnostic intentionally removes behavior and remains unshippable. No runtime UI optimization was accepted.
