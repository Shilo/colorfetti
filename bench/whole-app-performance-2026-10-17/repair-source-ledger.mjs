// Preserve the original observation while correcting historical source attribution.
import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {sourceLedger,sourceHashEncoding} from './source-ledger.mjs';
const file=path.join(import.meta.dirname,'manifest.json'),manifest=JSON.parse(readFileSync(file,'utf8'));
manifest.observedSourceAtFreeze??=manifest.source;
manifest.source=sourceLedger(manifest.revision);
manifest.sourceHashEncoding=sourceHashEncoding;
manifest.initialTree='Clean git status at startup217cb64; original source-hash collector ran later, after independent caption CSS edits began.';
manifest.sourceObservationNote='observedSourceAtFreeze preserves the original raw worktree hashes; it is not the historical source ledger. Source now comes from exact217cb64 Git objects. The independent caption CSS is the only substantive normalized difference; Windows text line endings also differ. All measured runtime JS/CSS/worker assets were independently reproduced exactly from historical baseline and archived candidate.';
writeFileSync(file,JSON.stringify(manifest,null,2)+'\n');console.log('Historical source ledger corrected; original worktree observation preserved.');
