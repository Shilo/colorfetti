// Decodes the practical sheet/sprite fixtures once to raw RGBA (sharp, no canvas) in .tmp.
import { createRequire } from 'node:module';
import { writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
const sharp = createRequire('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/package.json')('sharp');
const repo = path.resolve(import.meta.dirname, '../../..');
const fx = path.join(repo, 'bench/practical-workloads-2026-10-16/fixtures');
const out = path.join(repo, '.tmp/second-audit-2026-10-17/review/raw');
await mkdir(out, { recursive: true });
const index = [];
for (const f of (await readdir(fx)).filter(f => f.endsWith('.png'))) {
  const { data, info } = await sharp(path.join(fx, f)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  await writeFile(path.join(out, f + '.rgba'), data);
  index.push({ file: f, width: info.width, height: info.height });
}
// GIFs: every composited frame as its own raw RGBA file.
for (const f of (await readdir(fx)).filter(f => f.endsWith('.gif'))) {
  const { data, info } = await sharp(path.join(fx, f), { animated: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pages = info.pages ?? 1, height = info.pageHeight ?? info.height, bytes = info.width * height * 4;
  for (let k = 0; k < pages; k++) {
    await writeFile(path.join(out, `${f}.${k}.rgba`), data.subarray(k * bytes, (k + 1) * bytes));
    index.push({ file: `${f}.${k}`, width: info.width, height, gif: f });
  }
}
await writeFile(path.join(out, 'index.json'), JSON.stringify(index, null, 1));
console.log(index);
