# Conversion, output and UX review

October 18, 2026. Review only; no production code changed.

## Recommended fixes (summary)

**Fix now (small):**
1. **Dithered previews show the wrong image.** When a tile shows an image smaller than full size, the dither pattern breaks up and the tones come out wrong. Saved files are unaffected. One-line fix (finding 1).
2. **GIF import errors.** A rejected GIF is reported as an unsupported file type. Slightly damaged GIFs that browsers play are rejected entirely (finding 5).
3. **Stencil flickers on animations.** Pixels that don't change between frames still switch color (finding 6).
4. **UX bugs.** In Palette mode the scroll wheel and ↑/↓ do nothing. The palette editor discards unsaved edits on Escape or a click outside (UX 1–2).

**Do next:**

5. **Smaller GIF exports.** Writing only the changed part of each frame makes files 38–76% smaller (finding 4).
6. **Dithering.** Gradients band with small palettes; considering 8 candidate colors instead of 4 should fix most of it (finding 2). Separately, dithering photos and gradients can be 4–10× faster (finding 3).

**Needs a decision:**

7. **Integer upscale on Save (2×/4×/8×).** Pixel art saved at 1× is too small to share. The spec currently excludes this.

**Don't pursue:** tone pre-map ("Tone fit"), blue-noise dithering, more matching metrics. All tested worse or no better.

## Details

The full review follows. Four independent
reviews ran in parallel: online research on color conversion, an empirical audit
of the full-palette pipeline (16 images × 7 palettes × 15 methods), a 1-bit and
codec audit checked against Pillow and Chrome 152, and a UX pass driven by
Playwright at 1440×900 and 390×844 with touch emulation. Each claim kept below was
spot-checked against the code. Evidence is in
[bench/conversion-review-2026-10-18](../../bench/conversion-review-2026-10-18/). Contact-sheet PNGs there are
local only, because bench/.gitignore excludes PNGs.

Earlier decisions that this review **confirms** and that should not be reopened:
- Oklab/RGB matching (the CAM16, CIEDE2000 and ΔE OK2 closure).
- Ordered rather than error-diffusion dithering for animations.
- Mixing in linear light and scoring in Oklab.
- One shared Auto palette and one Max colors subset per GIF.
- Otsu as the general 1-bit Auto threshold.
- Exact decoding of 16-bit PNG, gAMA, Display-P3 ICC, EXIF orientation, CMYK JPEG, and GIF interlace and disposal.
- Exact PNG, GIF and ZIP encoding.

## Ranked findings

### 1. Dithered previews misrepresent the export (bug, one line)

`convertDither` (src/lib/palette-dither.js) takes the Bayer rank from **source**
coordinates `xs`/`ys`. Whenever a tile shows a smaller picture, the sampled source
pixels hit a fixed subset of pattern cells:
- At an exact 2×/4×/8× step every sample lands on the same cell. The preview then posterizes and the tones are wrong.
- At other steps you get large checker moiré. `layout.shown()`'s own 1.06 nudge produces 2.13 steps that beat slowly against the pattern.

The 1-bit family already avoids this by drawing patterns in preview coordinates
(`recolor.js` pattern `cxs`). Reproduction:
[dither-preview-alias.mjs](../../bench/conversion-review-2026-10-18/dither-preview-alias.mjs).
A 512px black→white ramp, 4×4 dither at 100%, shown at 128px gives these white fractions per eighth of the ramp:

```
export       0.02 0.06 0.09 0.16 0.29 0.46 0.68 0.94
preview 4x   0.00 0.00 0.38 0.13 0.00 0.00 0.00 0.63
```

Across 45 image/size/palette cases, the preview's error against a box-downscaled
export fell from 1.8 to 0.8 (σ2 Oklab ΔE×100) with output coordinates. That
improved 40–44 of the 45 cases, depending on the pattern size. Fix:

```js
index = ranks[(Math.floor(o / result.w) % side) * side + (o % result.w) % side] < (plan >>> 16) ? …
```

Exports are byte-identical, because `xs`/`ys` are the identity at full size and plans are
position-independent. This corrects the claim in 2026-10-14-full-palette-dithering-implementation.md
that source sampling keeps "pattern phase" in agreement: that holds only at 1:1. See
`sheet-preview-vs-export.png` (local contact sheet).

### 2. Palette dithering bands on smooth gradients (quality)

