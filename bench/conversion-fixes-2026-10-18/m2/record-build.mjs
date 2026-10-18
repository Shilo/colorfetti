import {readFileSync,readdirSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const dir='bench/conversion-fixes-2026-10-18/m2',destination=`${dir}/source-build.json`;
if(existsSync(destination))throw new Error('Historical build receipt already exists.');
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const paths=['src/ImageViewer.svelte','src/Tile.svelte','src/Pixels.svelte','src/viewer-navigation.css','src/lib/viewer-navigation.js','src/lib/viewer-navigation.test.js','src/lib/viewer-inspection.js','src/lib/viewer-inspection-policy.js','src/lib/viewer-inspection.test.js','src/lib/palette-animation-cache.js','src/lib/palette-animation-cache.test.js'];
const builds=['before','after','review','leases','settlement','shared','framefield'].map(name=>{const path=`.tmp/conversion-fixes-m2-${name}`;return {name,path,assets:readdirSync(`${path}/assets`).filter(name=>/^index-.*\.(js|css)$/.test(name)).map(name=>({name,sha256:hash(`${path}/assets/${name}`)}))};});
const receipt={date:'2026-10-18',scope:'M2-owned source hashes and immutable build assets. Builds contain concurrent M1/M7 work; only framefield is the final M2 source. Root-coordinated desktop CUA performed live checks because this agent no longer had browser surfaces.',sources:paths.map(path=>({path,sha256:hash(path)})),builds,fixtures:readdirSync(dir).filter(name=>/\.(png|gif)$/.test(name)).map(name=>({name,sha256:hash(`${dir}/${name}`)}))};
writeFileSync(destination,JSON.stringify(receipt,null,2)+'\n');console.log(destination);
