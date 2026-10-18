# Independent challenge: exact large 1-bit pattern counts

Date: October 17, 2026. Baseline: `34a95d9`. Scope: caption metadata only; no changes to image appearance, export, settings, source analysis, or sampling policy.

**Final agreement: do not ship this candidate.** Its counts were accurate, but the isolated Pixel 8 Pro settings probe reproduced an additional approximately 1–3 ms of CPU work per change. Production retains baseline behavior. The implementation and tests below describe a rejected research prototype, not an installed capability.

## Initial independent findings

The existing sampled pattern mask cannot certify full-resolution colors. Ordered patterns redraw their grid at the sampled dimensions; alpha and luminance can correlate with the original grid. The independent research harness compares full masks against sampled masks for 9,408 source/settings cases and five ink combinations (47,040 ink cases). Three Bayer cases show a sampled second role that never occurs in the full output. A correlated-alpha source is the counterexample; the samples must not be treated as exact positive witnesses.

A true source-coordinate probe would prove presence, but incomplete probes cannot prove absence. A fixed work budget must leave ambiguous results unknown. Publishing only after all possible distinct enabled RGB colors have been witnessed makes saturation exact, including one None ink or identical RGB inks. Never stop Original-source counting at the selected palette capacity.

The least expensive promising alternative uses the analyzed frame's existing 256-bin visible-luminance histogram. It reads no source pixels, allocates no full mask, copies no source to a worker, and can prove exact cases rather than estimate them. The proposed tone table must be shared with the converter rather than independently approximated.

## Mathematical challenge of the histogram proposal

For an ordered pattern, each occupied luminance maps to the converter's exact tone. If that tone never exceeds the smallest pattern cut, every occurrence is first ink. If it exceeds the largest cut, every occurrence is second ink. Intermediate tones may use either role because the histogram discards position. Unioning definite roles supplies a lower bound; unioning possible roles supplies an upper bound. Equal bounds certify exactness. Different bounds must remain unknown unless existing exact rendering or valid source-coordinate evidence resolves them.

JavaScript comparison semantics matter: `NaN > cut` is false and therefore the converter chooses first ink. A classifier must mirror this, or conservatively decline nonfinite tones; using only `<=` can accidentally discard an occupied luminance. Thresholds outside a frame's range, empty frames and constant frames must be tested. Histograms contain only pixels meeting the analyzed opacity cutoff. Automatic counting must not silently launch a different large source analysis.

Animation unification updates shared range and thresholds but retains each frame's own histogram. Count results describe the RGB union of all frames. Every frame must contribute exact evidence unless saturation already proves the maximum possible visible colors. Unproven later frames cannot be discarded merely because an earlier exact frame used one ink.

Atkinson and its Floyd/Stucki options are stateful. Independent spatial samples are invalid. A narrow histogram proof is safe when every occupied tone is exactly zero or one: Float32 rows then contain exactly zero or 255, quantization error is zero, and no kernel propagates any error. Any intermediate tone must remain unknown unless exact existing rendering provides evidence. This is deliberately not a second diffusion implementation.

## Acceptance requirements

- Compare unchanged converter mask bytes before/after extracting any shared tone-table preparation.
- Match an independent full-mask/RGBA oracle across every pattern, settings boundaries, source channels, alpha cut, None and identical inks, and unified animation frames.
- Prove an ambiguous alpha/grid-correlated case remains unknown, including after changing settings from a previously exact result.
- Keep inspection bounded by luminance bins and tiny pattern tiles, not image dimensions or frame pixel count.
- Preserve serialized cancellation, immutable analysis identities, stale-publication guards and tiny weakly cached metadata.
- Measure cold and repeated conversion separately; reject meaningful desktop or phone performance regressions.
- Run actual Codex Browser and connected Android acceptance at the parent level. This reviewer does not control those shared devices.

## Evidence

Run `node bench/large-pattern-challenge-2026-10-17/check.mjs`. Its full masks are the oracle and are research-only. The bounded-witness examples demonstrate that saturation is sound and incomplete observations remain common; they do not benchmark or implement a source probe. The initial script asserted the desired adversarial property before its fixtures covered correlated alpha; adding that fixture exposed the expected counterexamples. No production source was changed by this reviewer.

## Concrete candidate review and agreement

Round one reviewed the actual `patternRoleBounds` implementation and its large-only integration in `collectOneBitUsage`. Nonfinite occupied tones return unknown conservatively. Ordered bounds use the exact shared tone table and minimum/maximum cuts; scale and source phase cannot invalidate those conservative bounds. Atkinson accepts only exact endpoint tones. Partial role metadata is cached with `exact: false`; disabled and identical inks are handled at RGB level. An earlier uncertain animation frame remains uncertain unless the complete distinct visible-ink bound is reached. No full mask, source read, worker transfer or reanalysis was added.

