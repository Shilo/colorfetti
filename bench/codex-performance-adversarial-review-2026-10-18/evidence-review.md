# Independent adversarial evidence review

Reviewed the frozen Codex performance audit, causal construction, source/research
ledgers, focus/retention harnesses, retaining-path diagnostics, native output
oracles, provenance and raw matched trials. No production changes, browser/device
operations or fresh timing measurements were performed by this reviewer.

`evidence-check.mjs` preserves the bounded independent checks and writes
`evidence-results.json`. It verifies all 451 indexed artifact hashes and the
96-entry inventory against the baseline tracked implementation/configuration
boundaries. Inventory coverage is not evidence of source reading by itself;
the separate functional ledgers provide the authors' reading accounts.

The retained native PNG/GIF/ZIP witnesses independently decode and scalar-match
56 frames / 3,152,384 pixels, including frame delays and loop metadata. Four
focus PNG witnesses match their retained hashes. One-bit outputs are deliberately
excluded from this scalar nearest-color oracle. These are new checks of retained
files, not new native transport executions or measurements of today's source.

The memory correction is well supported: never-Preview source removal returns
595,193 backing bytes, Preview-close-remove retains 22,976,754 bytes, replacing
its saved trigger returns 615,727 bytes, and the isolated fix returns 595,933
bytes. The retaining path and controlled replacement agree with the persistent
App focus target retaining a detached Tile caption and its frame buffers. This
is bounded last-source retention, not OS process memory, peak usage or unbounded
growth. The snapshot parser is not a complete dominator/ephemeron analysis;
controlled baseline/candidate behavior is essential to the causal conclusion.

Both focus trials preserve the reported observations. Pointer close renderer CPU
is directionally adverse: paired +6.684 ms / +21.25%, then +4.615 ms / +16.57%.
Keyboard CPU increases are +2.229 ms, then +1.179 ms. These broad measured action
windows are not pure handler cost. Close-event-to-next-task latency does not
establish full input-to-visible-close latency. The report correctly preserves
the uncertainty; do not present the correction as a CPU speedup or proven absence
of performance regression.

## Gate provenance qualification

The explicit claim that the CPU repeat rule was predeclared is in the historical
`../codex-independent-performance-2026-10-18/preview-trigger-decision.md:43`.
The main audit report does not itself use that explicit word for this CPU rule;
an earlier reviewer message abbreviated this distinction incorrectly.

The original retained `preview-trigger-plan.md` declares a 5 ms AND 5% latency
limit. It does not specify the later CPU repeat rule requiring four worse pairs.
The final sidecar records that rule, but the artifact set does not independently
prove when it was chosen. It could have been announced in the original chat;
that chronology was not verified here. Preserve this qualification rather than
rewriting the frozen measurements, declaring absence of CPU regression, or
asserting that the rule was necessarily selected after measurement.

## Scope and disposition

The old audit validates frozen runtime `ae97d0e`, excluding subsequent external
GIF/import implementations. The coordinator's fresh current-build checks belong
to a different scope: frozen current `6f8238a`, 1,091 passing tests / two existing
skips, successful build, and 13 Codex Browser check groups. Those results are
recorded separately in this review directory; this reviewer did not execute
those checks and does not relabel them as new Android evidence.

Recommend retaining the Preview lifetime correction and safe Vitest discovery
fix. No production defect or runtime revert is justified by these checks. Retain
CPU uncertainty and finite source/platform/coverage limitations. Preserve the
old 451 indexed artifacts unchanged and publish this review as a dated addendum.
