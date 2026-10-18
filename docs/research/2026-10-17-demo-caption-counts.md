# Empty-wall example color counts — October 17, 2026

## Decision

The empty-wall example uses the same exact count collection, pending state,
Original comparison and `CaptionMetadata` component as imported artwork. Its
metadata stays left aligned: `60 × 60 · 6 colors`. No separate demo counter or
estimated sampled count is introduced.

Five internal count-liveness checks in App now follow `canvasItems`, the existing
list of visible imported items or the current example. User Reuse and export
checks still require imported items. The example remains a primary Add button,
without nested controls or a new export action.

## Source identity challenge

Light and dark examples deliberately share ID 0 but have different immutable
source objects. The metadata map checks the item object as well as its key, and
publication requires that exact object to remain in `canvasItems`. Switching
theme, importing the first image or removing the last image therefore cancels
obsolete requests and prevents a previous demo result from describing a new
source. The keyed Tile also remounts when the example original changes.

Auto is not a fixed-palette exception: `captureGeneratedWallSources` captures the
current example alone when the real wall is empty, and real artwork alone when
present. Metadata uses the same captured `asking()` snapshot as the conversion.
Generated-pending/error checks remain active; retained swatches are never treated
as the new example's palette.

## Verification

`bench/demo-caption-counts-2026-10-17/check.mjs` exercises the production build in
Edge with Chromium's security sandbox enabled. `results.json` records ten passing
scenario groups, with no page errors:

- Desktop 1280×900 and touch emulation at 390×844 and 844×390: exact light/dark
  output counts, Original Space comparison, restored converted count, left order
  and caption bounds.
- Auto, Resurrect 64 and ENDESGA 32: automatic six-color example counts, RGB and
  Oklab changes, import replacing the demo, and last-item removal restoring it.
- 1-bit Cutout: two actual colors or one when its first ink is None. Shape: one
  actual used ink, including when the unused second ink is None. Original shows
  the six source RGBs and release restores the converted count.

An independent Sharp decode and scalar nearest matcher establish a useful
source-identity oracle: Black & White uses **two** colors on the light demo but
**one** on the dark demo; both originals contain six visible RGBs. This tests a
real count change rather than two theme variants that happen to have equal
counts. Screenshots are retained for desktop and both emulated touch layouts.

Two initial harness assumptions were corrected before accepting evidence:
the outer example figcaption uses `display: contents`, so geometry must measure
the actual Add button; Shape uses its first ink, and making its unused second
ink None correctly leaves one visible color, rather than zero.

`npm run build` passed. This agent did not operate the shared Codex Browser or USB
phone; the parent owns those independent integration checks. Touch emulation is
layout coverage, not a physical-device performance claim.