The candidate passed `node bench/large-pattern-challenge-2026-10-17/oracle.mjs`:

| Independent check | Passed |
|---|---:|
| Full and sampled mask comparisons against frozen `34a95d9` | 576,000 |
| Full-source pixels compared | 194,342,400 |
| Direct histogram bound checks | 281,136 |
| Of those, exact role proofs | 264,144 |
| Unified-animation/ink combinations | 1,800 |
| Actual 769×513 large-source/ink cases | 100 |
| Large cases deliberately left unknown | 12 |

The large-source test replaces the analyzed luminance array with a throwing getter during metadata inspection. Successful results therefore cannot conceal a source luminance walk or mask conversion. Published counts match actual RGBA unique-visible-RGB unions from the frozen converter. The frozen baseline comes directly from its immutable Git object, so the unchanged-mask assertions do not compare the candidate with itself.

The additional owned fixture `ambiguous-alpha-grid.png` is 769×513. Its JSON contains the precise Bayer settings and a separate mathematical proof that the full output uses one ink, while its histogram lacks the spatial information needed to certify that count. Unknown is the correct automatic outcome; reporting two would be a bug. Parent acceptance covers this in the real app.

Inspection of Tile's unchanged publication flow found metadata outside the pixel-conversion derived value. The new helper has no reactive state. Publishing the caption result does not introduce a new mask dependency or conversion invalidation. Parent measurements remain necessary for actual browser and phone overhead; these stress assertions are accuracy tests, not performance claims.

No actionable correctness defect was found in the concrete first review round. The parent challenged the proof, nonfinite behavior, animation union and runtime ownership with this reviewer before accepting its accuracy evidence. The second focused round resolved performance acceptance with the agreed no-ship decision below. No speculative second algorithm or further runtime fix is pending in this narrow task. The separate whole-app performance handoff should preserve functionality and use bounded review rounds; it must not authorize endless speculative optimization.

## Performance acceptance challenge

Fresh desktop imports showed mixed, nonzero aggregate CPU differences. Checker paired TaskDuration differences were approximately +8.2, −9.2 and +7.2 ms; Noise +6.2, +15.3 and −1.7 ms. Median script costs were higher for some desktop styles even though paint latency essentially tied and no desktop long tasks were recorded. The reviewer explicitly rejected dismissing these differences merely because the isolated 256-bin helper is fast. Caption publication, layout, engine warmup, collection and source import can matter outside that kernel.

The native phone's initial paired import script differences were mostly improvements and mixed by style, with import long tasks present in both builds. These samples do not establish a new metadata stall, but neither do they prove universal zero overhead. The recommended final discriminating probe is a matched within-page warm threshold/settings toggle sequence after importing the same source, holding viewport, source and warmed caches fixed. Measure event-to-settled task/script time and frame gaps separately from import and cold first-caption publication. The parent owns these desktop/native acceptance measurements and their final ship decision.

### Independent warm desktop probe

`warm-ui.mjs` performs actual Threshold number-field edits, alternating 100/150 after importing the same 2048 sheet and opening Style. Two counterbalanced matched pairs cover Checker and Noise; each page discards five warmups then records twenty committed changes. Canvas instrumentation timestamps actual wall paints, and every candidate result must be current (`aria-busy=false`) and show two colors. Source-file transport and import are outside these measurement windows.

The gate was declared before running: repeated new >50 ms tasks or a >16 ms p95 input-to-paint regression rejects; a >1 ms median task/script increment in both matched pairs requires investigation. The initial restricted Windows temporary-profile launch failed before tests ran; the approved host run retained Chromium's sandbox.

| Style / pair | Median TaskDuration baseline → candidate | Median ScriptDuration baseline → candidate | p95 input-to-paint baseline → candidate |
|---|---|---|---|
| Checker / 0 | 11.565 → 9.535 ms | 6.129 → 5.373 ms | 7.6 → 7.0 ms |
| Checker / 1 | 8.937 → 17.293 ms | 4.876 → 11.724 ms | 8.4 → 15.4 ms |
| Noise / 0 | 11.611 → 7.734 ms | 5.366 → 3.874 ms | 14.4 → 18.7 ms |
| Noise / 1 | 10.757 → 9.616 ms | 6.365 → 6.182 ms | 14.4 → 13.8 ms |

