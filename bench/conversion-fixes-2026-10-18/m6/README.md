# M6 — portable Save, ZIP and drag names

Save/ZIP previously retained Windows-invalid characters. Native browser download
cleanup could hide that defect for individual files, while Windows ZIP extraction
failed. App drag had a separate partial sanitizer, producing different filenames.

## Challenged policy

One `save.js` pipeline now serves Save, ZIP and drag through `downloadName` and
`outNames`. The App drag-specific replacement is removed. Displayed source labels
stay intact. Filename changes do not enter conversion, color selection or encoding.

- Replace path separators, Windows-forbidden characters, C0/C1 controls, bidi
  controls and unpaired surrogates with hyphens. Preserve ordinary Unicode and
  emoji joiners; normalize filename text to NFC.
- Remove the final source extension, preserving dots in directory-like labels;
  trim base whitespace/trailing dots and spaces, using `image` for empty bases.
- Budget the entire output, including ordinal, `-colorfetti` and PNG/GIF extension,
  to 255 UTF-8 bytes. Truncate only at complete code points and trim again afterward.
  This is a filename component limit, independent of a user's destination path.
- Protect the actual final first-dot device stem, including superscript COM/LPT
  variants. `CON-colorfetti.png` is valid and remains unchanged;
  `CON.note-colorfetti.png` becomes `image-CON.note-colorfetti.png`.
- Resolve collisions after normalization and truncation, using NFC/uppercase keys
  and an ordinal counter per normalized group. Keep existing numbered-name behavior,
  separate PNG/GIF namespaces and a final taken-name check. Uppercase matching is
  deliberately conservative for Unicode, including sigma variants.

The Windows forbidden-character/device/extension rules were checked against
[Microsoft's filename documentation](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file).
NFC, byte budgeting, bidi replacement and collision policy are application choices.

## Verification

- Nine new meaningful naming tests cover normalization-created collisions,
  genuinely reserved names, already valid `CON-colorfetti` names, superscripts,
  control/bidi characters, unpaired versus paired surrogates, emoji joiners, NFC
  and sigma collisions, empty inputs, numbered/mixed-format names and exact ZIP
  entry payloads. A 1,200-name long-emoji batch checks every sibling's full byte
  limit, uniqueness and three/four-digit suffixes.
- Desktop Codex Chrome before/after harnesses run the same ten cases. The before
  matrix exposes invalid names; after all entries are portable and unique. The
  original tile captions remain unchanged in the screenshot.
- Actual App Save, ten-item Save all and actual App drag preparation/handoff were
  exercised. Test-only code intercepts finished Blob download transport and sends
  synthetic pointer/drag events through the real App drag callbacks. It does not
  replace naming, snapshots, conversion or encoders. Native external OS dropping
  is not claimed by this test.
- Before: Save offers `a:b-colorfetti.png`, while accepted drag offers
  `a-b-colorfetti.png`. After: Save and accepted drag both offer
  `a-b-colorfetti.png`, including matching `DownloadURL` metadata. Both PNGs are
  98 bytes and byte-for-byte identical.
- Sharp independently checks both individual Saves and all twenty before/after
  ZIP entries: every RGBA byte is the known opaque black/white 2×1 source. PNG
  bytes are unchanged by the filename fix. ZIP size changes 2,940→2,646 bytes
  because names shrink; image compression is unchanged.
- **Real Windows PowerShell 7.6.6 `Expand-Archive`**, with full filename and
  SHA-256 readback: the actual before ZIP fails; the actual after ZIP extracts all
  ten entries. A second archive extracts all 27 adversarial names, including a
  255-byte component, long emoji, superscripts, Unicode collisions and device-like
  names. Every expected name and payload hash matches. Extraction stays inside
  the resolved `.tmp/m6-windows-extraction` task directory.

The implementing sub-agent's CUA inventory was unavailable during M6. The root
coordinator independently operated its working Codex desktop browser; the
implementer reviewed its JSON receipts/screenshots, challenged the results and
ran the independent Sharp and native Windows extraction checks. No physical
phone was used; Safari/Firefox were not exercised.

Evidence: `before/after-receipt.json`, `before/after-drag.json`, capture manifests,
`oracle-results.json`, `windows-extraction-results.json` and
`../screenshots/m6-filenames-before.jpg` / `m6-filenames-after.jpg`.
Oracle receipts record source, build and artifact SHA-256 values. Generated
bundles remain under ignored `.tmp`; captured binaries and extracted files are
local test artifacts.

Reproduce:

```powershell
npx vitest run src/lib/save-names.test.js src/lib/save.test.js src/lib/save-batch.test.js src/lib/palette-export.test.js src/lib/export-drag.test.js
node bench/conversion-fixes-2026-10-18/m6/build.mjs after
node bench/conversion-fixes-2026-10-18/m6/serve.mjs after 5227
```

Open the printed harness URL, run the matrix, dismiss welcome, import the colon
image, use actual Save, prepare/finish the synthetic App drag, import the rest and
use Save all. Run `oracle.mjs` with Sharp installed or `SHARP_MODULE`, then
`windows-extract.ps1` on Windows. The oracle writes the expected actual ZIP entry
names/hashes consumed by the native extraction verifier.

## Proposed shared contract text

> Save, ZIP and drag exports share portable filename normalization before
> case-insensitive collision resolution. Unsafe filename/control/bidi characters
> become hyphens; NFC Unicode and complete code points are retained within a
> 255-byte UTF-8 complete-name budget, reserving collision numbers and the
> existing output suffix/extension. Empty bases use image; actual reserved
> first-dot device stems are prefixed with image-. Source display labels remain
> unchanged. File extensions continue to follow encoded PNG/GIF output.
