# More hitbox comparison (Codex Browser only)

Start from the repository root:

```powershell
node bench/more-hitbox-2026-10-17/serve.mjs
```

Open `http://127.0.0.1:5358/bench/more-hitbox-2026-10-17/fixture.html` in Codex Browser.

The script builds the comparison and actual-app HTML entries into its ignored `.dist` directory, then serves that frozen output. It does not run development dependency discovery across the repository. Restart the script after source changes.

`http://127.0.0.1:5358/bench/more-hitbox-2026-10-17/actual.html` mounts the real App with the same test-only touch CSS activation. This permits real Image actions / Preview dialog routing checks, with the same limitation: JavaScript pointer capabilities remain those of Codex Browser, and no touch device is emulated.

The fixture imports the real foundation styles, CaptionMetadata and PixelIcon. The After sample uses the current production column width. Before overrides only that column to its previous 64px reservation. Native sibling buttons use independent event counters to detect routing; they deliberately report actions rather than opening real app dialogs.

Codex Browser does not expose touch emulation in this session. The fixture's Vite plugin extracts current production `hover: none` branches, preserves declaration and file order plus nested width/container conditions, and scopes them to `.touch-layout`. This activates touch-layout CSS for mouse inspection and hit-testing; **it does not emulate touch, pointer cancellation, a mobile browser or a physical device**. The ordinary desktop sample stays outside this scoped activation. Foundation styles, source coordinates and conversion algorithms remain unmodified.

For each width, check ordinary and stacked captions with absent, two-color and 256-color metadata, including pending state. Inspect the More pseudo-element target (20px left and 4px vertically), actual icon/button rectangles, text width, and `document.elementFromPoint`. Click text outside the overlap, inside its final 14px, and on the icon. Check action history for exactly one correct route. Keyboard activation must retain separate native Preview and More controls. Check empty-wall Add and unmodified desktop captions. Full app dialog integration and behavior remain a separate real-app test.

## Recorded verification

All browser tests used Codex Browser; no Android device or other browser was used.

- `results.json`: 36 combinations of viewport (320×720, 448×819, 819×448, 1280×720), tile width (140/180/300px), and metadata (absent/two/many), each with ordinary and stacked captions. The Preview text allocation gained exactly 20px; the More button stayed 44px in the same position, with at least 6px visual clearance. Fully fitting names need not expand to fill their allocation.
- At 140px, filename space increased from 56px to 76px. `comparison.jpg` shows the genuine before/after; the initial baseline override was corrected after measurement exposed insufficient CSS specificity.
- Native mouse clicks in the text overlap opened More only; clicks 24px left of the visible button opened Preview only. Visible-button clicks and separate Enter activation passed for both caption contexts. Pending counts and the example Add action remained functional.
- The real App entry passed More-sheet/Preview-dialog routing and independent keyboard activation at 390×819. At 819×448, metadata overlap, visible dots, and the upper invisible extension all opened only Image actions. Four imported PNGs included a 2048² sheet; `actual-390.jpg` records the wall. Both test pages reported no browser console errors.
- The ordinary production build at port 5352 passed caption click/Enter Preview checks, 320px width and 819×448 layout checks, with no horizontal page overflow or browser console errors. `npm run build` and `git diff --check` passed.

Two independent sub-agents approved the production change after challenge. A narrower reservation was rejected because the visible interaction background could cover text. The shipped change is CSS-only: no added handlers, scans, rendering, or allocations. This verifies mouse routing of the activated touch CSS, not actual touchscreen gestures, touch cancellation, or device behavior.
