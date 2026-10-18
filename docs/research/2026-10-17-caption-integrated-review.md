# Caption-count integration review

Date: 2026-10-17. Independent reviewer; coordinating task owns Codex Browser and physical Android acceptance. Scope: `5794b26` through the October 17 caption changes, including the pending App/Tile integration. This review does not claim every browser or arbitrary image size is covered.

## Round one

Reviewed shared export preparation, exact nearest summaries, their serial/cancelable queue, Original union identity/subscriptions, 1-bit role metadata, App publication ownership and caption ordering.

The converted early exit is valid only at saturation of the prepared output palette, including its selected subset. Original RGB counts must not stop at the target palette size. RGB/maximum-alpha summaries are sufficient for nearest membership under both Cut and Keep; dithering and Cleanup correctly bypass that shortcut. Counting a GIF's whole-clip union consistently avoids per-frame caption flicker.

Pending App records retain object identity, so sampled completion cannot replace an in-flight Reuse subscriber's publication guard. Source/settings changes abort old work; canceled queued requests check cancellation before scanning. No correctness defect was found in these paths during this pass.

Focused verification: **61 tests passed** across `source-color-summary`, `original-color-usage`, `palette-usage`, `palette-state` and `onebit-usage`. The initial Windows filesystem-sandbox run failed before importing tests because Vitest could not rename its temporary transform files; the approved host run passed.

The reviewer independently reran the retained Max colors marker counterexample. With black/white/red and 4×4 dithering, All uses black and white (two colors), while cap 2 uses only red and changes the output. Therefore the count at All cannot honestly mark the point above which this slider has no effect. Deferring that visual is correct; its absence is not a regression or missing algorithm fix.

### Finding: automatic full-resolution 1-bit masks need a performance bound

The current candidate can create a full-resolution mask solely for caption metadata after every 1-bit style/settings change. This is additional work when the wall only draws a sampled mask. Yielding before that mask makes input possible before work begins; it cannot interrupt the synchronous mask once running.

To challenge the parent's concern that cold structural preparation was being double-counted, the reviewer decoded the real 2048×2048 Kenney sheet, analyzed it separately for each style, ran the existing **512×512 sampled mask first**, then timed the additional full-resolution mask on that same analysis. This warms `spritesOf`/`iconOf` through the baseline path before measuring the new full mask.

| Style | Baseline sampled mask, ms | Additional metadata full mask, ms |
|---|---:|---:|
| Cutout | 5.94 | 59.88 |
| Solid | 2.60 | 18.38 |
| Lines | 4.01 | 47.44 |
| Stencil | 61.52 | 48.36 |
| Icon | 191.77 | 18.44 |
| Checker | 2.85 | 23.05 |
| Bayer | 1.51 | 18.37 |
| Hatch | 1.62 | 18.95 |
| Atkinson | 4.12 | 45.71 |
| Noise | 1.44 | 21.82 |
| Silhouette | 1.06 | 13.37 |

These are one cold Node trial per style, **not phone frame-rate claims or stable medians**. They demonstrate additional synchronous work independent of preexisting structural preparation, including one new task over 50 ms. The parent must compare practical browser/device traces before accepting unlimited automatic masks.

Proposed bounded correction: use already-created exact masks first, optionally accept a proven saturation result from coordinate-preserving structural sample masks, and cap otherwise automatic full-mask generation. Pattern/Atkinson masks drawn afresh at smaller dimensions cannot establish full-source membership. Missing information must remain unknown rather than become an estimated exact count. A mask-worker or cooperative mask rewrite would be a larger independent performance change and requires its own evidence.

### Finding: current documentation still describes superseded scheduling

At review time, `CLAUDE.md` and `docs/performance.md` still say sampled walls start no extra inspection, sampled completion retires retained counts, and closing Preview cancels automatic counting. The candidate instead starts shared automatic wall inspection and keeps it alive after Preview closes. Update those contracts with the implementation and retain the old behavior only in dated historical evidence.

## Round two / resolution and final checks

The proposed 1-bit correction now caps automatic missing full-mask generation at 262,144 pixels per frame. Already-rendered full masks remain usable regardless of size. Coordinate-preserving structural samples supply presence lower bounds; a result becomes exact only once every possible visible RGB ink is proven present. Large missing or partial evidence returns unknown. Pattern and diffusion samples remain excluded. A matching-analysis guard also prevents a count request from launching large source reanalysis. The reviewer agrees with this bounded policy.

