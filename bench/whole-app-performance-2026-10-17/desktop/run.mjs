import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {runCase,cohortCases,root} from './workflows.mjs';
const {chromium}=createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=import.meta.dirname, variant=process.env.VARIANT||'baseline',profile=process.argv.includes('--profile');
const fixtures=JSON.parse(await readFile(path.join(out,'fixture-manifest.json'),'utf8'));
for(const r of fixtures.records){const bytes=await readFile(path.join(root,r.file));if(createHash('sha256').update(bytes).digest('hex')!==r.sha256)throw Error('fixture changed: '+r.id)}
await mkdir(path.join(out,variant),{recursive:true});
const report={date:new Date().toISOString(),commit:process.env.QA_COMMIT||'217cb64360784c066e944f8121858d7726f0e4f2',variant,profile,sandbox:true,fixtureManifest:'fixture-manifest.json',runs:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,chromiumSandbox:true});
try{for(const c of cohortCases){if(process.env.CASE&&process.env.CASE!==c.kind)continue;const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true}),page=await context.newPage();try{report.runs.push(await runCase(page,{baseURL:process.env.BASE_URL||'http://127.0.0.1:5371/',kind:c.kind,profile,destination:path.join(out,variant),save:async(page,trigger)=>{const pending=page.waitForEvent('download',{timeout:180000});await trigger();return readFile(await (await pending).path())}}));console.log('PASS',c.kind)}catch(e){report.runs.push({kind:c.kind,error:e.stack});console.log('FAIL',c.kind,e.stack)}finally{await context.close();}}}finally{await writeFile(path.join(out,variant,profile?'profile-results.json':'results.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}if(report.runs.some(r=>r.error))process.exitCode=1;
