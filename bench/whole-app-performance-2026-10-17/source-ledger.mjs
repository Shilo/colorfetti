import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
export const sourceHashEncoding='Text normalized to LF UTF-8; binary PNG assets retain exact bytes.';
export function canonicalSourceBytes(file,bytes){
  return path.extname(file).toLowerCase()==='.png'?bytes:Buffer.from(bytes.toString('utf8').replaceAll('\r\n','\n'));
}
export const sourceSha=(file,bytes)=>createHash('sha256').update(canonicalSourceBytes(file,bytes)).digest('hex');
export function sourceLedger(revision){
  const names=execFileSync('git',['ls-tree','-r','--name-only',revision,'--','src'],{encoding:'utf8'}).trim().split('\n');
  return names.map(file=>{const raw=execFileSync('git',['show',revision+':'+file],{maxBuffer:20*1024*1024}),bytes=canonicalSourceBytes(file,raw);return{path:file,bytes:bytes.length,sha256:sourceSha(file,raw)};});
}
