import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const destination = 'bench/conversion-fixes-2026-10-18/m2/source-build-capture.json';
if (existsSync(destination)) throw new Error('Ownership follow-up build receipt already exists.');
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const paths = ['src/ImageViewer.svelte', 'src/Tile.svelte', 'src/Pixels.svelte', 'src/viewer-navigation.css',
  'src/lib/viewer-navigation.js', 'src/lib/viewer-navigation.test.js', 'src/lib/viewer-inspection.js',
  'src/lib/viewer-inspection-policy.js', 'src/lib/viewer-inspection.test.js',
  'src/lib/palette-animation-cache.js', 'src/lib/palette-animation-cache.test.js',
  'src/lib/artwork-analysis-capture.js', 'src/lib/artwork-source-projection.js', 'src/App.svelte',
  'src/lib/save.js', 'src/lib/png-alpha-states.js'];
const build = '.tmp/conversion-fixes-m2-capture';
const receipt = { date: '2026-10-18', url: 'http://127.0.0.1:5238/', build,
  scope: 'Final M2 ownership follow-up. Source also includes coherent M1 captured-analysis/projection APIs and frozen concurrent M8 PNG code. Historical source-build.json remains unchanged.',
  changes: ['Actual shared producer settlement for owner/joiner/cache hit', 'Selected-frame legacy analysis charged until queue settlement',
    'Original-only Palette requests and opaque ordinary/display identities', 'Display record retains pixels plus opaque native request key'],
  sources: paths.map(path => ({ path, sha256: hash(path) })),
  assets: readdirSync(build + '/assets').map(name => ({ name, sha256: hash(build + '/assets/' + name) })) };
writeFileSync(destination, JSON.stringify(receipt, null, 2) + '\n');
console.log(destination);