No long tasks occurred in any recorded window. One candidate Checker page had a 33.2 ms frame gap; other maxima were approximately 16.6–16.9 ms. That page's raw script times changed from 3–5 ms to 8–16 ms, briefly returned to 3–4 ms, then rose again. It must remain visible in the evidence; the small helper cost alone cannot explain or dismiss it. The declared repeated-regression gate was not crossed, but this finite probe does not establish universal zero overhead. Parent should consider native warm results and any overlapping host load when making the final acceptance decision.

`warm-ui.mjs android` supports a root-controlled native run through CDP 9334 without viewport changes or closing the shared browser. This reviewer has not run that mode. It closes only its owned pages. The parent exclusively owns the connected phone and Codex Browser.

### Second focused acceptance review

The first native warm probe crossed the investigation trigger for Noise aggregate TaskDuration in both pairs (approximately +5.0/+2.1 ms), while script differences were −0.9/+1.7 ms and p95 input-to-paint differences +4.5/−0.8 ms. Checker differed by +3.0/+0.9 ms task and +0.7/+1.5 ms script. No >50 ms tasks occurred; baseline and candidate both had occasional approximately 33 ms frame gaps. This was investigated rather than automatically passed.

The follow-up isolated desktop run adds layout/style counts and durations, elapsed observation-window duration, and an assertion that every recorded warmed commit paints the wall exactly once. It preserves the original results separately. Every baseline and candidate page had a median two layouts and one style recalculation. Checker task differences were +1.2/+0.3 ms and script −1.6/+0.6 ms. Noise differences reversed by pair: −7.3/+11.2 ms task and −5.1/+6.0 ms script. All p95 input-to-paint differences remained below 16 ms; no >50 ms tasks appeared. Only a baseline Noise page had a 33.4 ms gap. Observation windows ranged roughly 31–60 ms, reflecting asynchronous input/protocol and two-frame settling, rather than just the histogram helper. The instrumentation initially asserted one paint during the first unwarmed change while opening Style was settling; the assertion now applies after the already specified five warmups.

The original desktop outlier may overlap host-side native-output oracle work; the isolated repeat avoids that work. These measurements show page-level variability, not a repeatable extra conversion/layout cycle. A speculative cache for a roughly 0.02 ms helper is not justified by multi-millisecond aggregate differences and would add new lifetime/identity risks.

The final isolated native repeat found a repeated Checker CPU increment: TaskDuration +3.251/+2.189 ms and ScriptDuration +1.605/+1.284 ms. Its p95 input-to-paint differences were only +0.5/+1.2 ms; baseline and candidate had the same median two layouts, two style recalculations and one paint. Noise was mixed: TaskDuration +1.703/−0.009 ms and ScriptDuration +0.109/+1.232 ms, with p95 +1.3/+0.5 ms. No new >50 ms tasks or extra rendering cycles were found.

### Final independent recommendation: do not ship

Accuracy review approves the mathematical proof and implementation. Performance acceptance does **not** establish a clear win under this user's strict conditional request. The native Checker script increment repeats across initial and isolated runs, on a path exercised repeatedly while changing settings. Small p95 differences and equal rendering-cycle counts do not erase that CPU increment. Its cause is not localized enough to justify an immediate safe correction, and optimizing only the approximately 0.02 ms histogram kernel would not address the measured whole-path cost.

The independent reviewer agrees with the parent's conservative no-ship recommendation: retain the existing accurate unknown-until-exact-evidence behavior and preserve the proof/prototype/evidence as research. Do not introduce an unmeasured synchronous fast path, new worker, or additional cache simply to force this feature through. The two focused review rounds are complete; another speculative optimization loop is not warranted. The whole-app performance handoff can document this bounded rejected candidate without silently reopening it as an implementation requirement.

The candidate oracle explicitly imports the retained `bench/large-pattern-counts-2026-10-17/candidate-recolor.js` and `candidate-onebit-usage.js`, asserts the histogram helper exists, and records SHA-256 module receipts. It therefore cannot silently skip candidate checks after production source is restored. The rescaled-counterexample harness independently loads the unchanged baseline converter from Git object `34a95d9`.

Historical UI measurements used the candidate temporarily served at port 5352 before production restoration. The retained warm UI harness now explicitly targets baseline 5354 and the frozen candidate build at 5355. Running the current app alone does not recreate the rejected candidate. Preserve/rebuild the isolated patched candidate as described in the parent's decision record before rerunning those UI comparisons. No benchmark or source restoration implies that the rejected behavior was shipped.
