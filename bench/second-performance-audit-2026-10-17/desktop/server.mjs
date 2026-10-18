// Copy of bench/whole-app-performance-2026-10-17/server.mjs for the second audit.
// Adds: Document-Policy: js-profiling (only with --profiling), the desktop probe
// injected for ?probe, and /diag/ for this directory's diagnostic fixtures.
import http from 'node:http';
import {readFileSync, readdirSync, writeFileSync, mkdirSync} from 'node:fs';
import path from 'node:path';
const here = import.meta.dirname;
const build = path.resolve(process.argv[2]);
const port = Number(process.argv[3]);
const profiling = process.argv.includes('--profiling');
const raw = path.resolve('.tmp/second-audit-2026-10-17/desktop-raw');mkdirSync(raw,{recursive:true});
const files = new Map();
function collect(dir, prefix) {
  for (const e of readdirSync(dir, {withFileTypes:true})) {
    const p = path.join(dir,e.name), url = prefix+'/'+e.name;
    if(e.isDirectory())collect(p,url);
    else if(!url.endsWith('.mp4'))files.set(url,readFileSync(p));
  }
}
collect(build,'');
collect(path.resolve('bench/practical-workloads-2026-10-16/fixtures'),'/fixtures');
collect(path.join(here,'fixtures'),'/diag');
files.set('/diag/manifest.json',readFileSync(path.join(here,'diagnostic-manifest.json')));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.gif':'image/gif','.json':'application/json','.map':'application/json','.webmanifest':'application/manifest+json'};
http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  // Test receipts (profiles, window summaries) posted by probe.js land in .tmp.
  if(req.method==='POST'&&url.pathname==='/receipt'){const chunks=[];req.on('data',c=>chunks.push(c));req.on('end',()=>{const name=url.searchParams.get('name').replace(/[^\w.-]/g,'_');writeFileSync(path.join(raw,name),Buffer.concat(chunks));res.writeHead(204);res.end();});return;}
  let key=url.pathname;
  if(key.endsWith('/'))key+='index.html';
  let bytes=files.get(key);
  // probe.js is read per request so it can be fixed without restarting the server.
  if(key==='/desktop-probe.js')bytes=readFileSync(path.join(here,'probe.js'));
  if(bytes&&key==='/index.html'&&url.searchParams.has('probe'))bytes=Buffer.from(bytes.toString().replace('<head>','<head><script src="/desktop-probe.js"></script>'));
  const headers={'Content-Type':types[path.extname(key)]||'application/octet-stream','Cache-Control':'no-store'};
  if(profiling&&key.endsWith('.html'))headers['Document-Policy']='js-profiling';
  res.writeHead(bytes?200:404,headers);
  res.end(bytes||'Not found');
}).listen(port,'127.0.0.1',()=>console.log(`Frozen ${build} at http://127.0.0.1:${port}/ profiling=${profiling}`));
