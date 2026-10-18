// Serve only frozen variant dist trees. This process never changes build files.
import http from 'node:http';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root=path.resolve(fileURLToPath(new URL('../../../',import.meta.url)));
const manifest=JSON.parse(await readFile(new URL('variant-manifest.json',import.meta.url),'utf8'));
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.gif':'image/gif','.svg':'image/svg+xml','.ico':'image/x-icon','.mp4':'video/mp4','.webmanifest':'application/manifest+json'};
for(const variant of manifest.variants){
  const directory=path.resolve(root,'.tmp/codex-independent-performance-2026-10-18/variants',variant.name,'dist');
  const server=http.createServer(async(request,response)=>{
    try {
      const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname),file=path.resolve(directory,'.'+pathname);
      if(file!==directory&&!file.startsWith(directory+path.sep)){response.writeHead(403).end();return;}
      const target=(await stat(file)).isDirectory()?path.join(file,'index.html'):file;
      response.writeHead(200,{'Content-Type':mime[path.extname(target)]??'application/octet-stream','Cache-Control':'no-store'}).end(await readFile(target));
    }catch(error){response.writeHead(error.code==='ENOENT'?404:500).end('Unavailable');}
  });
  server.listen(variant.port,'127.0.0.1',()=>console.log(`${variant.name} http://localhost:${variant.port}/`));
}
