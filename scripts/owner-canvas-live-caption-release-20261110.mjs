// Only owner-approved UI changes on MAIN. No paid calls or unreviewed source overwrite.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const mode=process.argv[2];
const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
const proj='https://api.cloudflare.com/client/v4/accounts/'+account+'/pages/projects/deepsyq';
const prod='https://deepsyq.app',preview='https://test.deepsyq.pages.dev';
const stageRoot='/tmp/deepsyq-owner-canvas-live',stage=stageRoot+'/app/src/main/assets';
const statusFile='/tmp/deepsyq-owner-canvas-status.json';
const changes=['canvas.html'];
const baseline='8a758f647847f7a2592648311af5ef7891025311';
const approved='cddb71475095731107ff8b98b87f6ed727439a4a';
const caption='<p>Start with a prompt, bring your own photos and continue in the real Image or Video Studio.</p>';
const important=['index.html','free-tools.html','jarvix-chat.html','pricing.html',
 'video-uniquifier.html','generate-studio.html','my-creations.html','ai-apps.html'];
const dig=b=>createHash('sha256').update(b).digest('hex');
const sh=(command,args,opts={})=>execFileSync(command,args,{encoding:'utf8',maxBuffer:10000000,...opts}).trim();
const readStatus=()=>JSON.parse(fs.readFileSync(statusFile,'utf8'));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function cf(url,method='GET'){
 assert(token&&/^[a-f0-9]{32}$/.test(account||''),'Existing Cloudflare API credentials unavailable');
 const r=await fetch(url,{method,headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(22000)});
 let payload={};try{payload=await r.json()}catch{}
 return {status:r.status,result:payload.result,errors:payload.errors||[]};
}
async function project(){
 const r=await cf(proj);
 assert.equal(r.status,200,'Cloudflare project unavailable');
 assert.equal(r.result?.name,'deepsyq');
 assert.equal(r.result.production_branch,'deepsyq-platform');
 return r.result;
}
async function getAsset(name,base=prod){
 const response=await fetch(base+'/'+name+'?ownerScopedAudit='+Date.now(),{
   headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(22000)
 });
 return {status:response.status,bytes:Buffer.from(await response.arrayBuffer()),
   type:response.headers.get('content-type')||''};
}
function expectOwnerSource(){
 for(const commit of [baseline,approved])sh('git',['cat-file','-e',commit+'^{commit}']);
 sh('git',['merge-base','--is-ancestor',approved,'HEAD']);
 const modified=sh('git',['diff','--name-only',baseline,approved,'--','app/src/main/assets'])
  .split('\n').filter(Boolean).sort();
 const expected=changes.map(n=>'app/src/main/assets/'+n).sort();
 assert.deepEqual(modified,expected,'Approved patch changes files outside exact owner scope');
 console.log('CANVAS_SOURCE_EXACT_ONE_FILE_SCOPE_PASS',JSON.stringify({count:modified.length,files:modified}));
}
async function prepare(){
 expectOwnerSource();
 const p=await project(),d=p.canonical_deployment;
 assert(d?.id&&d.uses_functions===true,'MAIN must retain its actual Worker');
 const previous=d.deployment_trigger?.metadata?.commit_hash;
 assert(/^[a-f0-9]{40}$/.test(previous||''),'Previous MAIN source unknown');
 sh('git',['cat-file','-e',previous+'^{commit}']);
 const currentWorker=sh('git',['rev-parse',previous+':app/src/main/assets/_worker.js']);
 const selectedWorker=sh('git',['rev-parse','HEAD:app/src/main/assets/_worker.js']);
 assert.equal(currentWorker,selectedWorker,'Worker changed: cannot do UI-only deployment');
 const bindings=p.deployment_configs?.production||{};
 for(const k of ['DATABASE_URL','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','GOOGLE_CLIENT_ID'])
  assert(Object.hasOwn(bindings.env_vars||{},k),'Existing production binding missing '+k);
 assert(Object.hasOwn(bindings.r2_buckets||{},'R2_BUCKET'),'Production R2 binding missing');
 const settings=await cf('https://api.cloudflare.com/client/v4/accounts/'+account+'/workers/scripts/'+encodeURIComponent(p.production_script_name)+'/settings');
 assert.equal(settings.status,200,'Worker settings not readable');
 const liveCfg=await getAsset('api/config');
 assert.equal(liveCfg.status,200,'MAIN API unhealthy before release');
 const data={id:d.id,previous,worker:currentWorker,workerName:p.production_script_name,
  dev:sh('git',['rev-parse','origin/deepsyq-platform']),prepared:new Date().toISOString()};
 fs.writeFileSync(statusFile,JSON.stringify(data));
 console.log('CANVAS_LATEST_LIVE_MAIN_PREFLIGHT_PASS',JSON.stringify({id:d.id,previous,dev:data.dev,workerUnchanged:true,bindings:true}));
}
function strippedHtml(buf){
 const s=buf.toString('utf8');
 const start=s.indexOf('<script>(function(){if(location.pathname!==');
 if(start<0)return buf;
 const end=s.indexOf('</script>',start);
 if(end<start)return buf;
 const script=s.slice(start,end+9);
 if(!script.includes('history.replaceState(null,')||!script.includes('location.search+location.hash'))return buf;
 return Buffer.from(s.slice(0,start)+s.slice(end+9));
}
async function snapshot(){
 const data=readStatus();
 assert(!fs.existsSync(stageRoot),'Stage must start empty');
 sh('git',['worktree','add','--detach','/tmp/deepsyq-prodbase',data.previous]);
 fs.mkdirSync(stageRoot,{recursive:true});
 fs.cpSync('/tmp/deepsyq-prodbase/app/src/main/assets',stage,{recursive:true});
 const paths=sh('git',['ls-tree','-r','--name-only',data.previous,'app/src/main/assets'])
  .split('\n').filter(x=>x.startsWith('app/src/main/assets/'))
  .map(x=>x.slice('app/src/main/assets/'.length))
  .filter(x=>/\.(html|css|mjs|js|json|svg|webmanifest|xml|txt)$/i.test(x));
 const original={},stageBefore={},skipped=[],originalEol={};
 let index=0,normalized=0;
 async function work(){
  while(index<paths.length){
   const name=paths[index++];
   if(name==='_worker.js')continue;
   let r;try{r=await getAsset(name)}catch{throw Error('Cannot snapshot live asset '+name)}
   if(r.status!==200){
    if(important.includes(name)||changes.includes(name))throw Error('Required LIVE file missing '+name+' HTTP '+r.status);
    // A stale Git-only file must not be newly published.
    fs.rmSync(path.join(stage,name),{force:true});
    skipped.push(name);
    continue;
   }
   const ext=path.extname(name).slice(1).toLowerCase();
   const valid=ext==='html'?r.type.includes('html'):
    ['js','mjs'].includes(ext)?(/javascript|text\/plain/.test(r.type)):
    ext==='css'?r.type.includes('css'):
    ['json','webmanifest'].includes(ext)?(/json|text\/plain/.test(r.type)):
    ext==='svg'?r.type.includes('svg'):true;
   if(!valid||r.bytes.length>6*1024*1024)throw Error('Invalid LIVE '+name+' type '+r.type);
   original[name]=dig(r.bytes);
   let saved=ext==='html'?strippedHtml(r.bytes):r.bytes;
   if(changes.includes(name)){
     const text=saved.toString('utf8');
     originalEol[name]=text.includes('\r\n')?'crlf':'lf';
     saved=Buffer.from(text.replace(/\r\n/g,'\n'));
   }
   if(saved.length!==r.bytes.length)normalized++;
   const output=path.join(stage,name);
   fs.mkdirSync(path.dirname(output),{recursive:true});
   fs.writeFileSync(output,saved);
   stageBefore[name]=dig(saved);
  }
 }
 await Promise.all(Array.from({length:12},()=>work()));
 for(const name of important)assert(original[name],'Cannot preserve important existing page '+name);
 for(const name of changes)assert(original[name],'Cannot patch missing live file '+name);
 // Surgical change is applied directly to the latest LIVE Canvas bytes.
 // Never substitute old Git Canvas content or revert unrelated production edits.
 const canvasPath=path.join(stage,'canvas.html');
 const latestCanvas=fs.readFileSync(canvasPath,'utf8');
 assert.equal(latestCanvas.split(caption).length-1,1,
   'LATEST LIVE Canvas does not contain the exact requested caption once; block release');
 const updatedCanvas=latestCanvas.replace(caption,'');
 fs.writeFileSync(canvasPath,updatedCanvas);
 console.log('LATEST_LIVE_CANVAS_EXACT_PARAGRAPH_REMOVED',JSON.stringify({baseline:data.id,oldBytes:Buffer.byteLength(latestCanvas),newBytes:Buffer.byteLength(updatedCanvas)}));
 // Restore the original public line-ending style for each modified asset.
 for(const [name,style] of Object.entries(originalEol)){
   if(style==='crlf'){
     const file=path.join(stage,name);
     const text=fs.readFileSync(file,'utf8');
     fs.writeFileSync(file,text.replace(/\r?\n/g,'\r\n'));
   }
 }
 const changed=[];
 for(const [name,old] of Object.entries(stageBefore)){
   const candidate=path.join(stage,name);
   if(!fs.existsSync(candidate))throw Error('Public file lost '+name);
   if(dig(fs.readFileSync(candidate))!==old)changed.push(name);
 }
 assert.deepEqual(changed.sort(),changes.slice().sort(),'Patch touched non-approved files');
 const workerBlob=sh('git',['hash-object',path.join(stage,'_worker.js')]);
 assert.equal(workerBlob,data.worker,'Staged Worker differs from production');
 for(const f of changes.filter(x=>x.endsWith('.js')))sh('node',['--check',path.join(stage,f)]);
 // The root /index.html is Cloudflare's alias of the explicitly changed
 // deepsyq.html Home page: it must change together with Home, not stay frozen.
 const protectedHashes=Object.fromEntries(important.map(n=>[n,original[n]]));
 fs.writeFileSync('/tmp/deepsyq-canvas-protected.json',JSON.stringify(protectedHashes));
 console.log('OWNER_ONLY_CANVAS_FILE_CHANGED',JSON.stringify({count:changed.length,files:changed,liveTextCopied:Object.keys(original).length,normalizedHtml:normalized,missingStaleFiles:skipped.length}));
}
async function check(mode){
 const base=mode==='preview'?preview:prod, data=readStatus();
 let cfg=null;
 for(let i=0;i<14;i++){
   try{
     const r=await getAsset('api/config',base);
     if(r.status===200){cfg=JSON.parse(r.bytes.toString('utf8'));if(cfg?.plans)break}
   }catch{}
   await sleep(3000);
 }
 assert(cfg?.plans,mode+' Cloudflare API /api/config not healthy');
 const canvas=await getAsset('canvas.html',base);
 assert.equal(canvas.status,200,mode+' Canvas unavailable');
 const current=strippedHtml(canvas.bytes).toString('utf8');
 const intended=fs.readFileSync(path.join(stage,'canvas.html'),'utf8');
 assert(!current.includes(caption),mode+' requested caption still present');
 assert(current.includes('id="canvasFeatureTitle">Canvas</h2>'),mode+' Canvas title missing');
 assert.equal(current,intended,mode+' Canvas content differs from exactly one requested deletion');
 const protectedHashes=JSON.parse(fs.readFileSync('/tmp/deepsyq-canvas-protected.json','utf8'));
 for(const [name,expected] of Object.entries(protectedHashes)){
   const r=await getAsset(name,base);
   assert.equal(r.status,200,mode+' unrelated page unavailable '+name);
   assert.equal(dig(r.bytes),expected,mode+' unrelated page changed '+name);
 }
 if(mode==='main'){
   const p=await project();
   assert(p.canonical_deployment?.id!==data.id,'MAIN deployment did not change');
   assert.equal(p.canonical_deployment?.uses_functions,true,'MAIN Functions missing');
   assert.equal(p.production_script_name,data.workerName,'MAIN Worker identity changed');
   const settings=await cf('https://api.cloudflare.com/client/v4/accounts/'+account+'/workers/scripts/'+encodeURIComponent(p.production_script_name)+'/settings');
   assert.equal(settings.status,200,'Production Worker settings not readable after release');
   const billed=await getAsset('api/ai-billing/config');
   assert.equal(billed.status,200,'Production read-only billing config unavailable');
 }
 if(mode==='main')fs.writeFileSync('/tmp/deepsyq-canvas-main-verified','yes');
 console.log('CANVAS_LIVE_SINGLE_PARAGRAPH_RELEASE_VERIFIED',JSON.stringify({mode,baseline:data.id,canvasCaptionRemoved:true,unrelatedPagesUnchanged:Object.keys(protectedHashes).length,workerFunctionsReady:true}));
}
async function guard(){
 const data=readStatus(),p=await project();
 assert.equal(p.canonical_deployment?.id,data.id,'Another owner published while staging; stop');
 assert.equal(p.canonical_deployment?.uses_functions,true);
 console.log('CANVAS_LIVE_CONCURRENCY_GUARD_PASS',data.id);
}
async function rollback(){
 const data=readStatus(),p=await project();
 if(p.canonical_deployment?.id===data.id){console.log('OWNER_MAIN_UNCHANGED');return}
 if(p.canonical_deployment?.deployment_trigger?.metadata?.commit_hash!==data.dev)
   throw Error('Other owner active; never roll back their production');
 const r=await cf(proj+'/deployments/'+data.id+'/rollback','POST');
 assert([200,201,202].includes(r.status),'Failed safe rollback '+r.status);
 console.log('CANVAS_RELEASE_ROLLED_BACK',data.id);
}
if(mode==='prepare')await prepare();
else if(mode==='snapshot')await snapshot();
else if(mode==='preview'||mode==='main')await check(mode);
else if(mode==='guard')await guard();
else if(mode==='rollback')await rollback();
else throw Error('Unsupported release action '+mode);
