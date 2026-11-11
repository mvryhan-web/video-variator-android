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
const root='app/src/main/assets',tmp='/tmp/owner-sitewide-locale-20261111',src=tmp+'/source',datafile=tmp+'/state.json';
const pages=fs.readdirSync(root).filter(x=>x.endsWith('.html')).sort();
const catalogs=['sitewide-i18n.js','i18n/catalog-ru.json','i18n/catalog-fr.json','i18n/catalog-es.json'];
const cors=[...pages,...catalogs],all=cors,sha=x=>createHash('sha256').update(x).digest('hex');
assert.equal(pages.length,34,'Expected all 34 HTML route files');
const sh=(exe,args,opts={})=>execFileSync(exe,args,{encoding:'utf8',maxBuffer:100000000,...opts}).trim();
const read=p=>fs.readFileSync(p),state=()=>JSON.parse(fs.readFileSync(datafile,'utf8'));
const sleep=ms=>new Promise(res=>setTimeout(res,ms));
const mime=n=>n.endsWith('.html')?'text/html':n.endsWith('.js')?'application/javascript':n.endsWith('.json')?'application/json':'application/octet-stream';
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
const translateLoader='<script defer src="sitewide-i18n.js?v=20261111"></script>';
function patchPage(latest,source,filename){
 assert(source.includes(translateLoader),'Page localization not approved in source: '+filename);
 assert(latest.includes('</head>'),'Latest LIVE page lacks HTML head: '+filename);
 assert(latest.split('</head>').length===2,'Duplicate closing head in LIVE page: '+filename);
 if(latest.includes(translateLoader))return latest;
 assert(!/sitewide-i18n\.js(?:\?v=[^"']*)?/.test(latest),'Other localization loader installed: '+filename);
 const result=latest.replace('</head>',translateLoader+'\n</head>');
 assert.equal(result.replace(translateLoader+'\n',''),latest,'Page content changed beyond new translation loader: '+filename);
 return result;
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
 assert(d.uses_functions===true,'Production Worker missing');
 assert(d.files&&Object.keys(d.files).length>=1000,'Live asset manifest unavailable');
 const prev=d.deployment_trigger?.metadata?.commit_hash;
 assert(/^[0-9a-f]{40}$/.test(prev||''),'Current production commit unknown');
 sh('git',['cat-file','-e',prev+'^{commit}']);
 const workTree=tmp+'/prod-source';
 sh('git',['worktree','add','--detach',workTree,prev]);
 const worker=read(workTree+'/'+root+'/_worker.js');
 assert(worker.length>10000,'Production Worker source unexpectedly small');
 const bindings=p.deployment_configs?.production||{};
 for(const key of ['DATABASE_URL','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','GOOGLE_CLIENT_ID'])assert(key in (bindings.env_vars||{}),'Missing critical production binding '+key);
 assert('R2_BUCKET' in (bindings.r2_buckets||{}),'Missing production media bucket');
 const workerSettings=await cloud('https://api.cloudflare.com/client/v4/accounts/'+account+'/workers/scripts/'+encodeURIComponent(p.production_script_name)+'/settings');
 const manifest={...d.files},upload=[];
 fs.mkdirSync(src,{recursive:true});
 for(const lang of ['ru','fr','es']){
  const pack=JSON.parse(fs.readFileSync(root+'/i18n/catalog-'+lang+'.json','utf8'));
  assert(pack.language===lang&&pack.entryCount>=500&&Object.keys(pack.entries).length===pack.entryCount,'Locale catalog incomplete '+lang);
 }
 for(const rel of pages){
  const name='/'+rel,expected=manifest[name];
  assert(expected,'Currently deployed page missing (do not publish new pages): '+rel);
  const latestSource=fs.readFileSync(workTree+'/'+root+'/'+rel);
  let latest=latestSource.toString('utf8');
  if(hashPages(rel,latestSource)!==expected){
   const urls=[
    'https://deepsyq.app/'+rel+'?ownerLocaleBaseline='+Date.now(),
    'https://'+d.id.slice(0,8)+'.deepsyq.pages.dev/'+rel+'?ownerLocaleBaseline='+Date.now()
   ];
   let recovered=false;
   for(const url of urls){
    try{
     const resp=await fetch(url,{cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(12000)});
     if(resp.status!==200&&!(rel==='404.html'&&resp.status===404))continue;
     const raw=stripInjected(Buffer.from(await resp.arrayBuffer()));
     if(hashPages(rel,Buffer.from(raw))===expected){latest=raw;recovered=true;break;}
    }catch{}
   }
   assert(recovered,'Cannot reconstruct exact current LIVE HTML: '+rel);
  }
  const approved=fs.readFileSync(root+'/'+rel,'utf8');
  const result=patchPage(latest,approved,rel);
  const output=src+'/'+rel;fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,result);
 }
 for(const rel of catalogs){
  const content=read(root+'/'+rel);
  const output=src+'/'+rel;fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,content);
 }
 for(const rel of cors){
  const content=read(src+'/'+rel),name='/'+rel,digest=hashPages(rel,content),old=manifest[name];
  if(digest!==old){
   manifest[name]=digest;
   upload.push({name,hash:digest,mime:mime(rel),data:content.toString('base64')});
  }
 }
 audit(manifest,d.files);
 assert(upload.length>=4&&upload.length<=38,'Unexpected translation asset count '+upload.length);
 const state={baselineId:id,previous:prev,target:sh('git',['rev-parse','HEAD']),scriptName:p.production_script_name,workerSourceSha:sha(worker),settingsHash:workerHash(workerSettings),files:d.files,manifest,upload,workerPath:workTree+'/'+root+'/_worker.js',headersPath:workTree+'/'+root+'/_headers',redirectsPath:workTree+'/'+root+'/_redirects',workerSize:worker.length};
 fs.writeFileSync(datafile,JSON.stringify(state));
 console.log('DEEPSYQ_LANG_PREPARED',JSON.stringify({baselineId:id,htmlRoutes:pages.length,localeCatalogs:3,changedAssets:upload.length,manifestAssets:Object.keys(manifest).length,workerPreserved:true}));
}
async function upload(){
 const s=state(),data=s.upload;
 assert(data.length>=1&&data.length<=38,'Wrong translation upload scope');
 const p=await cloud(project+'/upload-token');
 const jwt=p?.jwt||p?.token;
 assert(typeof jwt==='string'&&jwt.length>30,'Cloudflare Pages upload JWT unavailable');
 const url='https://api.cloudflare.com/client/v4/pages/assets/upload';
 for(let i=0;i<data.length;i+=4){
  const batch=data.slice(i,i+4).map(x=>({base64:true,key:x.hash,value:x.data,metadata:{contentType:x.mime}}));
  await cloud(url,{method:'POST',body:JSON.stringify(batch),uploadToken:jwt});
 }
 await cloud('https://api.cloudflare.com/client/v4/pages/assets/upsert-hashes',{method:'POST',body:JSON.stringify({hashes:data.map(x=>x.hash)}),uploadToken:jwt});
 console.log('DEEPSYQ_LANG_ASSETS_UPLOADED',JSON.stringify({count:data.length}));
}
function bundleWorker(){
 const s=state(),bundled=tmp+'/worker.js';
 // Bundle EXACT source from the CURRENT LIVE commit, never stale Canvas branch.
 sh('npx',['--yes','esbuild@0.25.12',s.workerPath,'--bundle','--format=esm','--platform=browser','--target=es2022','--outfile='+bundled]);
 const v=read(bundled);assert(v.length>10000&&v.length<25*1024*1024,'Worker bundle invalid');
 fs.writeFileSync(tmp+'/bundled-worker.sha256',sha(v));
 console.log('DEEPSYQ_LANG_WORKER_BUNDLED',JSON.stringify({sourceBytes:s.workerSize,bundleBytes:v.length,sourceUnchanged:true}));
}
function multipart(branch){
 const s=state(),work=read(tmp+'/worker.js');
 const form=new FormData();
 form.append('manifest',JSON.stringify(s.manifest));
 form.append('branch',branch);
 form.append('commit_hash',s.target);
 form.append('commit_dirty','true');
 form.append('commit_message','OWNER: 33-page multilingual text only; preserve all existing assets, prices, and Worker');
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
 console.log('DEEPSYQ_LANG_CREATED',JSON.stringify({branch,id:created.id,url:created.url,initialUsesFunctions:created.uses_functions,stage:created.latest_stage?.status}));
 let d=created;
 for(let i=0;i<14;i++){
  d=await deployment(created.id);
  if(d.latest_stage?.status==='failure'||d.latest_stage?.status==='canceled')break;
  if(d.uses_functions===true&&d.latest_stage?.status==='success')break;
  await sleep(2000);
 }
 assert(d.uses_functions===true,'Deployment dropped Worker/Functions: '+JSON.stringify({id:d.id,usesFunctions:d.uses_functions,stage:d.latest_stage?.status,errors:d.latest_stage?.name}));
 fs.writeFileSync(tmp+'/'+branch+'.json',JSON.stringify({id:d.id,url:d.url,branch}));
 console.log('DEEPSYQ_LANG_DEPLOYED',JSON.stringify({branch,id:d.id,url:d.url,worker:true}));
}
async function check(branch){
 const s=state(),info=JSON.parse(fs.readFileSync(tmp+'/'+branch+'.json','utf8')),d=await deployment(info.id);
 assert(d.uses_functions===true,'Worker missing after publication');
 assert.deepEqual(Object.keys(d.files).sort(),Object.keys(s.manifest).sort(),'Unexpected file additions or removals');
 for(const [name,digest] of Object.entries(s.manifest))assert.equal(d.files[name],digest,'Asset changed outside locale scope: '+name);
 const base=branch==='test'?'https://test.deepsyq.pages.dev':'https://deepsyq.app';
 for(const pageName of ['pricing.html','deepsyq.html','canvas.html','free-tools.html','terms.html','jarvix-chat.html']){
  let confirmed=false;
  for(let retry=0;retry<10;retry++){
   const response=await fetch(base+'/'+pageName+'?localeRelease='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(15000)});
   if(response.ok){
    const html=await response.text();
    if(html.includes(translateLoader)){confirmed=true;break;}
   }
   await sleep(1800);
  }
  assert(confirmed,'Translation loader missing in published HTML '+pageName);
 }
 for(const lang of ['ru','fr','es']){
  const response=await fetch(base+'/i18n/catalog-'+lang+'.json?localeRelease='+Date.now(),{signal:AbortSignal.timeout(15000)});
  assert.equal(response.status,200,'Missing '+lang+' language dictionary');
  const pack=await response.json();
  assert(pack.language===lang&&pack.entryCount>=500,'Invalid deployed '+lang+' dictionary');
 }
 for(const route of ['/api/config','/api/ai-billing/config']){
  const resp=await fetch(base+route,{signal:AbortSignal.timeout(20000)});
  assert.equal(resp.status,200,'Critical API unavailable '+route);
 }
 if(branch==='deepsyq-platform'){
  const p=await projectInfo();
  assert.equal(p.canonical_deployment.id,info.id,'Another agent changed production');
  assert.equal(p.production_script_name,s.scriptName,'Worker identity changed');
  const workerSettings=await cloud('https://api.cloudflare.com/client/v4/accounts/'+account+'/workers/scripts/'+encodeURIComponent(p.production_script_name)+'/settings');
  assert.equal(workerHash(workerSettings),s.settingsHash,'Worker bindings changed');
 }
 console.log('DEEPSYQ_LANG_VERIFIED',JSON.stringify({branch,worker:true,htmlRoutes:pages.length,locales:['en','ru','fr','es'],assets:Object.keys(s.manifest).length,alteredAssets:s.upload.length,apiHealthy:true}));
}
async function rollback(){
 const s=state(),p=await projectInfo();
 const intended=fs.existsSync(tmp+'/deepsyq-platform.json')?JSON.parse(fs.readFileSync(tmp+'/deepsyq-platform.json','utf8')):null;
 if(p.canonical_deployment?.id===s.baselineId){console.log('MAIN_UNCHANGED');return}
 assert(intended&&p.canonical_deployment.id===intended.id,'Another owner published; do not rollback');
 await cloud(project+'/deployments/'+s.baselineId+'/rollback',{method:'POST'});
 console.log('DEEPSYQ_LANG_ROLLBACK',JSON.stringify({restored:s.baselineId}));
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
}catch(e){console.error('DEEPSYQ_LANG_BLOCKED:',e.stack||e.message);process.exitCode=2}
