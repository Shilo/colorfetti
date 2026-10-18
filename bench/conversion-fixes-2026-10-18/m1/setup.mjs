import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import omggif from 'omggif';
import { build } from 'vite';
const directory = path.resolve('.tmp/conversion-fixes-m1/fixtures');
const version = process.argv[2] || 'v1';
if (!/^v\d+$/.test(version)) throw new Error('Expected a version such as v2.');
await mkdir(directory, { recursive: true });
for (const [name, width, height, patchWidth, patchHeight] of [['oversized-logical.gif',4097,4096,1,1], ['valid.gif',2,2,2,2], ['small.gif',65,64,65,64]]) {
  const bytes = new Uint8Array(30000), writer = new omggif.GifWriter(bytes, width, height, { palette: [0xff0000, 0x00ff00] });
  writer.addFrame(0, 0, patchWidth, patchHeight, Uint8Array.from({ length: patchWidth * patchHeight }, (_, i) => i % 2));
  await writeFile(path.join(directory, name), bytes.slice(0, writer.end()));
}
await build({ configFile: path.resolve('vite.config.js'), root: path.resolve('bench/conversion-fixes-2026-10-18/m1'), publicDir: false,
  build: { outDir: path.resolve('.tmp/conversion-fixes-m1/harness-' + version), rollupOptions: { input: path.resolve('bench/conversion-fixes-2026-10-18/m1/harness.html') } } });
