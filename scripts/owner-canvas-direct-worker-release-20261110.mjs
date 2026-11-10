/**
 * DEEPSYQ: exact Cloudflare Pages asset-manifest patch + complete existing Worker.
 * ONLY canvas.html, canvas-workspace.js, canvas-workspace.css (and missing, approved
 * Canvas photo assets) are permitted. No static-only production publish.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const mode=process.argv[2], account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
const project='https://api.cloudflare.com/client/v4/accounts/'+account+'/pages/projects/deepsyq';
const root='app/src/main/assets',tmp='/tmp/owner-canvas-direct',src=tmp+'/source',datafile=tmp+'/state.json';
const cors=['canvas.html','canvas-workspace.js','canvas-workspace.css'];
const photos=Array.from({length:13},(_,i)=>String(i+1).padStart(2,'0')).flatMap(n=>['media/canvas-demos/20261110/canvas-demo-'+n+'.webp','media/canvas-demos/20261110/canvas-demo-'+n+'-thumb.webp']);
const all=[...cors,...photos], sha=x=>createHash('sha256').update(x).digest('hex');
const sh=(exe,args,opts={})=>execFileSync(exe,args,{encoding:'utf8',maxBuffer:100000000,...opts}).trim();
const read=p=>fs.readFileSync(p),state=()=>JSON.parse(fs.readFileSync(datafile,'utf8'));
const sleep=ms=>new Promise(res=>setTimeout(res,ms));
const mime=n=>n.endsWith('.html')?'text/html':n.endsWith('.css')?'text/css':n.endsWith('.js')?'application/javascript':'image/webp';
function hashPages(filename,bytes){
 const ext=path.extname(filename).slice(1);
 const code='import sys,base64;from blake3 import blake3;d=sys.stdin.buffer.read();print(blake3(base64.b64encode(d)+b"'+ext+'").hexdigest()[:32])';
 return sh('python3',['-c',code],{input:bytes});
}
function stableSettings(settings){
 const generated=new Set(['CF_PAGES','CF_PAGES_BRANCH','CF_PAGES_COMMIT_SHA','CF_PAGES_URL']);
 return {...settings,bindings:(settings.bindings||[]).map(b=>generated.has(b.name)?{name:b.name,type:b.type}:b).sort((a,b)=>a.name.localeCompare(b.name))};
}
const workerHash=x=>sha(JSON.stringify(stableSettings(x)));
async function cloud(url,{method='GET',body,uploadToken=false}={}){
 const r=await fetch(url,{method,body,headers:uploadToken?{Authorization:'Bearer '+uploadToken,'Content-Type':'application/json'}:body instanceof FormData?{Authorization:'Bearer '+token}:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},signal:AbortSignal.timeout(75000)});
 let v={};try{v=await r.json()}catch{}
 if(![200,201,202].includes(r.status)||v.success===false)throw Error('Cloudflare '+new URL(url).pathname+' HTTP '+r.status+' '+JSON.stringify(v.errors||[]).slice(0,450));
 return v.result;
}
async function projectInfo(){
 assert(token&&/^[a-f0-9]{32}$/.test(account||''),'Existing Cloudflare credentials unavailable');
 const p=await cloud(project);
 assert(p.name==='deepsyq'&&p.production_branch==='deepsyq-platform','Project does not match owner configuration');
 assert(p.canonical_deployment?.id&&p.canonical_deployment?.uses_functions===true,'Current production Worker missing');
 return p;
}
async function deployment(id){return cloud(project+'/deployments/'+id)}
async function file(url){
 const r=await fetch(url,{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(20000)});
 assert(r.status===200,'Public asset inaccessible: '+new URL(url).pathname+' HTTP '+r.status);
 return Buffer.from(await r.arrayBuffer());
}
function stripInjected(buf){
 let s=buf.toString('utf8');
 const a=s.indexOf('<script>(function(){if(location.pathname!==');
 if(a<0)return s;
 const b=s.indexOf('</script>',a);
 if(b<0)return s;
 const snippet=s.slice(a,b+9);
 return snippet.includes('history.replaceState(null,')&&snippet.includes('location.search+location.hash')?s.slice(0,a)+s.slice(b+9):s;
}
function patchCanvas(latest,source){
 const find=doc=>{const a=doc.indexOf('<main id="canvasPageMain">'),b=doc.indexOf('</main>',a);assert(a>=0&&b>a,'Canvas main boundary missing');assert(doc.indexOf('<main id="canvasPageMain">',a+1)===-1,'Duplicate Canvas main');return [a,b+7]};
 const [a,b]=find(latest),[x,y]=find(source);
 let html=latest.slice(0,a)+source.slice(x,y)+latest.slice(b);
 assert(html.includes('id="cwGallery"')&&html.includes('id="cwStage"')&&html.includes('id="cwRatioQuick"'),'New Canvas controls absent');
 const legacyJS='<script type="module" src="canvas-editor.js"></script>';
 const oldJS='<script type="module" src="canvas-workspace.js?v=20261110"></script>';
 const newJS='<script type="module" src="canvas-workspace.js?v=20261110-ux2"></script>';
 assert([legacyJS,oldJS,newJS].some(x=>html.includes(x)),'Recognized Canvas script link missing');
 html=html.replace(legacyJS,newJS).replace(oldJS,newJS);
 const legacyCSS='<link rel="stylesheet" href="canvas-page.css">';
 const oldCSS='<link rel="stylesheet" href="canvas-workspace.css?v=20261110">';
 const newCSS='<link rel="stylesheet" href="canvas-workspace.css?v=20261110-ux2">';
 assert(html.includes(oldCSS)||html.includes(newCSS)||html.includes(legacyCSS),'Recognized Canvas CSS missing');
 html=html.replace(oldCSS,newCSS);
 if(!html.includes(newCSS))html=html.replace(legacyCSS,legacyCSS+newCSS);
 assert(html.includes('deepsyq-site-shell.js')&&html.includes('deepsyq-mobile-shell.js')&&html.includes('jarvis-core.js'),'Site shell or JARVIX lost');
 return html;
}
function audit(manifest,baseline){
 const allowed=new Set(all.map(x=>'/'+x));
 for(const [p,v] of Object.entries(baseline))if(!allowed.has(p))assert.equal(manifest[p],v,'Protected asset changed: '+p);
 const added=Object.keys(manifest).filter(p=>!(p in baseline));
 assert(added.every(p=>allowed.has(p)),'Unapproved asset added');
 assert(Object.keys(manifest).length<=20000,'Manifest exceeds Cloudflare limits');
}
async function prepare(){
 fs.mkdirSync(tmp,{recursive:true});
 const p=await projectInfo(),id=p.canonical_deployment.id;
 const d=await deployment(id);
 assert(d.uses_functions===true,'Current deployment missing Worker');
 assert(d.files&&Object.keys(d.files).length>=1000,'Production asset manifest unavailable');
 const prev=d.deployment_trigger?.metadata?.commit_hash;
 assert(/^[0-9a-f]{40}$/.test(prev||''),'Latest production source commit unknown');
 sh('git',['cat-file','-e',prev+'^{commit}']);
 const workTree=tmp+'/prod-source';
 sh('git',['worktree','add','--detach',workTree,prev]);
 const worker=read(workTree+'/'+root+'/_worker.js');
 assert(worker.length>10000,'Worker source suspiciously short');
 const bindings=p.deployment_configs?.production||{};
 for(const k of ['DATABASE_URL','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','GOOGLE_CLIENT_ID'])assert(k in (bindings.env_vars||{}),'Missing production binding '+k);
 assert('R2_BUCKET' in (bindings.r2_buckets||{}),'Production media bucket missing');
 const workerSettings=await cloud('https://api.cloudflare.com/client/v4/accounts/'+account+'/workers/scripts/'+encodeURIComponent(p.production_script_name)+'/settings');
 const latest=stripInjected(await file('https://deepsyq.app/canvas.html?canvasDirectBaseline='+Date.now()));
 const source=fs.readFileSync(root+'/canvas.html','utf8');
 const output=patchCanvas(latest,source);
 fs.mkdirSync(src,{recursive:true});
 fs.writeFileSync(src+'/canvas.html',output);
 fs.copyFileSync(root+'/canvas-workspace.js',src+'/canvas-workspace.js');
 fs.copyFileSync(root+'/canvas-workspace.css',src+'/canvas-workspace.css');
 const manifest={...d.files};
 const upload=[];
 for(const rel of all){
   const data=read(rel==='canvas.html'?src+'/canvas.html':cors.includes(rel)?src+'/'+rel:root+'/'+rel);
   const hash=hashPages(rel,data),name='/'+rel,prevHash=manifest[name];
   if(cors.includes(rel)){
     assert(prevHash!==hash,'Expected modified Canvas resource is unchanged '+rel);
     manifest[name]=hash;
     upload.push({name,hash,mime:mime(rel),data:data.toString('base64')});
   }else if(!prevHash){
     manifest[name]=hash;
     upload.push({name,hash,mime:mime(rel),data:data.toString('base64')});
   }
 }
 audit(manifest,d.files);
 const state={baselineId:id,previous:prev,target:sh('git',['rev-parse','HEAD']),scriptName:p.production_script_name,workerSourceSha:sha(worker),settingsHash:workerHash(workerSettings),files:d.files,manifest,upload,workerPath:workTree+'/'+root+'/_worker.js',headersPath:workTree+'/'+root+'/_headers',redirectsPath:workTree+'/'+root+'/_redirects',workerSize:worker.length};
 fs.writeFileSync(datafile,JSON.stringify(state));
 console.log('CANVAS_DIRECT_PREPARED',JSON.stringify({baselineId:id,manifestAssets:Object.keys(manifest).length,modified:3,missingCanvasAssets:upload.length-3,workerPreserved:true}));
}
async function upload(){
 const s=state(),data=s.upload;
 assert(data.length>=3&&data.length<=29,'Wrong Canvas upload asset scope');
 const p=await cloud(project+'/upload-token');
 const jwt=p?.jwt||p?.token;
 assert(typeof jwt==='string'&&jwt.length>30,'Cloudflare Pages upload JWT unavailable');
 const url='https://api.cloudflare.com/client/v4/pages/assets/upload';
 for(let i=0;i<data.length;i+=4){
  const batch=data.slice(i,i+4).map(x=>({base64:true,key:x.hash,value:x.data,metadata:{contentType:x.mime}}));
  await cloud(url,{method:'POST',body:JSON.stringify(batch),uploadToken:jwt});
 }
 await cloud('https://api.cloudflare.com/client/v4/pages/assets/upsert-hashes',{method:'POST',body:JSON.stringify({hashes:data.map(x=>x.hash)}),uploadToken:jwt});
 console.log('CANVAS_DIRECT_ASSETS_UPLOADED',JSON.stringify({count:data.length}));
}
function bundleWorker(){
 const s=state(),bundled=tmp+'/worker.js';
 // Bundle EXACT source from the CURRENT LIVE commit, never stale Canvas branch.
 sh('npx',['--yes','esbuild@0.25.12',s.workerPath,'--bundle','--format=esm','--platform=browser','--target=es2022','--outfile='+bundled]);
 const v=read(bundled);assert(v.length>10000&&v.length<25*1024*1024,'Worker bundle invalid');
 fs.writeFileSync(tmp+'/bundled-worker.sha256',sha(v));
 console.log('CANVAS_DIRECT_WORKER_BUNDLED',JSON.stringify({sourceBytes:s.workerSize,bundleBytes:v.length,sourceUnchanged:true}));
}
function multipart(branch){
 const s=state(),work=read(tmp+'/worker.js');
 const form=new FormData();
 form.append('manifest',JSON.stringify(s.manifest));
 form.append('branch',branch);
 form.append('commit_hash',s.target);
 form.append('commit_dirty','true');
 form.append('commit_message','OWNER Canvas UI fixes: preserve all existing assets and Worker');
 form.append('_worker.js',new Blob([work],{type:'application/javascript'}),'_worker.js');
 for(const [field,p] of [['_headers',s.headersPath],['_redirects',s.redirectsPath]]){
   if(fs.existsSync(p))form.append(field,new Blob([read(p)],{type:'text/plain'}),field);
 }
 return form;
}
async function publish(branch){
 const s=state();
 const p=await projectInfo();
 if(branch==='deepsyq-platform')assert.equal(p.canonical_deployment.id,s.baselineId,'Another owner published since snapshot; abort');
 const d=await cloud(project+'/deployments',{method:'POST',body:multipart(branch)});
 assert(d.id&&d.uses_functions===true,'New deployment did not preserve Worker/Functions');
 fs.writeFileSync(tmp+'/'+branch+'.json',JSON.stringify({id:d.id,url:d.url,branch}));
 console.log('CANVAS_DIRECT_DEPLOYED',JSON.stringify({branch,id:d.id,url:d.url,worker:true}));
}
async function check(branch){
 const s=state(),info=JSON.parse(fs.readFileSync(tmp+'/'+branch+'.json','utf8')),d=await deployment(info.id);
 assert(d.uses_functions===true,'Worker missing after publication');
 assert.deepEqual(Object.keys(d.files).sort(),Object.keys(s.manifest).sort(),'Deployment file names differ');
 for(const [n,v] of Object.entries(s.manifest))assert.equal(d.files[n],v,'Deployment asset changed '+n);
 const url=branch==='test'?'https://test.deepsyq.pages.dev':'https://deepsyq.app';
 for(const rel of cors){
  let matched=false,last='';
  for(let retry=0;retry<12;retry++){
   try{
    const b=await file(url+'/'+rel+'?canvasRelease='+Date.now());
    const actual=rel.endsWith('.html')?Buffer.from(stripInjected(b)):b;
    if(sha(actual)===sha(read(src+'/'+rel))){matched=true;break}
    last='content digest different';
   }catch(e){last=String(e.message)}
   await sleep(2000);
  }
  assert(matched,branch+' Canvas bytes mismatch '+rel+': '+last);
 }
 for(const rel of ['media/canvas-demos/20261110/canvas-demo-01.webp','media/canvas-demos/20261110/canvas-demo-13.webp']){
  const b=await file(url+'/'+rel+'?canvasRelease='+Date.now());
  assert(b.length>20000,'Canvas demo image unavailable '+rel);
 }
 for(const apiRoute of ['api/config','api/ai-billing/config']){
  const r=await fetch(url+'/'+apiRoute,{signal:AbortSignal.timeout(20000)});
  assert.equal(r.status,200,branch+' backend unavailable '+apiRoute);
 }
 if(branch==='deepsyq-platform'){
   const p=await projectInfo();
   assert.equal(p.canonical_deployment.id,info.id,'Production now points elsewhere');
   assert.equal(p.production_script_name,s.scriptName,'Worker name changed');
   const workerSettings=await cloud('https://api.cloudflare.com/client/v4/accounts/'+account+'/workers/scripts/'+encodeURIComponent(p.production_script_name)+'/settings');
   assert.equal(workerHash(workerSettings),s.settingsHash,'Critical Worker settings changed');
 }
 console.log('CANVAS_DIRECT_VERIFIED',JSON.stringify({branch,worker:true,manifestFiles:Object.keys(s.manifest).length,changedFiles:3,demos:13,apiHealthy:true}));
}
async function rollback(){
 const s=state(),p=await projectInfo();
 const intended=fs.existsSync(tmp+'/deepsyq-platform.json')?JSON.parse(fs.readFileSync(tmp+'/deepsyq-platform.json','utf8')):null;
 if(p.canonical_deployment?.id===s.baselineId){console.log('MAIN_UNCHANGED');return}
 assert(intended&&p.canonical_deployment.id===intended.id,'Another owner published; do not rollback');
 await cloud(project+'/deployments/'+s.baselineId+'/rollback',{method:'POST'});
 console.log('CANVAS_DIRECT_ROLLBACK',JSON.stringify({restored:s.baselineId}));
}
try{
 if(mode==='prepare')await prepare();
 else if(mode==='upload')await upload();
 else if(mode==='bundle')bundleWorker();
 else if(mode==='test')await publish('test');
 else if(mode==='test-verify')await check('test');
 else if(mode==='main')await publish('deepsyq-platform');
 else if(mode==='main-verify')await check('deepsyq-platform');
 else if(mode==='rollback')await rollback();
 else throw Error('Invalid release action');
}catch(e){console.error('CANVAS_DIRECT_BLOCKED:',e.stack||e.message);process.exitCode=2}
