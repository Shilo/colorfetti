import http from 'node:http';
import {readFileSync, readdirSync} from 'node:fs';
import path from 'node:path';
const build = path.resolve(process.argv[2] || '.tmp/whole-app-performance-2026-10-17/baseline/dist');
const port = Number(process.argv[3] || 5371);
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
files.set('/audit-probe.js',readFileSync('bench/whole-app-performance-2026-10-17/codex/probe.js'));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.gif':'image/gif','.json':'application/json','.webmanifest':'application/manifest+json'};
http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  let key=url.pathname;
  if(key.endsWith('/'))key+='index.html';
  let bytes=files.get(key);
  if(bytes&&key==='/index.html'&&url.searchParams.has('audit'))bytes=Buffer.from(bytes.toString().replace('<head>','<head><script defer src="/audit-probe.js"></script>'));
  res.writeHead(bytes?200:404,{'Content-Type':types[path.extname(key)]||'application/octet-stream','Cache-Control':'no-store'});
  res.end(bytes||'Not found');
}).listen(port,'127.0.0.1',()=>console.log(`Frozen ${build} at http://127.0.0.1:${port}/`));
