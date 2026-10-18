import {writeFileSync,readFileSync} from 'node:fs';
import path from 'node:path';
const ports=await Promise.all([5371,5372,5375,5376,5377,5378].map(async port=>{
 try{const r=await fetch(`http://127.0.0.1:${port}/`,{signal:AbortSignal.timeout(1500)});return{port,reachable:true,status:r.status};}
 catch(e){return{port,reachable:false,reason:e.cause?.code||e.name};}
}));
if(ports.some(x=>x.reachable))throw Error('An owned helper endpoint is still reachable; inspect ownership before stopping it.');
writeFileSync(path.join(import.meta.dirname,'cleanup.json'),JSON.stringify({date:new Date().toISOString(),ownedHelperEndpoints:ports,ownedCodexTabsClosed:true,phone:JSON.parse(readFileSync(path.join(import.meta.dirname,'android/cleanup.json'),'utf8')),note:'Root stopped its known helper sessions. Sibling-agent session handles were unavailable after their turns; exact localhost endpoints are now unreachable. No unrelated process/browser was terminated.'},null,2)+'\n');
console.log('PASS all six owned helper endpoints unreachable; phone cleanup receipt retained.');
