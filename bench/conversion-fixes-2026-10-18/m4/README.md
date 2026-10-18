# M4 — preserve ANIMEXTS1.0 GIF repeats

The independent review's reported loss is reproducible. Identical GIFs differing
only in the application identifier retain repeats with NETSCAPE2.0 and lose them
with ANIMEXTS1.0. The wall intentionally loops continuously, so visual wall
playback cannot establish export metadata correctness.

## Challenged solution and retained semantics

- Scan only framed extension gaps located by the existing reader, including the
  gap before the first image and after the last. Do not search arbitrary bytes,
  rewrite the source identifier, add another GIF decoder, or alter pixel decoding.
- Recognize exact `NETSCAPE2.0` and `ANIMEXTS1.0` identifiers with the canonical
  three-byte payload: marker 1 and little-endian 16-bit repeat count. This matches
  current NETSCAPE handling. Split or unrecognized, but well-framed, payloads
  remain ignored; truncated framing fails with `GIF_INVALID`.
- The last valid recognized extension wins, including conflicting aliases. This
  extends the reader's existing last-valid NETSCAPE precedence consistently. It
  does not promise that every external decoder resolves conflicting files alike.
- `null` means no repeat extension: play once. `0` means infinite. A finite
  repeat count is additional plays; repeats 2 means three total plays. Writers
  keep emitting NETSCAPE2.0, preserving interoperability.
- GCE delay/transparency/disposal still apply to one following image. Application
  and comment payload cannot fabricate a GCE or a repeat extension. Bytes after
  the GIF trailer are ignored, matching the reader.
- The raw decoder retains metadata on single-frame GIFs, while artwork acquisition
  still publishes them as stills without loop/delay and saves them as PNG.
- Palette acquisition shares the decoder, unions both frames, and retains the
  compressed bytes for rescans. It does not need a new stored loop field.

## Verification

- Frozen before desktop build, Codex IAB Chrome 155 on Windows: absent extension
  passed; repeats 0, 2 and 65535 were lost in synchronous/async decoding, visitor,
  healthy import worker and the Palette/1-bit save pipeline. See
  `browser-before.json` and `browser-before.png`.
- After desktop build: the same matrix passed, including single-frame still
  semantics. See `browser-after.json` and `browser-after.png`.
- Actual production App UI import, individual Save and Save all were clicked.
  The test iframe intercepts only the finished download Blob at anchor transport;
  it does not replace App handlers, snapshots, conversion, encoders or filenames.
  Native IAB download-event capture timed out, so transport interception avoids
  depending on that unavailable capture mechanism. The 85-byte individual GIF
  and 468-byte ZIP are `after-ui-*` files. Both collision-safe ZIP entries were
  independently decoded, with two repeats/three total plays, 100/200 ms delays,
  two 2×1 frames and every RGBA byte identical to the source.
- Sharp 0.35.5/libvips 8.18.7 independently checked both identifiers with absent,
  infinite, 1, 2 and maximum 65535 repeats, and exact Palette/1-bit writer outputs.
  See `oracle-results.json`, including versions and source/build SHA-256 receipts.
- Targeted GIF, strict LZW and palette acquisition tests: **111 passed** in four
  files. Coverage includes repeated/conflicting aliases, comments/unrelated app
  payload, global table and framed LZW payload decoys, trailer bytes, a first
  image with only a local color table, split/truncated subblocks and GCE scope.

Reproduce from the repository root:

```powershell
npx vitest run src/lib/gif.test.js src/lib/gif-loop.test.js src/lib/gif-decode.test.js src/lib/palette-decode.test.js
node bench/conversion-fixes-2026-10-18/m4/build.mjs after
node bench/conversion-fixes-2026-10-18/m4/serve.mjs after 5205
```

Open the printed harness URL in a desktop browser, run the checks, dismiss the
iframe's welcome, import a fixture, click its Save, import another, and click
Save all. Then run `oracle.mjs` with Sharp installed normally or available at
`SHARP_MODULE`. Generated bundles belong in
ignored `.tmp`; whether to track generated screenshots/exports is the root
coordinator's versioning decision.

## Proposed shared contract text

For CLAUDE/spec, beside existing GIF control-scope rules:

> GIF repeat metadata recognizes both NETSCAPE2.0 and ANIMEXTS1.0 application
> identifiers with the canonical three-byte repeat subblock. The last valid
> recognized extension wins. No extension means one play, 0 means forever and a
> finite count means that many additional plays. Framing-aware scans skip
> comment, color-table and image payload bytes. Split/unknown well-framed
> application payloads remain ignored; malformed bounds still fail explicitly.
> Artwork and palette acquisition share this behavior. Single-frame artwork
> remains a still; Save and ZIP retain animated source repeat counts.

For performance documentation:

> Repeat alias handling extends the existing GIF extension-gap scan; it does not
> copy compressed input, rescan pixels, retain decoded caches or alter LZW. One
> metadata object and bounded 11-byte identifier strings are added per decode.
> The reader's existing framing pass and per-frame decoding limits remain.

No physical phone was used. No claim of exhaustive arbitrary-file compatibility
or all-browser testing is made. Safari and Firefox were not exercised here.