Each color mixes only one pair taken from the **4 nearest** candidates. Across a
gradient the candidate set switches abruptly, leaving hard band edges and halo
rings. The sun in `sheet-syn-sky.png` (local contact sheet)
shows this with ENDESGA 8 and PICO-8, even at 100%. Two independent measurements agree:
- On random colors, mixture error with 4 candidates is 28% worse than an exhaustive pair search on PICO-8 and 24% worse on ENDESGA 8. With 8 candidates it is about equal to exhaustive. The bound of 4 was never tested against 8.
- Knoll pattern dithering keeps the animation-safe property (a per-RGB plan, no error crossing pixels or frames). With mid-size palettes it cut false contours from 34 to 11 and σ2 error from 3.07 to 2.88. On an anti-aliased shaded sprite with ENDESGA 8 it cut error from 5.30 to 1.73. It **loses** on grayscale and very small palettes, and adds multi-hue sparkle with ENDESGA 8. See `sheet-syn-aa-sprite.png` (local contact sheet).

Recommendation, cheapest first:
1. Use 8 candidates when the palette has 16 colors or fewer. This costs about 4.7× per *uncached* color only.
2. Prototype Knoll (the patent has expired) as a hybrid for palettes of 12 or more colors, behind the same Dithering control. Do not make it a drop-in replacement.

### 3. Dither memo collapses on smooth sources (performance)

The 4096-entry memo is abandoned once misses outnumber hits 3:1. Gradients, AI
art and photos then pay the full mixture search on every pixel. Bayer 4×4 measured
471–2512 ms/MP on a 512px synthetic photo, against 58–337 ms/MP for nearest
matching. A bounded 64K-slot direct-mapped table (about 512 KB, the pattern
`palette-cleanup.js` already uses) would hit:
- 84% on the portrait (0.4% today)
- 90% on the synthetic photo (18.5% today)
- 21% on a ±12-noise photo

That is a 4–10× speedup on smooth inputs. It is not yet measured on real camera photos or phones.

### 4. GIF exports are 38–76% larger than necessary (output)

`gif.js` and `encodePaletteGif` write every frame full size with disposal 2.
Cropping to the changed rectangle, with unchanged pixels transparent and disposal 1/2 as
needed, decoded exactly through the app's own decoder:

| Animation | Full frames | Differenced | Saving |
| --- | --- | --- | --- |
| 320×240, 24 frames, Bayer | 54,293 B | 13,188 B | 76% |
| same, Solid | 23,296 B | 7,790 B | 67% |
| same, Atkinson | 186,309 B | 115,084 B | 38% |
| 160×120 transparent sprite, Cutout | 8,094 B | 3,420 B | 58% |

A transparent index is needed for the "unchanged" pixels. Palette GIFs that already
use all 256 entries must keep full frames.

### 5. GIF import is stricter than browsers, and failures are mislabeled (bugs)

- `App.svelte` counts every decode error as "skipped" and then says "Colorfetti reads PNG, GIF, WebP, JPEG and BMP images". So a rejected GIF is reported as if GIF were unsupported. Show the decoder's own message instead.
- Chrome plays several files that Colorfetti rejects whole: GIFs truncated mid-frame (common in real downloads), a missing LZW end code (`gif-decode.js`), and frames extending past the logical screen (`gif.js`).
- A 0×0 logical screen reports "This image is too large."
- Keep fully decoded frames and stop at the first damaged frame. Clip oversized frames.
- Leave the documented strictness about out-of-range indices and plain-text extensions as it is.

### 6. Stencil flickers on opaque animations (bug)

`sprites()` in recolor.js builds Stencil's level, Otsu and median body tone from
each frame's own histogram. In a repro with two 20×20 frames, a box whose pixels
are identical in both frames flips all 64 of its pixels between frames once frame 2
adds an unrelated dark band. docs/styles.md promises that Auto is picked once per
animation. Either use the unified frames, as Cutout, Solid and Lines already do, or
document the flicker, as Icon's section does.

### 7. Smaller defects