The focused suite after this correction passed **65 tests**, including pointwise sample-to-full parity for six structural styles, varying line thickness and icon/outline controls; large missing-mask rejection; exact large-cache acceptance; sampled-pattern rejection; and missing large-analysis rejection. This changes no mask algorithm, subset selection, source weighting or export bytes.

The Tile now publishes metadata outside its conversion-derived value, deduplicates each rendered mask with a WeakSet and advances a metadata revision for useful new evidence. Its counting subscription also rechecks when the wall becomes active after Preview closes. The reviewer independently tested the resulting production build at port 5352 with sandbox-enabled Edge.

`node bench/caption-integrated-review-2026-10-17/check.mjs` passed nine scenario groups with no page errors:

- Eight rapid cap commits plus Matching, Cleanup and dithering changes retained the two-color caption; no observed text-removal transitions.
- Desktop, touch portrait and touch landscape kept metadata in the requested order and the resolution anchor stationary.
- Actual Original comparison changed a second imported image from two converted colors to six source colors and back to two, on all three presentations.
- A sampled 2048×2048 Cutout wall proved exact two-ink saturation without an extra full mask.
- A sampled 2048×2048 Bayer wall initially withheld an unproven count. Six Preview zoom steps produced full-source rendering; closing Preview updated the existing wall to two colors without changing unrelated settings.

The first extended harness run found an ambiguous test selector after the Palette panel opened; it matched both the family choice and panel toggle. Restricting it to the explicitly labeled toggle fixed the harness. This was not an app failure. Results are retained beside the script.

The reviewer and parent agree on both corrections: bounded automatic 1-bit work with precise unknown states, and documentation that reflects automatic wall scheduling. No unresolved production defect was found in this bounded review. The coordinator still owns final documentation reconciliation, full-suite results, native-output verification, actual Codex Browser and physical Android acceptance; these independent headless checks do not substitute for those results.

### Round-two closure

The reviewer read the reconciled current `CLAUDE.md`, output-color section of the spec and `docs/performance.md`. They now describe automatic serial wall inspection, shared Preview/Reuse requests, retained pending presentation, cached Original unions, bounded 1-bit work and truthful unknown states. The documentation finding is closed.

The final Silhouette bound is also sound: its conversion fixes the threshold at 255, so a visible pixel cannot select role 2. The helper can therefore treat only the first ink as possible; first ink None produces zero colors, including when the second ink is opaque. The reviewer independently ran all **14 final one-bit tests**, which passed. This refinement adds no mask conversion or setting.

The coordinator reported a final full suite of **1050 passed, 2 skipped**, sixteen native-output acceptance groups and eighteen palette ZIP comparisons, and actual Codex Browser checks of a 2048 sheet changing from 26 to 25 used colors after RGB Matching without opening Preview. The reviewer read the retained native-accuracy and acceptance receipts and the physical Android script/results; these are coordinator-performed tests, not independent device operations by this reviewer.

The physical Android receipt records a 448×819 portrait viewport, a seven-source wall including the 2048 sheet and a genuine GIF ready in approximately **509 ms**, no observed long tasks in that bounded run, and no page errors. Settings changes retained the two-color caption with no observed text-removal transitions or long tasks. A native saved PNG was decoded independently and compared pixel-for-pixel with an independent nearest-color oracle, and a 1-bit GIF with a transparent ink reported one used color. These findings close the agreed device-acceptance dependency for this change.

The two agreed findings are closed; no third broad review was opened and no production edits were made by this reviewer. Remaining limits are explicit:

Parent's subsequent strict-filename readiness rerun passed 18 desktop acceptance
groups (including true transparent zero and Shape's established None fallback)
and all six Android groups. The latest native seven-source observation was about
549 ms with the same zero observed long tasks/text removals; these are parent
retests of the accepted implementation, not a third independent review round.

- This acceptance covers practical sources and finite interaction sequences. It does not establish universal absence of bugs, constant frame time, a whole-app heap bound or performance with arbitrary enormous clips.
- The physical Android receipt is portrait. Responsive landscape geometry was checked with browser touch emulation; that is not a fresh physically rotated Android test.
- Mac, iOS and Safari were not tested in this task.
- Large 1-bit pattern/partial-ink outputs may intentionally omit a count until existing exact rendering supplies evidence. Automatic caption work does not manufacture a guess or force a large synchronous mask.
- Cold permitted structural masks remain synchronous, existing structural preparation can still block, and cooperative timing targets are not hard deadlines.
- This change does not modify color-reduction algorithms, Keep weighting, palette selection or output formats. Its acceptance does not establish universal visual superiority over another service.
