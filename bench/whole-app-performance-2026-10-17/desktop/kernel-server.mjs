import http from 'node:http';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import path from 'node:path';
const base='217cb64360784c066e944f8121858d7726f0e4f2',files=new Map();
const names=execFileSync('git',['ls-tree','-r','--name-only',base,'--','src/lib'],{encoding:'utf8'}).trim().split('\n').filter(n=>n.endsWith('.js'));
for(const n of names){const bytes=execFileSync('git',['show',base+':'+n]);files.set('/baseline/'+path.basename(n),bytes);files.set('/candidate/'+path.basename(n),bytes);}
files.set('/candidate/quantize.js',readFileSync('bench/whole-app-performance-2026-10-17/review/quantize.candidate.js'));
files.set('/index.html',Buffer.from('<!doctype html><meta charset="utf-8"><title>Isolated quantize kernel audit</title>'));
http.createServer((req,res)=>{let k=new URL(req.url,'http://x').pathname;if(k==='/')k='/index.html';const b=files.get(k);res.writeHead(b?200:404,{'Content-Type':k.endsWith('.js')?'text/javascript':'text/html','Cache-Control':'no-store'});res.end(b||'Missing');}).listen(5375,'127.0.0.1',()=>console.log('Frozen baseline/candidate source kernel http://127.0.0.1:5375/'));
