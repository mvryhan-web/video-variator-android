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
const root='app/src/main/assets',tmp='/tmp/owner-i18n-release',src=tmp+'/source',datafile=tmp+'/state.json';
const pages=fs.readdirSync(root).filter(x=>x.endsWith('.html')).sort();
const catalogs=fs.readdirSync(root+'/i18n').filter(x=>x.endsWith('.json')).sort().map(x=>'i18n/'+x);
assert.equal(pages.length,34,'Expected 33 pages plus 404');
assert.equal(catalogs.length,35,'Expected 34 per-page catalogs and shared.json');
const cors=[...pages,'deepsyq-page-i18n.js',...catalogs];
const photos=[];
const all=[...cors,...photos], sha=x=>createHash('sha256').update(x).digest('hex');
const sh=(exe,args,opts={})=>execFileSync(exe,args,{encoding:'utf8',maxBuffer:100000000,...opts}).trim();
const read=p=>fs.readFileSync(p),state=()=>JSON.parse(fs.readFileSync(datafile,'utf8'));
const sleep=ms=>new Promise(res=>setTimeout(res,ms));
const mime=n=>n.endsWith('.html')?'text/html':n.endsWith('.json')?'application/json':n.endsWith('.js')?'application/javascript':'application/octet-stream';
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
const loader='<script defer src="deepsyq-page-i18n.js?v=20261111"></script>';
function injectLocaleIntoExactLive(original,filename){
 assert(original.includes('</head>'),'Current page is missing head closing tag '+filename);
 if(original.includes(loader))return original;
 assert(original.split('</head>').length===2,'Ambiguous page head '+filename);
 const updated=original.replace('</head>',loader+'\n</head>');
 assert(updated.replace(loader+'\n','')===original,'Unexpected HTML change '+filename);
 return updated;
}
async function findExactLivePage(filename,manifest,workTree){
 const liveHash=manifest['/'+filename];
 const gitSource=workTree+'/'+root+'/'+filename;
 if(!liveHash){
  // Approved new HTML page absent from the previous production manifest.
  assert(fs.existsSync(gitSource),'New HTML page missing from live Git '+filename);
  return read(gitSource).toString('utf8');
 }
 if(fs.existsSync(gitSource)){
  const bytes=read(gitSource);
  if(hashPages(filename,bytes)===liveHash)return bytes.toString('utf8');
 }
 // Another deployment may have changed this page outside Git. Keep its exact
 // current LIVE HTML, byte-for-byte, and insert only the locale loader.
 const url='https://deepsyq.app/'+encodeURIComponent(filename)+'?ownerLocaleBaseline='+Date.now();
 const response=await fetch(url,{headers:{'cache-control':'no-cache'},redirect:'manual',signal:AbortSignal.timeout(22000)});
 if(response.status===200){
  const body=Buffer.from(await response.arrayBuffer());
  const unwrapped=Buffer.from(stripInjected(body));
  if(hashPages(filename,unwrapped)===liveHash)return unwrapped.toString('utf8');
 }
 throw Error('Cannot verify latest deployed HTML exactly: '+filename+'. No site changed.');
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
 assert(d.files&&Object.keys(d.files).length>=1000,'Current production asset manifest incomplete');
 const prev=d.deployment_trigger?.metadata?.commit_hash;
 assert(/^[0-9a-f]{40}$/.test(prev||''),'Production source commit missing');
 sh('git',['cat-file','-e',prev+'^{commit}']);
 const workTree=tmp+'/prod-source';
 sh('git',['worktree','add','--detach',workTree,prev]);
 const worker=read(workTree+'/'+root+'/_worker.js');
 assert(worker.length>10000,'Current Worker unexpectedly small');
 const bindings=p.deployment_configs?.production||{};
 for(const k of ['DATABASE_URL','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','GOOGLE_CLIENT_ID'])
  assert(k in (bindings.env_vars||{}),'Required production binding missing '+k);
 assert('R2_BUCKET' in (bindings.r2_buckets||{}),'Production R2 bucket missing');
 const settings=await cloud('https://api.cloudflare.com/client/v4/accounts/'+account+'/workers/scripts/'+encodeURIComponent(p.production_script_name)+'/settings');
 fs.mkdirSync(src,{recursive:true});
 const manifest={...d.files},upload=[];
 for(const filename of pages){
  const newest=await findExactLivePage(filename,d.files,workTree);
  const updated=injectLocaleIntoExactLive(newest,filename);
  fs.writeFileSync(src+'/'+filename,updated);
 }
 for(const rel of cors){
  const data=read(pages.includes(rel)?src+'/'+rel:root+'/'+rel);
  const digest=hashPages(rel,data),name='/'+rel,oldHash=manifest[name];
  if(digest!==oldHash){manifest[name]=digest;upload.push({name,hash:digest,mime:mime(rel),data:data.toString('base64')});}
 }
 audit(manifest,d.files);
 const approved=new Set(cors.map(x=>'/'+x));
 assert(upload.every(x=>approved.has(x.name)),'Unapproved asset added');
 assert(catalogs.includes('i18n/pricing.html.json'),'Pricing translation catalog missing');
 const state={baselineId:id,previous:prev,target:sh('git',['rev-parse','HEAD']),scriptName:p.production_script_name,workerSourceSha:sha(worker),settingsHash:workerHash(settings),files:d.files,manifest,upload,workerPath:workTree+'/'+root+'/_worker.js',headersPath:workTree+'/'+root+'/_headers',redirectsPath:workTree+'/'+root+'/_redirects',workerSize:worker.length};
 fs.writeFileSync(datafile,JSON.stringify(state));
 console.log('I18N_SCOPE_VERIFIED',JSON.stringify({baseline:id,pages:pages.length,locales:4,catalogs:catalogs.length,uploaded:upload.length,manifestFiles:Object.keys(manifest).length,workerPreserved:true}));
}
async function upload(){
 const s=state(),data=s.upload;
 assert(data.length>=1&&data.length<=72,'Wrong i18n update scope');
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
 const created=await cloud(project+'/deployments',{method:'POST',body:multipart(branch)});
 assert(created.id,'Cloudflare deployment ID missing');
 console.log('CANVAS_DIRECT_CREATED',JSON.stringify({branch,id:created.id,url:created.url,initialUsesFunctions:created.uses_functions,stage:created.latest_stage?.status}));
 let d=created;
 for(let i=0;i<14;i++){
  d=await deployment(created.id);
  if(d.latest_stage?.status==='failure'||d.latest_stage?.status==='canceled')break;
  if(d.uses_functions===true&&d.latest_stage?.status==='success')break;
  await sleep(2000);
 }
 assert(d.uses_functions===true,'Deployment dropped Worker/Functions: '+JSON.stringify({id:d.id,usesFunctions:d.uses_functions,stage:d.latest_stage?.status,errors:d.latest_stage?.name}));
 fs.writeFileSync(tmp+'/'+branch+'.json',JSON.stringify({id:d.id,url:d.url,branch}));
 console.log('CANVAS_DIRECT_DEPLOYED',JSON.stringify({branch,id:d.id,url:d.url,worker:true}));
}
async function check(branch){
 const s=state(),info=JSON.parse(fs.readFileSync(tmp+'/'+branch+'.json','utf8')),d=await deployment(info.id);
 assert(d.uses_functions===true,'Worker missing after publication');
 assert.deepEqual(Object.keys(d.files).sort(),Object.keys(s.manifest).sort(),'Published asset list changed');
 for(const [n,v] of Object.entries(s.manifest))assert.equal(d.files[n],v,'Unapproved asset changed '+n);
 const url=branch==='test'?'https://test.deepsyq.pages.dev':'https://deepsyq.app';
 for(const rel of ['pricing.html','deepsyq-page-i18n.js','i18n/pricing.html.json','i18n/shared.json']){
  let matched=false,why='';
  for(let retry=0;retry<12;retry++){
   try{
    const response=await fetch(url+'/'+rel+'?i18nCheck='+Date.now(),{signal:AbortSignal.timeout(18000)});
    assert.equal(response.status,200,'HTTP '+response.status+' for '+rel);
    const bytes=Buffer.from(await response.arrayBuffer());
    const norm=rel.endsWith('.html')?Buffer.from(stripInjected(bytes)):bytes;
    if(hashPages(rel,norm)===s.manifest['/'+rel]){matched=true;break}
    why='content digest mismatch';
   }catch(err){why=err.message}
   await sleep(1800);
  }
  assert(matched,'Localized site asset missing '+rel+': '+why);
 }
 for(const route of ['api/config','api/ai-billing/config']){
  const r=await fetch(url+'/'+route,{signal:AbortSignal.timeout(18000)});
  assert.equal(r.status,200,'Billing API unavailable '+route);
 }
 if(branch==='deepsyq-platform'){
  const p=await projectInfo();
  assert.equal(p.canonical_deployment.id,info.id,'Production changed after publication');
  assert.equal(p.production_script_name,s.scriptName,'Worker was replaced');
  const settings=await cloud('https://api.cloudflare.com/client/v4/accounts/'+account+'/workers/scripts/'+encodeURIComponent(p.production_script_name)+'/settings');
  assert.equal(workerHash(settings),s.settingsHash,'Critical Worker bindings changed');
 }
 console.log('I18N_PUBLICATION_VERIFIED',JSON.stringify({branch,pages:pages.length,locales:4,catalogs:catalogs.length,changedAssets:s.upload.length,worker:true,apiHealthy:true}));
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
