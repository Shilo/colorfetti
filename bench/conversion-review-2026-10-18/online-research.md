# Colorfetti color conversion: adversarial research review

October 18, 2026. Research only; no repository files changed. Scratch experiment: `cand.mjs`, `cand-pen.mjs` (same folder).

## What I checked first

I read the closed or decided items: the matching spikes (CAM16, OK2, CIEDE2000, lightness-only, edge-aware prototype all rejected or deferred), the dithering spike, review and implementation (ordered only, diffusion deferred because of churn in unchanged regions), Auto design, capacity and refinement (centroid/subset refinement rejected), important colors (frequency/hue reweighting rejected), color protection (deferred by the user), Cleanup final and 1-bit Nearest. I also read the current kernels:

- `palette-generated.js` uses weighted farthest-first seeding plus **at most 6 Lloyd iterations** in Oklab. It works on exact histograms up to 4096 colors and 5-bit RGB bins after that, and keeps the best evaluated fit.
- `palette-dither.js` picks the **4 nearest candidates** by the Matching metric. It tries 6 pairs × 3 grid occupancies, mixed in linear light and scored in Oklab with a 0.03 point-error penalty. Phase is a source-anchored Bayer pattern.
- `recolor.js` already has a 16×16 void-and-cluster `NOISE` rank tile (1-bit Noise style). The palette family never uses it.

Nothing in `docs/` mentions Yliluoma, Knoll, Riemersma, Ostromoukhov, Reinhard, histogram matching, tone pre-mapping or libimagequant's noise/dither maps. Those are new ground, not re-proposals.

---

## Top 5 recommendations

### 1. Edge/detail-aware dither mask (High)

