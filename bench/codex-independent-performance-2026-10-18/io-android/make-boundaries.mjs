import { mkdir, writeFile } from 'node:fs/promises';
import { sharp, sha } from '../../claude-audit-2026-10-15/device/audit-lib.mjs';
const directory = new URL('./boundary-fixtures/', import.meta.url);
await mkdir(directory, { recursive: true });
const records = [];
for (const [id, w, h, partial] of [['indexed65535', 254, 257, false], ['indexed65536', 255, 256, false], ['indexed65792', 256, 256, false], ['rgba65537', 16384, 1, true]]) {
  const data = new Uint8Array(w * h * 4);
  for (let p = 0; p < w * h; p++) { data[p * 4] = data[p * 4 + 1] = data[p * 4 + 2] = p % 256; data[p * 4 + 3] = partial ? p % 254 + 1 : 255; }
  const bytes = await sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
  await writeFile(new URL(id + '.png', directory), bytes);
  records.push({ id, w, h, sha256: sha(bytes), source: 'Owned deterministic grayscale256; every RGB retained exactly by custom256-color palette.', alphaMode: partial ? 'keep' : 'cut', expectedFilteredBytes: (partial ? w * 4 + 1 : w + 1) * h });
}
await writeFile(new URL('manifest.json', directory), JSON.stringify({ created: new Date().toISOString(), records }, null, 2) + '\n');
console.log(JSON.stringify(records));
