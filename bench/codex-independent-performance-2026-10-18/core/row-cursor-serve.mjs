// Coordinator should own this process so agent completion cannot close servers.
import http from 'node:http';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root=path.resolve(fileURLToPath(new URL('../../../',import.meta.url))),manifest=JSON.parse(await readFile(new URL('row-cursor-build-manifest.json',import.meta.url),'utf8'));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.gif':'image/gif','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.mp4':'video/mp4'};
for(const variant of manifest.variants){const directory=path.resolve(root,'.tmp/codex-independent-performance-2026-10-18/row-cursor',variant.name,'dist');http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(directory,'.'+pathname);if(file!==directory&&!file.startsWith(directory+path.sep)){res.writeHead(403).end();return;}const target=(await stat(file)).isDirectory()?path.join(file,'index.html'):file;res.writeHead(200,{'Content-Type':types[path.extname(target)]??'application/octet-stream','Cache-Control':'no-store'}).end(await readFile(target));}catch{res.writeHead(404).end();}}).listen(variant.port,'127.0.0.1',()=>console.log(`Row cursor ${variant.name}: http://127.0.0.1:${variant.port}/`));}
