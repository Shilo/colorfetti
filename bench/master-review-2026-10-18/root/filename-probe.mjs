import { writeFileSync } from 'node:fs';
import { outNames, zipBytes } from '../../../src/lib/save.js';
const names = outNames(['a:b.png']);
writeFileSync(new URL('filename.zip', import.meta.url), zipBytes(names, [Uint8Array.of(1, 2, 3)]));
console.log(JSON.stringify({ source: 'a:b.png', entry: names[0] }));
