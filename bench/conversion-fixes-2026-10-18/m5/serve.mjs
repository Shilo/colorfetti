import {createServer} from 'node:http';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve,join,relative,extname} from 'node:path';
const root=resolve(process.argv[2]),port=Number(process.argv[3]),assets=new Map();
function collect(path){for(const item of readdirSync(path,{withFileTypes:true})){const file=join(path,item.name);if(item.isDirectory())collect(file);else assets.set('/'+relative(root,file).replaceAll('\\','/'),readFileSync(file));}}
collect(root);
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.gif':'image/gif','.svg':'image/svg+xml','.mp4':'video/mp4','.webmanifest':'application/manifest+json'};
createServer((req,res)=>{const key=new URL(req.url,'http://localhost').pathname;const file=key==='/'?'/index.html':key;const bytes=assets.get(file);if(!bytes){res.writeHead(404).end();return;}res.writeHead(200,{'content-type':types[extname(file)]??'application/octet-stream','cache-control':'no-store'}).end(bytes);}).listen(port,'127.0.0.1',()=>console.log(`Frozen M5 build: http://127.0.0.1:${port}/`));
