import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { decode } from '../claude-audit-2026-10-15/device/audit-lib.mjs';
// Deliberately inspect the archived rejected candidate, not shipped runtime.
import { analyze, mask, unify, patternRoleBounds } from './candidate-recolor.js';
import { maskRoles, collectOneBitUsage } from './candidate-onebit-usage.js';
import { analysisKey } from '../../src/lib/image-reanalysis.js';
const fixtures=['kenney-sheet-1024.png','kenney-sheet-2048.png','real-magic.gif','kenney-motion-256.gif'];
const results=[];
for(const file of fixtures) {
 const decoded=await decode(`bench/practical-workloads-2026-10-16/fixtures/${file}`);
 const frames=decoded.frames.map(data=>{
  const original={width:decoded.w,height:decoded.h,data},img=analyze(original);
  return{original,img,by:analysisKey(img.soft)};
 });
 unify(frames.map(f=>f.img));
 const item={...frames[0],...(frames.length>1?{frames}:{})};
 for(const style of ['checker','bayer','hatch','noise','atkinson']) {
  const expected=frames.reduce((roles,frame)=>roles|maskRoles(mask(frame.img,style)),0);
  const proofs=frames.map(frame=>patternRoleBounds(frame.img,style));
  const proofRoleUnion=proofs.every(Boolean)?proofs.reduce((roles,p)=>roles|p.lower,0):null;
  const before=performance.now();
  const result=await collectOneBitUsage(item,{style,set:{},first:'#000000',second:'#ffffff'});
  const elapsed=performance.now()-before;
  if(result)assert.equal(result.count,Number(!!(expected&1))+Number(!!(expected&2)));
  results.push({file,width:decoded.w,height:decoded.h,frames:frames.length,style,expectedRoles:expected,proofRoleUnion,count:result?.count??null,inspectionMs:elapsed});
 }
}
await writeFile(new URL('./practical-result.json',import.meta.url),JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results,null,2));
