# Independent whole-app performance audit, 2026-10-18

Report: [independent evaluation](../../docs/research/2026-10-18-independent-performance-audit.md).
Starting source: `5ae11b13977f2ce3cc7ae67cf7bd220f8a8734ce`.
No pushes. Immutable builds under workspace `.tmp` are deliberately not committed.

## Reading and primary research

- `inventory.json`: complete 96-entry implementation/config inventory, exact source
  hashes and classification. `root-source-review.md` covers App/Tile/Dock/startup.
- `core/source-review.md`, `io-android/source-review.md`,
  `ui-tooling/source-review.md`: full reads and call/function decisions; their
  coverage manifests account for every assigned path.
- Each owner's `api-research.md`, plus the root source ledger's linked primary
  guidance: current API behavior applied to specific call sites.
- `review/`: independent challenger, raw arithmetic recomputation, causal variant
  correction, retention heap path challenge and final verdict.

## Fresh evidence

- `core/README.md`, `core/probe-results.json`: independent scalar/differential
  analyses, masks, nearest conversions, source coordinates, captions, histogram
  eligibility, weighted subset/Auto results, alpha, cancellation and ownership.
- `io-android/README.md`, `io-android/comparative-summary.json`: actual USB workflow,
  five-change matched pairs, renderer CPU profiles, all native output bytes, exact
  verification and adverse phases. All trials stay in the raw receipts.
- `codex-browser/`: actual Codex Browser receipts, exact native desktop downloads,
  output verification and responsive screenshot. Earlier probe versions have
  explicit Long Task limitations; v3 is separately identified.
- `ui-tooling/README.md`: discovery proof, rejected editor attribution and measured
  canvas-grid writes. Auxiliary Edge is never presented as Codex Browser.
- `preview-trigger-plan.md` / manifest / build log and native retention/focus
  receipts: isolated baseline-plus-App lifecycle candidate and original gates.
- `core/row-cursor-*`, `core/auto-seed-*`: written candidate gates, exactness probes,
  unchanged adverse repeat, auxiliary measurements and final native decision.

`server.mjs` serves frozen RAM assets on loopback with optional test-only preboot
telemetry. `prepare-preview-trigger.mjs` archives exact baseline source and asserts
the single App handler delta. `core/materialize-variants.mjs` refuses existing
destinations/rebuilds; use a fresh workspace `.tmp` destination for reproduction.
The historical 5394 variant has an explicitly retained incomplete B1 reversal;
only 5398/5399 isolate the original synchronous B1 effect.

## Validation and provenance

`ui-tooling/test-discovery.md` and the committed discovery receipts belong to local
tooling commit `891fca2`. Runtime memory fix: `ae97d0e`, with
`preview-trigger-decision.md` and both native adverse rounds retained. Source ledgers concern frozen
baseline plus declared reviewed deltas. Other chats' current GIF/import changes
are outside those causal comparisons and remain untouched.

TEMP/TMP changes are per child process only. The two GC-dependent baseline skips
are not new passing tests. Native file output verification uses independent Sharp
decode and scalar nearest-color calculations; 1-bit uses a frozen algorithm
reference. No privacy-sensitive canvas readback supplies an output oracle.

- `final-tests.log`: 66 files,1,071 passing tests,two existing GC skips. The
  incomplete-snapshot first run is retained separately; its omitted brand-QA CLI
  was supplied from exact18de3f7, without runtime or exclusion edits.
- `final-build.log`, `final-source-manifest.json`, `final-provenance.json`: successful
  production build, exact frozen source/dependencies/all dist hashes, reviewed
  baseline96 entries and declared App/save/config deltas. Runtime matchesae97d0e.
  Six unrelated current GIF/import implementation changes are explicitly excluded.
- `io-android/final-cumulative-smoke-1792321456883.json`: actual native fullPNG,
  48-frameGIF,1bitPNG,two ZIP payloads,Copy,focus and raw ImageDecoder correctness.
- `io-android/retention-final-cumulative-1792321489490.json`: final595,853B backing
  storage after Preview-close/remove/expiry/twoGC; no errors.
- `codex-browser/final-output-verification.json` and `outputs/`: actual final
  Codex native PNG equals the independently verified baseline pixels/bytes with
  current filename. Complete DOM snapshots supplement lossy POST histories.
- `io-android/cleanup.json`: zero owned tabs; task mappings removed, pre-existing
  mappings/rotation/download defaults preserved. `desktop-cleanup.json`: four owned
  Codex tabs closed, viewport reset, seven verified audit Node helpers stopped;
  no audit-port listeners remain. Shared browser/other chats' processes untouched.

Handwritten source/report whitespace check passes. The all-artifact check reports
three preserved raw lines: a required blank context line in the candidate unified
patch and two whitespace-bearing terminal assertion-diff lines in the failed
snapshot log. Raw artifacts are not trimmed to make that cosmetic check green.
`evidence-index.json` records both raw and canonical-text hashes and validates
JSON, frozen source/dist hashes and cleanup. Its hashes are integrity, not proof
of implementation reading or a performance verdict.

`review/final-verdict.md`: final independent approval of the narrow memory fix and
qualified frozen-runtime evaluation, with no blocking finding. It is not a
universal speed/no-regression verdict or an endorsement of the external GIF work.
