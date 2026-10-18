# Conversion and UX fixes: implementation and challenge record

October 18, 2026. Implements the eight confirmed recommendations M1–M8 from the
[master review](2026-10-18-master-conversion-and-ux-review.md). Experimental
dither changes, local GIF tables and source mapping remain separate research.

Each task has a dedicated sub-agent, before/after desktop Codex Browser checks,
coordinator source/evidence review, challenge discussion and affected retesting
after revisions. The coordinator commits a task only after both agree on its
scope and evidence. No physical phone is used for these checks.

Baseline: commit `83ff77b`; 68 test files passed, 1,186 tests passed and two
existing tests skipped. Product source was clean before this run. Evidence lives
in `bench/conversion-fixes-2026-10-18/`; generated media is local except curated
screenshots in its `screenshots/` folder.

## Task ledger

| Task | Scope | State |
| --- | --- | --- |
| M1 | Decoded artwork admission budget | Queued |
| M2 | Sampling disclosure and native-pixel inspection | Queued |
| M3 | Bounded per-file import diagnostics | Implementation under challenge |
| M4 | ANIMEXTS GIF repeat metadata | Implementation under challenge |
| M5 | Enabled palette-editor text contrast | Accepted after revision and desktop retesting |
| M6 | Portable Save/ZIP/drag names | Queued |
| M7 | Transparent GIF frame-bound cropping | Queued |
| M8 | Exact PNG state compaction | Queued |

## Accepted changes and review discussions

Task-specific acceptance and evidence are recorded here as each task completes.

### M5 Palette editor contrast

The initial two-rule correction fixed Save and unselected method labels. Continued
challenge found the same defect in Cancel and visible hints (3.3358:1 in light).
The agent extended the correction to four editor-scoped roles, then repeated the
affected browser checks. The coordinator independently inspected both revisions
in the real editor, including the revised secondary text and footer colors.
Both reviewers agreed on the revised scope and solution before commit.

The final 109 enabled-state observations have a worst measured ratio of 5.4242:1;
light hints reach at least 5.923:1 and Cancel at least 12.375:1. Checks include both
themes, actual hover and keyboard focus, selected methods, desktop/narrow desktop
viewports, disabled empty drafts, 65-color pagination and save/reopen of exact RGB
colors. Production build passed. The change does not add conversion work.
Forced-color emulation was unavailable in this browser; existing UA/system-color
behavior remains, without claiming it was exercised.

Evidence: `bench/conversion-fixes-2026-10-18/m5/contrast-results.json`, raw computed
captures, `contrast-receipt.mjs` and `source-build.json`.
Screenshots: [before](../../bench/conversion-fixes-2026-10-18/screenshots/m5-editor-before.jpg),
[after](../../bench/conversion-fixes-2026-10-18/screenshots/m5-editor-after.jpg).
