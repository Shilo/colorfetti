# Earlier independent review evidence

This directory contains historical probes and receipts for the
[independent review](../../docs/research/2026-10-18-codex-conversion-and-ux-review.md).
Use the later [master review](../../docs/research/2026-10-18-master-conversion-and-ux-review.md)
for implementation decisions; it challenges and corrects several earlier proposals.

Probe source, JSON measurements and test/build receipts are versioned. Generated
images, GIFs, ZIPs, extraction directories and screenshots stay local and are
ignored. Paths and hashes in historical browser receipts identify those original
local captures; they do not imply the screenshots are included in this checkout.

The [master evidence README](../master-review-2026-10-18/README.md) documents Node,
Sharp, tracked input fixtures and reproduction limits. All Sharp-based scripts
now support `SHARP_MODULE` or ordinary `sharp` module resolution. Production
dependencies were not changed. Probe reruns overwrite measurements beside their
source, so retain the original receipts when comparing new implementations.
