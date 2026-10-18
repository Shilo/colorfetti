# Max colors slider marker — research decision

Date: October 17, 2026. Status: **defer the marker; do not change the slider.**

The user proposed a subtle mark at the largest useful color count among wall
images. The intent is useful: explain why increasing a 64-color limit may make
no visible difference to a two-color sprite. A mark called an efficiency limit
would, however, make a stronger promise than our current metadata supports.

## What was tested

`node bench/max-colors-marker-2026-10-17/check.mjs` runs the actual full-source
Palette export pipeline on an owned opaque 8×8 midgray fixture with a three-color
black/white/red target. The script asserts its results and writes `result.json`.
This is a deterministic algorithm check, not a browser performance measurement.

| Mode | Colors at All | Limit | Colors after limiting | Pixels unchanged? |
|---|---:|---:|---:|---|
| Nearest, Oklab | 1 | 2 | 1 | Yes |
| 4×4 dithering, strength 100% | 2 | 2 | 1 | **No** |

The dithered All result uses black and white. The limited result uses red.
`fullPaletteImage` selects a nearest-based subset before dithering, so setting a
limit equal to the number of colors used at All can still change the image.
That is existing conversion behavior, not a proposed bug fix. A fixture is enough
to disprove the universal no-effect promise; it does not establish how frequently
this happens in artwork or judge either result aesthetically.

## Why the obvious measurements are insufficient

- **Current output counts:** a limit of four usually produces at most four
  colors. Drawing a marker at that count mostly follows the control being edited;
  it does not tell the user what the image could use without the limit.
- **Original counts:** target matching can merge source colors, dithering can
  introduce multiple target colors, and Opacity Cut/Keep changes eligibility.
  Original counts cannot stand in for uncapped converted counts.
- **All converted counts:** these can honestly describe that one conversion,
  but the reproduced case proves they are not a general no-effect threshold.
- **Partial wall metadata:** sampled previews deliberately do not publish exact
  source counts; animated counts need every frame. Taking a max over only the
  completed images can underestimate the wall maximum. Retained previous captions
  are presentation state and must not become current slider advice.
- **Current cache:** App retains current-key usage and one last completed
  presentation result. It does not retain a separately keyed, complete uncapped
  result for every current image while the cap changes.

The correct aggregate would be the **maximum** of complete per-image counts,
including each GIF's union across all frames; it would not be a sum or a union of
colors across different images. For example, two sprites with six and eight
colors give a maximum of eight even if their union has fourteen.

## Performance and honesty gate for any future version

Do not start full-source counterfactual All conversions, inspect extra animation
frames, or scan pixels just to decorate a slider. Those costs can exceed the
metadata display cost substantially on large sheets and clips. An O(number of
images) maximum over already-completed tiny metadata, recomputed only when that
metadata changes, would itself be cheap. The expensive part is obtaining the
missing uncapped facts, not drawing a line.

A safe future exploration could show **“Most colors used at All: 8”**, with an
accessible description explaining it describes the uncapped conversion and is
not a guarantee that every limit above eight is identical. It would require:

1. Exact, completed All results for **every** current image and frame, matching
   source identity/duration, palette/Auto request, matching, Cleanup, dither mode
   and strength, and opacity mode/cut. Only the cap may be excluded from that key.
2. Small immutable metadata only; no new converted frame cache. Hide the marker
   immediately for missing, stale, failed or partial records. Never borrow the
   previous-output caption. Original comparison does not change this All baseline.
3. No conversion or inspection solely for this marker. Accept that it will often
   be absent after settings/source changes until an All result happens naturally.
4. A tick outside the thumb's hit target, behind the thumb in painting order,
   pointer-inert and hidden from the accessibility tree; attach its description
   to the existing range instead of creating a focusable control.
5. Position using the actual range min/max and half-thumb travel inset. A value
   of one is below the normal min of two and must not be clamped into a falsely
   labelled two-color position. Hide disabled one-/two-color range markers and
   endpoints that add no information. Test 2-of-64 at narrow landscape widths:
   that mark is near the left edge, so avoid inline text around the thumb.
6. Do not extend the track fill to the marker: the fill currently describes the
   selected value. A second fill would blur current setting and reference data.

This is a possible design constraint list, **not an approved implementation or
mock-up**. A hidden-until-complete marker with a qualified meaning is weak value
relative to its extra state and explanation. Current image caption counts plus
the explicit All control remain clearer for this batch. Finish caption correctness
and stability before considering more slider decoration.

## Scope and review

No production source, range bounds, value, interaction or conversion behavior was
changed by this investigation. The evidence uses local production modules only;
it introduces no competitor source details or service dependencies. Browser and
USB device access belong to the parent task; this deferred proposal needs no
device benchmark because no new runtime behavior is being shipped.

Independent whole-change review should challenge this decision alongside the
caption fixes. Reopen only if a concrete design can explain the qualified All
reference intuitively without extra counterfactual work.
