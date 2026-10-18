# Fresh test-discovery evaluation

Starting revision: `5ae11b13977f2ce3cc7ae67cf7bd220f8a8734ce`. Node/Vitest discovery and assertions were run afresh on October 18, 2026. No registered worktree was deleted, reset or modified.

`discovery-before.json` was generated before editing `vite.config.js` with `node node_modules/vitest/vitest.mjs list --filesOnly --json=...`. It contains 324 files: 66 root tests and 258 copied tests beneath the two registered `.claude/worktrees` checkouts, including their archived `.tmp` sources. Merely excluding root `.tmp/**` does not exclude those nested paths.

The fix extends `configDefaults.exclude` with `**/.claude/worktrees/**`, keeping the existing `.tmp/**` exclusion and default inclusion. It deliberately does not constrain tests to `src`, suppress all dot directories, exclude all `.claude` content, remove another checkout, or change assertions. `discovery-after.json` contains exactly the same 66 root paths from the original list; the independent set comparison is in `discovery-verification.json`.

To test future ordinary directories, an owned temporary `tests/codex-discovery-fixture/future.test.js` imported the real `fitImageWall`, called it with four items at 800×600, and asserted positive size, positive/integer column count. The unfiltered file listing found 67 tests, including that ordinary future directory; a targeted run executed its assertion successfully. The exact scratch file and now-empty directory were removed. This avoids a durable test that merely mirrors one exclusion string.

The current-code scope-equivalent baseline run (`unit-before.log`, after the tooling edit with the same exclusion also supplied on the CLI) passed 66 files / 1058 tests, with two existing skips. Plain `npm test`, without CLI exclusions, then passed the same 66 files / 1058 tests / two skips (`unit-after-workspace-temp.log`). The baseline label concerns intended runtime assertions; it is not a claim that all 324 copied suites executed before the fix.

Both successful runs set process-local `TEMP` and `TMP` to the already-created workspace directory `.tmp/codex-independent-performance-2026-10-18/ui-vitest-temp`. The attempted fixture/plain suite runs without this workaround failed during SSR cache rename with `EPERM`, before tests executed (`future-fixture-test.log`, `unit-after.log`). Those are setup failures, not application assertion failures. No security or sandbox setting was changed.

Current primary documentation was consulted directly: [Vitest exclude](https://vitest.dev/config/exclude) explains root-relative patterns, config override semantics and spreading `configDefaults.exclude`; [Vitest CLI list](https://vitest.dev/guide/cli.html#list) documents the files-only JSON listing. The live documentation includes newer Vitest 5 behavior, while this checkout uses Vitest 4.1.11; the actual installed CLI was used for validation, without dependency updates.

This is a tooling correctness fix, not a production performance claim. It removes unrelated duplicate suites from the default command. Runtime code and the frozen browser baseline are unaffected.
