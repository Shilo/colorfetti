import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root=import.meta.dirname,source=await readFile(root+'/ab-compression-action.mjs','utf8');let code=source.replaceAll('\r\n','\n');
function change(a,b){assert.ok(code.includes(a),'Expected harness token: '+a.slice(0,100));code=code.replace(a,b)}
change("{sha,decode,compare,nearest}","{sha,decode,compare,nearest,contract}");
change("'ab-compression-action'","'row-cursor-native'");
const start=code.indexOf('const cases='),end=code.indexOf('\nconst prefix=',start);assert.ok(start>=0&&end>start);
code=code.slice(0,start)+`const cases=[
 {id:'tiny',file:path.join(practical,'dungeon-wizard.png')},
 {id:'sheet1024',file:path.join(practical,'kenney-sheet-1024.png')},
 {id:'sheet2048',file:path.join(practical,'kenney-sheet-2048.png')},
 {id:'entropy512',file:path.resolve('bench/whole-app-performance-2026-10-17/android/fixtures/entropy512.png')},
 {id:'partialKeep64',file:path.resolve('bench/whole-app-performance-2026-10-17/android/fixtures/partial-glow64.png'),settings:{alphaMode:'keep'}},
 {id:'dither512',file:path.resolve('bench/whole-app-performance-2026-10-17/android/fixtures/entropy512.png'),settings:{dither:'4x4'}},
 {id:'cleanup1024',file:path.join(practical,'kenney-sheet-1024.png'),settings:{cleanup:true}},
 {id:'motion256',file:path.join(practical,'kenney-motion-256.gif')}
];`+code.slice(end);
change("'codexio-png-'+Date.now()","'codexio-row-cursor-'+Date.now()");
change("'current5ae11b1; reverse-only0a4eb91 variant'","'5ae11b13977f2ce3cc7ae67cf7bd220f8a8734ce; isolated nearest row-cursor candidate only'");
change("Fresh independent causal comparison; current baseline versus reverse-only0a4eb91 build. All output pixels also compared to independent scalar nearest.","Frozen5ae actual app versus isolated local row-cursor candidate. Fixed core/row-cursor-plan.json gates: target>=10% AND10ms rendererCPU,>=4/5pairs; no adverse>5ms AND5%; all paired output bytes exact. Scalar nearest oracle for applicable cases; independent alpha/palette contract plus byte parity for dither/Cleanup.");
change("const ports={baseline:5395,candidate:5391}","const ports={baseline:5407,candidate:5408}");
change("if(process.env.CASE&&process.env.CASE!==c.id)continue;","if(process.env.CASES&&!process.env.CASES.split(',').includes(c.id))continue;");
change("new PerformanceObserver(l=>__d1Tasks.push(...l.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask'})", "globalThis.__d1Observer=new PerformanceObserver(l=>__d1Tasks.push(...l.getEntries().map(e=>({start:e.startTime,duration:e.duration}))));__d1Observer.observe({type:'longtask'})");
change("await page.evaluate(s=>__d1Tasks.filter(l=>l.start>=s),start)","await page.evaluate(s=>{for(const e of __d1Observer.takeRecords())__d1Tasks.push({start:e.startTime,duration:e.duration});const end=performance.now();return __d1Tasks.filter(l=>l.start+l.duration>s&&l.start<end)},start)");
const exact="for(let j=0;j<actual.frames.length;j++)assert.deepEqual(compare(actual.frames[j],nearest(input.frames[j],colors,{alphaMode:c.settings?.alphaMode||'cut'}).data),{alphaMismatch:0,rgbMismatch:0,first:null});";
change(exact,"for(let j=0;j<actual.frames.length;j++){if(!c.settings?.cleanup&&!c.settings?.dither)assert.deepEqual(compare(actual.frames[j],nearest(input.frames[j],colors,{alphaMode:c.settings?.alphaMode||'cut'}).data),{alphaMismatch:0,rgbMismatch:0,first:null});else{const result=contract(actual.frames[j],input.frames[j],colors,{alphaMode:c.settings?.alphaMode||'cut'});assert.equal(result.offPalette,0);assert.equal(result.alphaWrong,0)}}");
const from="let filteredBytes;const chunks=[];",to="if(/^indexed\\d+|^rgba\\d+/.test(c.id))assert.equal(filteredBytes,+c.id.match(/\\d+/)[0]);";
const a=code.indexOf(from),b=code.indexOf(to,a);assert.ok(a>=0&&b>a);code=code.slice(0,a)+"let filteredBytes;if(!c.file.endsWith('.gif')){const chunks=[];"+code.slice(a+from.length,b+to.length)+'}'+code.slice(b+to.length);
change("process.env.CASE||'all'","process.env.CASES?.replaceAll(',','-')||'all'");
code="// Generated from the independently inspected native action harness. Generator records provenance; never overwrite historical receipts.\n"+code;
await writeFile(root+'/row-cursor-native.mjs',code);
await writeFile(root+'/row-cursor-native-harness.json',JSON.stringify({source:'ab-compression-action.mjs',sourceSha256:createHash('sha256').update(source).digest('hex'),generatedSha256:createHash('sha256').update(code).digest('hex'),sourceBuildManifest:'../core/row-cursor-build-manifest.json',fixedPlan:'../core/row-cursor-plan.json',stage:'Research only, exact target before adverse; no new runtime edit.'},null,2)+'\n');
console.log('Prepared row-cursor-native.mjs');
