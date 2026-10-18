# Caption metadata alignment — 2026-10-17

## Decision

Resolution stays against the caption's aligned edge while the used-color count
changes or is absent. Right-aligned mouse captions show `2 colors · 192 × 192`.
Left-aligned touch captions show `192 × 192 · 2 colors`. The example always uses
the latter order beneath its name, because its metadata is always left aligned.

The responsive rule follows existing layout CSS: `(hover: none)` selects touch
caption stacking even on wide landscape screens. Narrow fine-pointer desktops
retain their right-aligned metadata. Width alone would incorrectly reorder these
two cases. Existing `stack-captions` touch overrides do not change the outcome.

## Implementation

`CaptionMetadata.svelte` owns shared dimensions, separator, plain used-color text,
pending `aria-busy`, shared tooltip and existing retry message. Its external global
CSS file changes flex order, preserving the same dimension fragment. The component
has no pixel work, timer, measurement, observer or count calculation. Count readiness,
retention and original-comparison selection remain the caller's responsibility.
The example's Add target retains one button with noninteractive metadata inside.

The ordinary Tile caption is intentionally hidden in Preview by
`bottom-workspace.css`; this change does not add a new Preview bar or action.

## Challenges and limits

- Reserving a fixed count width would leave permanent empty space and truncate
  filenames unnecessarily. Edge-based ordering avoids that cost.
- A viewport-only breakpoint would misclassify phone landscape and narrow desktop.
  Existing hover-based caption alignment supplies the actual condition instead.
- DOM reading order remains resolution then count on both devices. CSS swaps the
  visual fragments only; both convey the same concise metadata. No live region is
  added, avoiding repeated announcements during slider edits.
- This isolated fixture verifies geometry and retained pending presentation, not
  whether upstream conversion publishes the correct count. Root integration tests
  separately own count readiness, Original, animation and native-device behavior.

## Reproducible checks

Run `node bench/caption-layout-2026-10-17/layout-qa.mjs`.

Sandboxed Edge 155 checked 20 viewport/input combinations: widths 320, 390, 520,
800 and 1280; heights 390 and 900; mouse and touch. Every combination checks an
ordinary caption, `stack-captions`, and the example at no count, two colors and
256 colors, plus pending-state geometry. Resolution x remains invariant within
0.1 CSS pixels, visual order matches alignment, metadata remains inside the title
bar, and the example contains no nested button. Receipts and four screenshots live
in `bench/caption-layout-2026-10-17/`.

The fixture is built independently before testing, to avoid scanning unrelated
historical QA HTML through a live development server. It preserves Chromium's
sandbox. Physical Android and actual Codex Browser integration are owned by the
parent task rather than claimed by this isolated headless run.
