import assert from'node:assert/strict';import{createRequire}from'node:module';import{readFileSync,writeFileSync,readdirSync}from'node:fs';
import{createHash}from'node:crypto';import{join,relative}from'node:path';import{unzipSync}from'fflate';
import{outNames}from'../../../src/lib/save.js';
const sharp=createRequire(import.meta.url)(process.env.SHARP_MODULE??'sharp'),path=name=>new URL(name,import.meta.url),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const sourceNames=['a:b.png','a?b.png','a-b.png','A-B.JPG','CON.png','CON.note.png','café.png','cafe\u0301.PNG','a\u0000b.png','f'.repeat(400)+'.png'];
const expectedPixels=Buffer.from([0,0,0,255,255,255,255,255]),report={node:process.version,oracle:sharp.versions,cases:[]},archives={};
const captured={};for(const phase of['before','after']){
  const captures=JSON.parse(readFileSync(path(`${phase}-captures.json`),'utf8'));
  const single=captures.find(c=>c.name.endsWith('.png')),zip=captures.find(c=>c.name==='colorfetti.zip');assert(single&&zip);
  const bytes=readFileSync(path(single.artifact)),raw=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.deepEqual(raw.data,expectedPixels);assert.equal(raw.info.width,2);assert.equal(raw.info.height,1);
  captured[phase]={name:single.name,bytes};archives[phase]=unzipSync(readFileSync(path(zip.artifact)));
  const entries=Object.entries(archives[phase]);assert.equal(entries.length,10);
  for(const[name,png]of entries){assert.deepEqual(await sharp(png).ensureAlpha().raw().toBuffer(),expectedPixels);report.cases.push({phase,name,bytes:png.length,sha256:hash(png),allRGBAExact:true});}
  report[phase]={singleName:single.name,singleBytes:bytes.length,zipBytes:zip.bytes,entries:entries.length,
    drag:JSON.parse(readFileSync(path(`${phase}-drag.json`),'utf8'))};
}
assert.equal(captured.before.name,'a:b-colorfetti.png');assert.equal(captured.after.name,'a-b-colorfetti.png');assert.deepEqual(captured.before.bytes,captured.after.bytes);
assert.deepEqual(Object.keys(archives.after),outNames(sourceNames));
for(let i=0;i<10;i++)assert.deepEqual(Object.values(archives.before)[i],Object.values(archives.after)[i]);
assert.equal(report.before.drag.prevented,false);assert.equal(report.before.drag.matchesSaveName,false);
assert.equal(report.after.drag.prevented,false);assert.equal(report.after.drag.matchesSaveName,true);assert.equal(report.after.drag.fileName,captured.after.name);
const expected=Object.entries(archives.after).map(([name,bytes])=>({name,sha256:hash(bytes)}));writeFileSync(path('after-windows-expected.json'),JSON.stringify(expected,null,2)+'\n');
report.sourceSHA256=Object.fromEntries(['src/lib/save.js','src/lib/save-names.test.js','src/App.svelte'].map(file=>[file,hash(readFileSync(file))]));
report.artifactsSHA256=Object.fromEntries(readdirSync(new URL('.',import.meta.url)).filter(name=>/^(before-|after-)/.test(name)).map(name=>[name,hash(readFileSync(path(name)))]));
report.buildSHA256={};for(const phase of['before','after']){const root=`.tmp/conversion-fixes-m6-${phase}`,hashes={};function visit(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const file=join(dir,e.name);if(e.isDirectory())visit(file);else hashes[relative(root,file).replaceAll('\\','/')]=hash(readFileSync(file));}}visit(root);report.buildSHA256[phase]=hashes;}
writeFileSync(path('oracle-results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({before:report.before,after:report.after,entriesChecked:report.cases.length,exactAllRGBA:true,PNGBytesUnchanged:true},null,2));
