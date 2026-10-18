# Test setup notes

The first default restricted-shell `node review/lifecycle.mjs` attempt failed at Edge launch, before creating an application page. Windows restricted temporary-profile replacement reported `DualEngine/SiteList-Enterprise.json` / `SiteList-Consumer.json` error -5 and closed the process. It is a setup failure, not an app lifecycle or output failure.

The approved host rerun passed with `chromiumSandbox: true`, with no `--no-sandbox` flag. Focused Vitest was also run through approved host execution because the same session had already established restricted temporary-file rename failures. Native browser privacy/security/appearance preferences were not changed.
