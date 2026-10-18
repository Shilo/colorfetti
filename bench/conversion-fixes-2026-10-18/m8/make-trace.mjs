// Debug entry only: preserve every frozen production JS/CSS byte, add one early
// inline observer diagnostic to HTML. No handler/encoder/observer suppression.
import assert from 'node:assert/strict';
import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
const base = resolve('.tmp/conversion-fixes-m8-after-v4'), target = resolve('.tmp/conversion-fixes-m8-trace');
assert.ok(target.startsWith(resolve('.tmp') + sep)); assert.ok(!existsSync(target), 'trace directory must be fresh');
cpSync(base, target, { recursive: true });
const script = `<script>
(() => {
  const original = MutationObserver.prototype.observe;
  const events = window.__m8MutationTrace = []; let calls = 0;
  function record(value) {
    const entry = { time: new Date().toISOString(), url: location.href, readyState: document.readyState, appPresent: !!document.getElementById('app'), topFrame: window === top, ...value };
    events.push(entry); void fetch('/trace', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry), keepalive: true }).catch(() => {});
  }
  MutationObserver.prototype.observe = function(target, options) {
    calls++;
    try { return original.call(this, target, options); }
    catch (error) {
      record({ event: 'observe-error', target: String(target), targetType: Object.prototype.toString.call(target), message: error.message, nativeStack: error.stack, callStack: new Error('observer trace').stack });
      console.error('M8_MUTATION_INVALID', events[events.length - 1]); throw error;
    }
  };
  addEventListener('error', event => record({ event: 'window-error', message: event.message, filename: event.filename, line: event.lineno, column: event.colno, stack: event.error?.stack }));
  addEventListener('unhandledrejection', event => record({ event: 'unhandled-rejection', message: String(event.reason), stack: event.reason?.stack }));
  addEventListener('load', () => record({ event: 'loaded', observeCalls: calls }));
})();
</script>`;
const app = resolve(target, 'index.html'); writeFileSync(app, readFileSync(app, 'utf8').replace('<head>', '<head>' + script));
const harness = resolve(target, 'bench/conversion-fixes-2026-10-18/m8/browser.html');
writeFileSync(harness, readFileSync(harness, 'utf8').replace('<html lang="en">', '<html lang="en">' + script));
console.log(target);
