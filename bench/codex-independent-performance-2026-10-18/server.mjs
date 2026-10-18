import http from 'node:http';
import {readFileSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const dir=path.resolve(process.argv[2]||'.tmp/codex-independent-performance-2026-10-18/current/dist'),port=Number(process.argv[3]||5391),files=new Map();
function collect(folder,prefix){for(const e of readdirSync(folder,{withFileTypes:true})){const p=path.join(folder,e.name),u=prefix+'/'+e.name;if(e.isDirectory())collect(p,u);else files.set(u,p.endsWith('.mp4')?()=>readFileSync(p):readFileSync(p));}}
collect(dir,'');collect(path.resolve('bench/practical-workloads-2026-10-16/fixtures'),'/fixtures');
const probe=readFileSync(new URL('probe.js',import.meta.url));files.set('/audit-probe.js',probe);
files.set('/audit-build.json',Buffer.from(JSON.stringify({dir,port,indexSha256:createHash('sha256').update(files.get('/index.html')).digest('hex'),probeSha256:createHash('sha256').update(probe).digest('hex')})));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.gif':'image/gif','.svg':'image/svg+xml','.json':'application/json','.webmanifest':'application/manifest+json','.mp4':'video/mp4'};
http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');if(req.method==='POST'&&u.pathname==='/audit-receipt'){
 const id=u.searchParams.get('id');if(!/^[a-zA-Z0-9_-]{1,80}$/.test(id||'')){res.writeHead(400).end();return;}
 const chunks=[];let bytes=0;req.on('data',b=>{bytes+=b.length;if(bytes>2000000)req.destroy();else chunks.push(b);});req.on('end',()=>{try{const data=JSON.parse(Buffer.concat(chunks));const out=path.resolve('bench/codex-independent-performance-2026-10-18/codex-browser');mkdirSync(out,{recursive:true});writeFileSync(path.join(out,id+'.json'),JSON.stringify(data,null,2));res.writeHead(204).end();}catch{res.writeHead(400).end();}});return;
 }let k=u.pathname;if(k.endsWith('/'))k+='index.html';let b=files.get(k);if(typeof b==='function')b=b();if(b&&k==='/index.html'&&u.searchParams.has('audit'))b=Buffer.from(b.toString().replace('<head>','<head><script defer src="/audit-probe.js"></script>'));res.writeHead(b?200:404,{'Content-Type':types[path.extname(k)]||'application/octet-stream','Cache-Control':'no-store'});res.end(b||'Not found');}).listen(port,'127.0.0.1',()=>console.log(`Frozen ${dir} http://127.0.0.1:${port}/; optional ?audit=1`));