**What:** Use a cheap source-neighborhood test to turn ordered dithering off on outlines, one-pixel details and high-contrast edges. Dither only where the neighborhood is flat or a smooth gradient. libimagequant does exactly this. `contrast_maps()` computes per-pixel horizontal and vertical second differences and separates edges from noise (an edge is high in one direction, low in the other). It shrinks and expands the map "to remove thin edges", then `update_dither_map()` lowers dither where a remapped run has little same-color neighbor support. Remapping multiplies diffusion strength by this map, so the code comment reads "dithering only to flat areas". ([libimagequant image.rs](https://raw.githubusercontent.com/ImageOptim/libimagequant/main/src/image.rs), [remap.rs](https://raw.githubusercontent.com/ImageOptim/libimagequant/main/src/remap.rs))

**Difference from what exists:** The rejected "edge-aware mapping prototype" changed which colors were *matched*, which distorted hues and made one RGB map differently depending on its neighbors (alternative-matching doc). This proposal never changes nearest labels. It only decides whether the already-planned pattern applies. Undithered pixels get exactly today's Off output, so exact-color, cap and Cleanup contracts hold. The dithering spike measured 44% flat-pair texture on a flat sprite, and the PixelLab review needed strength guidance for tiny sprites. Dither speckle on outlines and eyes is the usual pixel-art complaint.

**Benefit:** Clean outlines and intact 1-px details with shaded interiors. That is close to how pixel artists hand-dither.

**Cost:** The decision cannot be memoized per RGB the way the plan is. It needs 4–8 neighbor reads per output pixel at source coordinates, which previews already sample. Reuse the existing max-channel-difference helper in `recolor.js`. Add no allocation per pixel. Expect about 10–30% on top of today's dither time for high-entropy inputs; sprites hit the plan memo.

**GIF risk:** Low. Like ordered dithering, a changed pixel affects only its 3×3 neighborhood and never propagates. Moving outlines carry their undithered band with them, which arguably reduces swimming.

**Validation:** Off and strength-0 bytes stay unchanged. Measure flat-pair texture, outline connectivity and 1-px detail survival on the existing annotated sprites, then run the usual phone timing.

### 2. Widen the dither candidate set on small palettes (High → Medium after tests)

**What:** Rank the 8 nearest candidates instead of 4 when the active palette or subset has 16 or fewer colors.

**Evidence (scratch, synthetic):** 3,000 uniform random sRGB colors, 16-cell grid, linear-light mixing, Oklab score **including the production 0.03 penalty**:

| Palette | Exhaustive pairs | 4-nearest (prod) | 8-nearest | 4-nearest ≥25% worse than exhaustive |
|---|---:|---:|---:|---:|
| PICO-8 | .00494 | .00632 (+28%) | .00503 | 36% of colors (8-nearest: 6%) |
| ENDESGA 8 | .00597 | .00742 (+24%) | .00597 | 22% (8-nearest: 0%) |
| Game Boy | .04689 | .04689 | .04689 | 0% |

I also tried a Knoll-style "reflected goal" candidate (nearest to `2·src − nearest`). It did **not** help, so I am not proposing it.

**Caveats:** Uniform RGB is not sprite content, and a better objective score is not the same as preference. The penalty is supposed to block distant-hue pairs, and these winners still pay it. The work is 28 pairs instead of 6 (about 4.7× per memo miss). For high-entropy 8-color images, that would push today's 64 ms phone figure (256², 4×4) to very roughly 200–300 ms. Gate it to ≤16 colors and memo-friendly inputs, or keep K=4 when the memo is disabled.

**Repo verdict:** The 4-candidate bound was introduced to tame the 946 ms exhaustive prototype. It was never measured against an 8-candidate middle ground. That gap is weak evidence that 4 is right.

**GIF risk:** None. The plan is still per-RGB and pointwise.

### 3. Opt-in "Tone fit": pre-map source lightness into the palette's range (Medium-High, needs design)

**What:** Before matching, affinely remap each asset's Oklab L. The source's robust range (for example the 2nd–98th visible percentile, duration-weighted over the whole clip) maps to the active palette or subset's L range, clamped. a/b stay as they are. Optionally add a mild piecewise curve to match the palette's L distribution.

**Prior art:** Krita's Gradient Map with Nearest/Dither modes and its Palettize filter ([Krita docs](https://docs.krita.org/en/reference_manual/filters/map.html)), GIMP's gradient map, the "Brightness Matching" auto-remap in Pedlar's PaletteSwap ([itch](https://pedlargames.itch.io/pedlars-paletteswap)), and the universal Brightness/Contrast/Gamma pre-sliders in Pixel Art Village and PixaTool. Classic Game Boy-style conversion is effectively this workflow.

**Difference from what was rejected:** The lightness study tested *matching metrics*: L-only, luminance, and an "equal-band tone rank" (58.5% changed). It did **not** test a range-normalizing pre-map that keeps full-color Oklab matching. The repo itself shows the need. With Ice Cream GB, "the palette's darkest color is still too light to reproduce the source's dark outline". Small ramp palettes waste entries when source L sits in a narrow band.

**Weakness in prior evaluation:** Every acceptance metric used so far (L error, Oklab error and edge merge versus the source) penalizes any intentional tone change by construction. A tone pre-map can never "win" those metrics. A fair test measures ramp utilization (used colors out of available), retained source edges and artist preference on 2–8-color ramp palettes.

**Risks:**
- It breaks the "exact palette RGB preserved" expectation unless exact members bypass the map. They should, which makes art already in the palette a no-op.
- It is meaningless for Auto, so disable it there.
- Max colors must select its subset on mapped colors.
- Per-frame stats would flicker, so use whole-clip stats only. With whole-clip stats it is GIF-stable.

**Cost:** One histogram pass per asset. Tiny.

Ship it Off by default, framed as a style choice rather than "better accuracy".

### 4. Blue-noise threshold option for palette dithering (Medium)

**What:** Add "Noise 16×16" beside 2×2/4×4/8×8 by passing the existing `NOISE` tile as `ranks` with `cells = 256`. The plan already stores weight in bits 16+.

**Evidence:** Void-and-cluster ranks give "even distribution without showing any obvious patterns" at the same per-pixel cost as Bayer ([Surma, Ditherpunk](https://surma.dev/things/ditherpunk/)). Dithering apps such as Ditherable now list blue noise beside Bayer. The repo's own spike listed "fixed blue-noise ranks" as the next ordered experiment and never ran it (01-full-palette-dithering, line 104).

**Benefit:** Smoother gradients on larger art and photos, without Bayer's crosshatch. For tiny sprites Bayer or checker stays crisper, which is why this is an *option* and not a replacement.

**Cost:** Close to zero code. With 256-level occupancy the "three occupancies around ideal" search becomes finer. That is fine, though the 2×2 failure mode (very small fractions of a distant endpoint) should be rechecked.

**GIF risk:** Same as Bayer for static coordinates: source-anchored, zero churn. Moving subjects shimmer as noise rather than crawl as grid. That is not proven better; review it.

### 5. Auto generator: converge, then consider noise-aware importance (Medium)

**a) Converge Lloyd:** Celebi's comparison found Wu-initialized k-means (WSM-WU) "in general … the best method", needing **9–23 iterations** to converge at 32 colors ([Celebi 2011](https://ar5iv.labs.arxiv.org/html/1101.0395)). Google's Material quantizer ships exactly Wu → WSMeans ([quantizer_celebi.ts](https://raw.githubusercontent.com/material-foundation/material-color-utilities/main/typescript/quantize/quantizer_celebi.ts)). Colorfetti's farthest-first seeding is close to Celebi's maximin family, but the **6-iteration cap probably stops before convergence** on binned inputs. Raise it to 16–24 with an early-exit-on-no-change, which the code already has, and keep "best evaluated". Cost is bounded: ≤32,768 bins × 64 centers per pass, about 2M distance evaluations. Measure on the phone.

This is *not* the rejected "Auto refinement". That rejection moved colors off a published shared target after subset selection. This changes how the target itself is fitted, before publication.

**b) Noise-aware importance** (second step, needs evidence): libimagequant weights histogram pixels with a "noise map", a flat-area-high/noisy-low importance (`z*176+80`) ([image.rs](https://raw.githubusercontent.com/ImageOptim/libimagequant/main/src/image.rs)). For the AI-generated corpus behind Cleanup, this would spend fewer of the 64 entries on speckle. Unlike the rejected frequency/hue rules, this signal is spatial, not chromatic. Risk: deliberate 1-px eyes in noisy regions get even less weight. Test on the bucket, knight and inventory counterexamples already retained.

Auto palette changes alter outputs for existing walls, so both parts need the corpus/device gate. The shared revision keeps GIFs stable either way.

---

## Other candidates (lower priority)

| Candidate | Evidence | Relation to repo | Benefit / cost / GIF risk | Priority |
|---|---|---|---|---|
| **Knoll pattern dithering (N-candidate)** | Knoll gives "the cleanest result"; N≈2K candidates; O(N log K) with a kd-tree; strength 10–30% advised, 80% gives stray pixels ([30fps.net](https://30fps.net/pages/revisiting-yliluoma-2/), [supplement](https://30fps.net/pages/revisiting-yliluoma-2/supplement.html)); patent US6606166 listed "Expired – Lifetime" ([Google Patents](https://patents.google.com/patent/US6606166)) | Not studied. Mixes 3+ colors per area, so it is more color-accurate but noisier than pairs | Use as an offline **reference oracle** to score the shipping kernel. As a product mode it suits photos more than sprites. Cost is N searches per memo miss. Pointwise, GIF-safe | Low-Med |
| **Yliluoma 1/2** | Pair-mixing (alg 1) is what Colorfetti already approximates; alg 2/EMA variants are "difficult to recommend" versus Knoll (30fps.net) | The current kernel is essentially a bounded Yliluoma-1 | No action. Validates the repo's pair design | — |
| **Error diffusion, stills only** | libimagequant safeguards: serpentine; strength scaled 15/16 "to keep small errors from accumulating"; error damped ×0.75 above `max_dither_error`; overflow clamped [−0.1, 1.1]; no diffusion below 2/256² error; dither map ([remap.rs](https://raw.githubusercontent.com/ImageOptim/libimagequant/main/src/remap.rs)). ImageMagick: diffusion in animation is "highly noticeable and irritating" while ordered changes stay local ([IM quantize](https://usage.imagemagick.org/quantize/)) | Deferral is **right for GIF**. For PNG stills, the only blockers were preview cost and product scope | The gifski/libimagequant answer for animation is background-aware remap: reuse the previous frame's output where it is close enough, with a 5-frame lookahead denoiser ([gifski denoise.rs](https://raw.githubusercontent.com/ImageOptim/gifski/main/src/denoise.rs)). That is heavy. Offer diffusion only for stills, if at all | Low |
| **Saturation/vibrance pre-adjust slider** | Standard in Pixel Art Village (Brightness/Contrast/Saturation, [site](https://www.pixelartvillage.com/)) and PixaTool (Vibrance, Gamma) | The repo's bucket case (muted water → gray under Oklab) is a chroma-loss symptom. OK2 (a metric reweight) was deferred; a user slider is artist control, which the protection doc favors over automatic rules | Cheap per-RGB transform, memo-friendly, GIF-safe. Risk of overlapping OK2 and confusing users | Low-Med |
| **Reinhard lαβ color transfer** | Mean/std transfer between images ([Reinhard 2001, DOI 10.1109/38.946629](https://research-information.bris.ac.uk/en/publications/color-transfer-between-images/)) | A palette has no pixel distribution, so target statistics are arbitrary. It shifts all hues, which the repo has repeatedly found harmful to sprites | Reject except as a Tone-fit L-only special case (rec 3) | Reject |
| **Pixelate/downscale** | Present in every converter (PAV, PixaTool, ditherit "Pixel Scale") | Out of scope for a sprite recolorer; nothing rejected | If ever added, average in linear light ([Brasseur gamma scaling, via KDE bug](https://bugs.kde.org/show_bug.cgi?id=228934)) or use mode-pooling for pixel art | Low |
| **Sprite-anchored pattern phase** | Obra Dinn pinned the dither to geometry to stop camera-motion flicker ([runevision](https://runevision.com/tech/dither3d)) | The repo already notes moving subjects "swim" | For GIFs with a translating sprite, phase anchored per frame bounding box. Needs motion estimation, which is fragile | Low |
| **Alpha dithering** | Krita Palettize "Dither" alpha mode | Cut/Keep exists | Partial-alpha GIF fails explicitly. An ordered alpha dither would be a GIF-legal fallback for soft edges and is pointwise and GIF-safe. Worth noting as an alternative to the hard failure | Low-Med |
| **More distance metrics** | Pixelfy offers Euclidean/Redmean/CIE76/94/2000 ([docs](https://pixelfy-docs.readthedocs.io/en/latest/dithering.html)); Krita Lab/RGB; Aseprite 1.3.9 added "new criterias to match similar RGB colors" ([blog](https://blog.aseprite.org/2024/10/02/aseprite-v139/)); image-q ships CIEDE2000/CIE94/Euclidean BT.709 ([repo](https://github.com/ibezkrovnyi/image-quantization)) | Thoroughly studied and closed | Competitors expose these as menus, not because of evidence. The repo's closure looks **right**; a metric menu would be feature parity, not quality | Reject |

---

## Where prior decisions look right

- **Ordered over error diffusion for an animation-first app.** ImageMagick's documentation and the repo's 67% unchanged-region churn measurement agree. gifski needs a lookahead temporal denoiser plus background remapping to make diffusion palatable. That is far beyond a browser kernel budget.
- **Linear-light mixing, Oklab scoring.** This matches the consensus that dithering should average light linearly (Surma; 30fps.net). The kernel already does what most web dither tools (sRGB-space FS) do not.
- **Pairs, not N-color Knoll, for sprites.** Pairs give cleaner, more "pixel-art" textures. Knoll is better as an accuracy reference.
- **Oklab plus RGB only.** The 20-method study is more rigorous than anything competitors publish.
- **One shared Auto revision and one duration-weighted subset per GIF.** This is the same principle as libimagequant's histogram API ("palettes from histograms are not refined during remapping").
- **Decoding.** ImageDecoder `copyTo({colorSpace:'srgb'})` and an sRGB canvas fallback are correct. Display-P3 sources are *clipped*, not gamut-mapped, when converted to sRGB ([W3C thread](https://lists.w3.org/Archives/Public/public-css-archive/2022Aug/0665.html)). Saturated P3 colors can therefore merge before matching. Mention it in the docs; it is rarely relevant for sprites. Premultiplied BGRA and Brave readback noise are already handled.

## Where prior decisions look weak

1. **Dither candidate bound (4) was never tested against 8.** See rec 2. A 22–28% objective gap on standard 8/16-color presets is material.
2. **Tone handling was evaluated only with source-fidelity metrics**, which cannot reward a deliberate range remap (rec 3). "Lightness-only matching" being rejected does not close "tone fit".
3. **Blue-noise ranks were proposed as the next experiment and skipped**, even though the asset already exists in `recolor.js`.
4. **Auto's 6-iteration cap** comes from the original bounded design and has no convergence evidence. Celebi reports 9–23 iterations for convergence.
5. **"No edge awareness"** was concluded from a *mapping* prototype. libimagequant's production use of edges is for *dither strength*, which the repo never tested.

## Competitor feature gaps

| Feature | Who has it | Colorfetti |
|---|---|---|
| Brightness/contrast/saturation/gamma pre-adjust | Pixel Art Village, PixaTool | None (recs 3, Low-Med slider) |
| Gradient-map / tone mapping to palette | Krita, GIMP, PaletteSwap | None (rec 3) |
| Blue-noise or cluster ordered dither | Ditherable, Pixelfy (cluster 4×4/8×8) | Only in 1-bit (rec 4) |
| Error diffusion families + serpentine | ditherit, image-q, Pixelfy, pngquant | 1-bit only (deliberate) |
| Dither strength | pngquant `--floyd`, Pixelfy (default 0.2), Photoshop | Has it (default 50%; others default lower, around 20%) |
| Edge-aware dither | libimagequant/pngquant | None (rec 1) |
| Fixed/locked colors | libimagequant `add_fixed_color`, Photoshop color table locks | Deferred by user |
| Pixelate/grid | PAV, PixaTool, ditherit | Out of scope |
| Preserve exact colors | Photoshop Indexed | Has it |

One cheap observation: the 50% Dither strength default sits above the 10–30% the 30fps.net Knoll comparison and Pixelfy (0.2) favor for clean results. The repo itself calls 50% "a midpoint default, not a calibrated optimum", and the PixelLab review found 20% avoided fragmentation on the armor. **Re-examine a 25% default** (Low effort, Medium value).

## Suggested order of work

1. A Dither strength default probe, plus K=8 candidates for small palettes and the Noise rank option. All are pointwise, GIF-safe, small diffs, and covered by the existing dither review harness.
2. An edge-aware mask spike on the annotated sprite set.
3. Auto Lloyd convergence probe, timing only, then fidelity on the 43-asset wall.
4. Tone-fit design spike with a ramp-utilization metric and artist review, run only if the user wants a stylized mode.

## Sources

- libimagequant API: https://pngquant.org/lib/ · remap.rs / image.rs (raw GitHub URLs above)
- gifski: https://gif.ski/ · denoise.rs (raw GitHub URL above)
- Revisiting Yliluoma / Knoll: https://30fps.net/pages/revisiting-yliluoma-2/ (original bisqwit.iki.fi page unreachable during this research)
- Knoll patent: https://patents.google.com/patent/US6606166
- Celebi 2011: https://ar5iv.labs.arxiv.org/html/1101.0395
- Material quantizer: material-color-utilities quantizer_celebi.ts
- ImageMagick quantize/dither: https://usage.imagemagick.org/quantize/
- Ditherpunk: https://surma.dev/things/ditherpunk/
- Krita filters: https://docs.krita.org/en/reference_manual/filters/map.html
- Aseprite CLI / 1.3.9: https://www.aseprite.org/docs/cli/ · https://blog.aseprite.org/2024/10/02/aseprite-v139/
- Pixelfy: https://pixelfy-docs.readthedocs.io/en/latest/dithering.html
- Pixel Art Village: https://www.pixelartvillage.com/ · PixaTool: https://kronbits.itch.io/pixatool · ditherit: https://ditherit.com/
- image-q: https://github.com/ibezkrovnyi/image-quantization
- Reinhard 2001: https://research-information.bris.ac.uk/en/publications/color-transfer-between-images/
- Obra Dinn stabilization summary: https://runevision.com/tech/dither3d
- P3 clipping thread: https://lists.w3.org/Archives/Public/public-css-archive/2022Aug/0665.html
- Gamma scaling: https://bugs.kde.org/show_bug.cgi?id=228934
- Pedlar's PaletteSwap: https://pedlargames.itch.io/pedlars-paletteswap
