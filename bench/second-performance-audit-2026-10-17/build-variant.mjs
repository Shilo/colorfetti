// Builds an immutable variant of the audit baseline without touching the live checkout:
// a detached worktree at BASE, the given patches applied, output in .tmp/second-audit-2026-10-17/<name>/dist.
// Usage: node bench/second-performance-audit-2026-10-17/build-variant.mjs <name> [patch ...]
import {execFileSync} from 'node:child_process';
import {existsSync, symlinkSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';

const BASE = '3c47699b8f0ee6e58f7d3082d699c81376747dea';
const [name, ...patches] = process.argv.slice(2);
if (!name) throw new Error('name required');
const root = path.resolve('.tmp/second-audit-2026-10-17'), tree = path.join(root, `wt-${name}`), out = path.join(root, name, 'dist');
if (existsSync(out)) throw new Error(`${out} exists; variants are immutable`);
const git = (...a) => execFileSync('git', a, {stdio: 'inherit'});
// Never auto-remove: the worktree holds a node_modules junction, and a recursive delete would follow it.
// Cleanup: unlink <tree>/node_modules first (fs.unlinkSync), then `git worktree remove --force <tree>`.
if (existsSync(tree)) throw new Error(`${tree} exists; unlink its node_modules junction, then remove the worktree`);
git('worktree', 'add', '--detach', tree, BASE);
symlinkSync(path.resolve('node_modules'), path.join(tree, 'node_modules'), 'junction');
for (const p of patches) execFileSync('git', ['apply', path.resolve(p)], {cwd: tree, stdio: 'inherit'});
execFileSync(process.execPath, [path.resolve('node_modules/vite/bin/vite.js'), 'build', '--outDir', out, '--emptyOutDir'], {cwd: tree, stdio: 'inherit'});
const lines = [];
const walk = (d, rel = '') => { for (const e of readdirSync(d, {withFileTypes: true})) { const r = rel + '/' + e.name; if (e.isDirectory()) walk(path.join(d, e.name), r); else if (!r.endsWith('.mp4')) lines.push(createHash('sha256').update(readFileSync(path.join(d, e.name))).digest('hex') + ' .' + r); } };
walk(out);
lines.sort((a, b) => a.slice(65).localeCompare(b.slice(65)));
writeFileSync(path.join(root, name, 'build-hashes.txt'), lines.join('\n') + '\n');
console.log(JSON.stringify({name, base: BASE, patches, out}));