- **ANIMEXTS1.0 loop extension is ignored.** omggif reads only NETSCAPE2.0, so a forever-looping source exports as play-once.
- **Animated PNG and WebP import silently as stills.** `image-decode.js` asks for frame 0 only. Either support them through ImageDecoder frames or say "first frame only".
- **AVIF artwork takes the canvas path.** It is missing from `nativeTypes`, although ImageDecoder supports it. Palette import rejects AVIF, and the "skipped" message omits it.
- **1-bit PNGs are always 2 bits per pixel.** Using 1 bpp when no pixel is None is 6–13% smaller. 1-bit PNGs also lack the `sRGB` chunk that palette PNGs write.
- **No pixel or frame budget on artwork import.** Palette import caps at 16 MP; artwork has no cap. A 300-frame 800×600 GIF needs about 1 GB.
- **Lines Auto falls apart on noisy photos.** Line coverage goes 0.7% → 16.5% as noise rises from σ4 to σ12. Consider a percentile or triangle rule for the edge histogram.

## UX findings

Bugs and inconsistencies:

1. **The wheel and ↑/↓ do nothing in Palette mode.** `wheel()` calls `preventDefault`, then `step()` returns early for the style axis. In Palette mode, let either axis step palettes.
2. **The palette editor discards a draft without asking.** Escape, a backdrop click and Close all call `close()` with no check for unsaved edits. Confirm when the draft is dirty.
3. **The compare pill (`● Auto`) looks like a palette label but toggles Original.** Label it as a compare control and keep the palette name on the swatch button.
4. **Removing a single image has no undo.** It sits beside Save and Copy in the hover capsule. Add a 5-second Undo toast.
5. **The Save palette action fails contrast at 2.26:1.** Unselected segment text is about 3.5:1.
6. **Names disagree.**
   - The button and Help say "Palette settings"; the panel title says "Recolor".
   - The Settings Reset confirmation describes only 1-bit settings.
   - The Lospec error copy promises "or a palette slug", which is deliberately not routed. Fix the copy, or route a single slug-shaped token behind an explicit "Import from Lospec" button.
7. **Keyboard reach.** Each tile has 7 tab stops (3 of them "Preview"), and the dock comes after the wall. Help-as-welcome returns focus to More, not Add.
8. **Export names ignore the palette** (`name-colorfetti.png`, `colorfetti.zip`). Trying three palettes gives indistinguishable `(1)`/`(2)` copies.
9. **Ctrl+C copies the first image, not the focused or hovered one.** There is no Ctrl+S and no Ctrl+O.

Product suggestions that pay off (the rest were judged out of scope):

- **Integer upscale on Save (1×/2×/4×/8×).** A 64×64 PNG is blurred or rejected by Discord and social sites. Duplicating indices before the existing encoders needs no canvas. This reverses the spec's "Export upscaling" exclusion, so it is the user's call.
- **First-use Auto feedback.** For pixel art with 64 colors or fewer, Auto returns the source unchanged, so first use looks like "nothing happened". Say "Auto kept all N colors — pick a palette to recolor", or open the Palette panel.

## Disagreements and things not to chase

- **Tone pre-map ("Tone fit").** The research recommended it as opt-in. Measured, it was much worse on every metric (dark art catastrophically) and it blew out highlights on the sky sheet. The research correctly notes that distance-from-source metrics penalize any intentional tone change. Even so, there is no evidence for it. Do not add it without an artist preference test.
- **Blue-noise thresholds instead of Bayer:** fidelity is identical and contours are higher with small palettes. 8×8 Bayer gives no fidelity gain over 4×4.
- **Dither strength default.** At 100%, σ2 error beat 50% in 49/64 small-palette cases and 30/32 mid-palette cases, at about twice the grain. The research suggests 25%, citing Knoll comparisons and PixelLab. The proxies point opposite ways and neither is a preference test, so leave 50%.
- **Floyd–Steinberg** remains the best still-image fidelity (Auto 64: .12 vs .18 for Bayer at 100%). The animation deferral stands; at most it is a stills-only option.
- **Dark low-contrast art collapses to one color with nearest matching** on ENDESGA 8 and PICO-8. Dithering restores 3–5 colors. This is expected behavior, not a bug. See `sheet-syn-dark-lowcontrast.png` (local contact sheet).

## Suggested order

1. Dither preview coordinates (#1). One line, plus a test asserting tone parity at 2× and 4×.
2. GIF error messages and tolerant truncated decode (#5); Stencil unification (#6).
3. UX one-liners: wheel in Palette mode, dirty-draft confirm, name consistency, contrast.
4. GIF frame differencing (#4) and 1-bpp PNG.
5. Dither memo table (#3), then 8 candidates for small palettes (#2).
6. Knoll hybrid prototype and Save upscale, after a decision.
