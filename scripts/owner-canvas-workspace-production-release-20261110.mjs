/** Scoped release of owner-approved Canvas workspace + precisely 13 demo images.
 * Cloudflare Pages deploys all assets as a unit. Reconstruct from current LIVE,
 * then add only the 29 approved Canvas paths. Fail closed if we cannot preserve
 * the existing Worker, source revision, production bindings or unrelated pages.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const mode=process.argv[2];
const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
const sourceRoot='app/src/main/assets',suffix='media/canvas-demos/20261110/';
const paths=['canvas.html','canvas-workspace.js','canvas-workspace.css',
 ...Array.from({length:13},(_,i)=>`${suffix}canvas-demo-${String(i+1).padStart(2,'0')}.webp`),
 ...Array.from({length:13},(_,i)=>`${suffix}canvas-demo-${String(i+1).padStart(2,'0')}-thumb.webp`)];
const stageRoot='/tmp/deepsyq-canvas-workspace',stage=stageRoot+'/'+sourceRoot;
const metadata='/tmp/deepsyq-canvas-workspace-meta.json';
const checks='/tmp/deepsyq-canvas-protected-checks.json';
const manifestFile='/tmp/deepsyq-canvas-live-assets-manifest.json';
const prod='https://deepsyq.app',test='https://test.deepsyq.pages.dev';
const projectUrl='https://api.cloudflare.com/client/v4/accounts/'+account+'/pages/projects/deepsyq';
const protectedPages=['index.html','free-tools.html','jarvix-chat.html','pricing.html','video-uniquifier.html','generate-studio.html','my-creations.html','ai-apps.html'];
const sh=(cmd,args)=>execFileSync(cmd,args,{encoding:'utf8',maxBuffer:30000000}).trim();
const hash=b=>createHash('sha256').update(b).digest('hex');
// Cloudflare changes its own CF_PAGES_* deployment metadata on every release.
// Preserve and compare all other Worker settings and bindings exactly.
function stableSettings(settings){
 const deploymentMetadata=new Set(['CF_PAGES','CF_PAGES_BRANCH','CF_PAGES_COMMIT_SHA','CF_PAGES_URL']);
 const list=(settings.bindings||[]).map(binding=>deploymentMetadata.has(binding.name)
   ? {name:binding.name,type:binding.type} : binding).sort((a,b)=>a.name.localeCompare(b.name));
 return {...settings,bindings:list};
}
const settingsDigest=settings=>hash(Buffer.from(JSON.stringify(stableSettings(settings))));

const textOf=p=>fs.readFileSync(p,'utf8');
const load=()=>JSON.parse(textOf(metadata));
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const requireCommit=sha=>{assert(/^[a-f0-9]{40}$/.test(sha||''),'LIVE source commit missing or invalid');sh('git',['cat-file','-e',sha+'^{commit}']);};
async function api(route,method='GET'){
 assert(token&&/^[a-f0-9]{32}$/.test(account||''),'Existing GitHub Actions Cloudflare credentials not configured');
 const r=await fetch(route,{method,headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(26000)});
 let payload={};try{payload=await r.json()}catch{}
 assert([200,201,202].includes(r.status),`Cloudflare request rejected HTTP ${r.status} (${method})`);
 assert(payload.success!==false,'Cloudflare API rejected operation');return payload.result;
}
async function getProject(){const p=await api(projectUrl);assert.equal(p.name,'deepsyq');assert.equal(p.production_branch,'deepsyq-platform');return p;}
async function getLive(name,base=prod){
 const u=base+'/'+name+'?ownerCanvasWorkspace='+Date.now();
 const r=await fetch(u,{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(30000)});
 return {status:r.status,type:r.headers.get('content-type')||'',bytes:Buffer.from(await r.arrayBuffer())};
}
async function getLiveDeployment(p){
 const id=p.canonical_deployment?.id;
 assert(id&&p.canonical_deployment.uses_functions===true,'Live Pages deployment or Worker missing');
 const result=await api(projectUrl+'/deployments/'+id);
 assert(result.id===id&&result.uses_functions===true,'Canonical deployment inconsistent / Worker absent');
 return {id,result};
}
function stripPagesInjectedSnippet(input){
 const s=input.toString('utf8'),start=s.indexOf('<script>(function(){if(location.pathname!==');
 if(start<0)return input;const end=s.indexOf('</script>',start);if(end<start)return input;
 const snippet=s.slice(start,end+9);
 if(!snippet.includes('history.replaceState(null,')||!snippet.includes('location.search+location.hash'))return input;
 return Buffer.from(s.slice(0,start)+s.slice(end+9));
}
function mainContent(document){
 const start=document.indexOf('<main id="canvasPageMain">'),end=document.indexOf('</main>',start);
 assert(start>=0&&end>start,'Canvas main boundary missing');
 assert(document.indexOf('<main id="canvasPageMain">',start+1)===-1,'Multiple Canvas mains');
 return {start,end,content:document.slice(start,end+7)};
}
function patchLatestCanvas(live,source){
 let html=live;
 const wanted=mainContent(source),current=mainContent(live);
 // The owner's existing shared header, sidebar and other runtime elements are
 // preserved from the latest LIVE page. Only Canvas's main content is replaced.
 assert(wanted.content.includes('id="canvasWorkspace"'),'New Canvas workspace missing');
 assert(wanted.content.includes('id="cwGallery"')&&wanted.content.includes('id="cwStage"'),'Canvas editor controls missing');
 html=html.slice(0,current.start)+wanted.content+html.slice(current.end+7);
 const oldScript='<script type="module" src="canvas-workspace.js?v=20261110"></script>';
 const newScript='<script type="module" src="canvas-workspace.js?v=20261110-ux2"></script>';
 assert(html.includes(oldScript)||html.includes(newScript),'Current Canvas JS import absent');
 html=html.replace(oldScript,newScript);
 const oldCss='<link rel="stylesheet" href="canvas-workspace.css?v=20261110">';
 const newCss='<link rel="stylesheet" href="canvas-workspace.css?v=20261110-ux2">';
 assert(html.includes(oldCss)||html.includes(newCss),'Current Canvas CSS import absent');
 html=html.replace(oldCss,newCss);
 assert(html.includes('deepsyq-site-shell.js')&&html.includes('jarvis-core.js'),'Global navigation/JARVIX lost');
 assert(html.includes('deepsyq-mobile-shell.js'),'Mobile shell lost');
 assert((html.match(/id="cwGallery"/g)||[]).length===1,'Duplicate Canvas gallery detected');
 return html;
}
function plannedChanges(){
 const changed=sh('git',['diff','--name-only','65a99d807e796b2c17751a9dbe730055b9752662','HEAD','--',sourceRoot]).split('\n').filter(Boolean);
 const allowed=new Set(paths.map(x=>sourceRoot+'/'+x));
 assert(changed.length===allowed.size,`Expected ${allowed.size} Canvas resources, got ${changed.length}`);
 assert(changed.every(x=>allowed.has(x)),'This release includes an unrelated site change');
 for(const name of paths)assert(changed.includes(sourceRoot+'/'+name),'Missing approved file '+name);
 // Bind exactly the user's new 13 images and 13 mobile/desktop thumbnails.
 assert(paths.filter(p=>p.endsWith('.webp')).length===26,'Media asset count not 26');
}
async function prepare(){
 plannedChanges();const p=await getProject(),live=await getLiveDeployment(p);
 const previous=live.result.deployment_trigger?.metadata?.commit_hash || p.canonical_deployment?.deployment_trigger?.metadata?.commit_hash;
 requireCommit(previous);
 const liveWorker=sh('git',['rev-parse',previous+':'+sourceRoot+'/_worker.js']);
 // Other owner may have published a newer production Worker after this isolated Canvas branch.
 // NEVER copy this branch's Worker. stageResources reconstructs the entire deployment
 // from the current LIVE commit, checks its exact Worker blob and overlays only Canvas.
 const candidateWorker=sh('git',['rev-parse','HEAD:'+sourceRoot+'/_worker.js']);
 if(candidateWorker!==liveWorker){
   console.log('CANVAS_PRESERVING_NEWER_PRODUCTION_WORKER',JSON.stringify({previous,liveWorker,staleBranchWorker:candidateWorker}));
 }
 const binds=p.deployment_configs?.production||{};
 for(const key of ['DATABASE_URL','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','GOOGLE_CLIENT_ID'])
   assert(Object.hasOwn(binds.env_vars||{},key),'Missing production binding '+key);
 assert(Object.hasOwn(binds.r2_buckets||{},'R2_BUCKET'),'R2 Bucket binding absent');
 const workerSettings=await api('https://api.cloudflare.com/client/v4/accounts/'+account+'/workers/scripts/'+encodeURIComponent(p.production_script_name)+'/settings');
 assert(workerSettings&&typeof workerSettings==='object','Worker settings not readable');
 const cfg=await getLive('api/config');assert.equal(cfg.status,200,'Production API unhealthy');
 const liveManifest=live.result.files;
 assert(liveManifest&&typeof liveManifest==='object'&&Object.keys(liveManifest).length>=1000,'Full live Pages asset manifest missing; cannot publish');
 assert(Object.hasOwn(liveManifest,'/canvas.html'),'Live Canvas HTML missing');
 const liveUrl=live.result.url||p.canonical_deployment.url;
 assert(/^https:\/\/[a-z0-9-]+\.deepsyq\.pages\.dev$/.test(liveUrl),'Immutable LIVE deployment URL missing');
 fs.writeFileSync(manifestFile,JSON.stringify(liveManifest));
 const state={liveId:live.id,previous,liveUrl,manifestSize:Object.keys(liveManifest).length,workerSha:liveWorker,workerName:p.production_script_name,
  target:sh('git',['rev-parse','HEAD']),settingsHash:settingsDigest(workerSettings),
  startedAt:new Date().toISOString()};
 fs.writeFileSync(metadata,JSON.stringify(state));
 console.log('OWNER_CANVAS_SAFE_LIVE_BASELINE',JSON.stringify({liveId:live.id,previous,target:state.target,workerUnchanged:true,manifestAssets:state.manifestSize}));
}
async function stageResources(){
 const data=load();assert(!fs.existsSync(stageRoot),'Staging directory must start clean');
 const previousRoot='/tmp/deepsyq-canvas-prod-baseline';
 sh('git',['worktree','add','--detach',previousRoot,data.previous]);
 fs.mkdirSync(stageRoot,{recursive:true});
 fs.cpSync(previousRoot+'/'+sourceRoot,stage,{recursive:true});
 const manifest=JSON.parse(textOf(manifestFile));
 assert(Object.keys(manifest).length===data.manifestSize,'LIVE manifest size changed during staging');
 const allowed=new Set(['canvas.html','canvas-workspace.js','canvas-workspace.css']);
 const manifestPaths=new Set(Object.keys(manifest).map(k=>{
  assert(k.startsWith('/')&&!k.split('/').includes('..'),'Unsafe manifest path');
  return k.slice(1);
 }));
 // Remove Git-only stale assets that are NOT in current live deployment.
 // Preserve the actual Worker and Cloudflare configuration files from LIVE source.
 const special=new Set(['_worker.js','_headers','_redirects','_routes.json','functions-filepath-routing-config.json']);
 let removed=0;
 function trim(dir){
  for(const item of fs.readdirSync(dir,{withFileTypes:true})){
   const full=path.join(dir,item.name);
   if(item.isDirectory()){trim(full);if(fs.readdirSync(full).length===0)fs.rmdirSync(full);continue;}
   if(!item.isFile())throw Error('Unsupported staging entry '+full);
   const rel=path.relative(stage,full).split(path.sep).join('/');
   if(!manifestPaths.has(rel)&&!special.has(rel)){fs.rmSync(full);removed++;}
  }
 }
 trim(stage);
 // The Cloudflare deployment manifest is the complete authoritative static
 // baseline, INCLUDING files uploaded by another agent and absent from Git.
 // Verify every file using Wrangler's BLAKE3(base64(data)+ext) content hash.
 const python='scripts/owner-canvas-manifest-audit-20261110.py';
 const audit=mode=>JSON.parse(sh('python3',[python,mode,manifestFile,stage]));
 const initial=audit('scan');
 assert.equal(initial.count,data.manifestSize);
 const missing=initial.mismatches;console.log('OWNER_CANVAS_LIVE_MANIFEST_SCAN',JSON.stringify({total:initial.count,needRestore:missing.length,first:missing.slice(0,12)}));let cursor=0,downloaded=0;
 async function restore(){
  while(cursor<missing.length){
   const rel=missing[cursor++];
   assert(manifestPaths.has(rel),'Attempted to fetch file outside live manifest');
   const response=await getLive(rel,data.liveUrl);
   if(response.status!==200){
    const existed=fs.existsSync(path.join(stage,rel));
    console.log('OWNER_CANVAS_CANONICAL_UNAVAILABLE',JSON.stringify({rel,status:response.status,gitFilePresent:existed,manifestDigest:manifest['/'+rel],deployment:data.liveId}));
    throw Error('Exact canonical live file cannot be retrieved: '+rel+' HTTP '+response.status);
   }
   assert(response.bytes.length>0&&response.bytes.length<90*1024*1024,'Invalid live file length '+rel);
   const dest=path.join(stage,rel);
   fs.mkdirSync(path.dirname(dest),{recursive:true});
   fs.writeFileSync(dest,rel.endsWith('.html')?stripPagesInjectedSnippet(response.bytes):response.bytes);
   downloaded++;
  }
 }
 await Promise.all(Array.from({length:12},()=>restore()));
 audit('verify'); // Any byte difference or missing file stops release BEFORE staging.
 // Preserve existing approved photos exactly; restore only approved Canvas
 // media paths missing from the current deployment's static asset manifest.
 for(const rel of paths.filter(p=>p.endsWith('.webp'))){
  const source=path.join(sourceRoot,rel),dest=path.join(stage,rel);
  if(manifestPaths.has(rel)){
    assert.equal(hash(fs.readFileSync(dest)),hash(fs.readFileSync(source)),'Approved photo altered on live '+rel);
  }else{
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    fs.copyFileSync(source,dest);
  }
 }
 // The only changes are the requested updated Canvas main and its own JS/CSS.
 const latestCanvas=textOf(path.join(stage,'canvas.html'));
 const patched=patchLatestCanvas(latestCanvas,textOf(path.join(sourceRoot,'canvas.html')));
 fs.writeFileSync(path.join(stage,'canvas.html'),patched);
 for(const rel of ['canvas-workspace.js','canvas-workspace.css'])fs.copyFileSync(path.join(sourceRoot,rel),path.join(stage,rel));
 const diff=audit('diff');
 assert.deepEqual(diff.onlyChanged,['canvas.html','canvas-workspace.js','canvas-workspace.css'].filter(p=>manifestPaths.has(p)).sort(),'Unrelated live resource changed');
 const stageWorker=sh('git',['hash-object',path.join(stage,'_worker.js')]);
 assert.equal(stageWorker,data.workerSha,'Staged LIVE Worker differs from production Git source');
 sh('node',['--check',path.join(stage,'canvas-workspace.js')]);
 const protectedHashes={};
 for(const rel of protectedPages){
  assert(manifestPaths.has(rel),'Protected page missing from live manifest '+rel);
  const live=await getLive(rel,prod);
  assert.equal(live.status,200,'Current protected page not accessible '+rel);
  protectedHashes[rel]=hash(live.bytes);
 }
 fs.writeFileSync(checks,JSON.stringify(protectedHashes));
 console.log('OWNER_CANVAS_EXACT_ALLOWED_CHANGE',JSON.stringify({changedExisting:diff.onlyChanged,newCanvasFiles:diff.onlyAdded.length,originalAssets:data.manifestSize,recoveredFromImmutableLive:downloaded,gitOnlyRemoved:removed,protectedChecked:Object.keys(protectedHashes).length,workerPreserved:true}));
}
async function guard(){const data=load(),p=await getProject();assert.equal(p.canonical_deployment?.id,data.liveId,'Concurrent MAIN update detected: do not deploy');assert.equal(p.production_script_name,data.workerName,'Production Worker changed while preparing');console.log('OWNER_CANVAS_CONCURRENCY_GUARD_PASS');}
async function verify(kind){
 const base=kind==='test'?test:prod,data=load();
 let healthy=false;
 for(let i=0;i<12;i++){try{const r=await getLive('api/config',base);if(r.status===200){const json=JSON.parse(r.bytes.toString('utf8'));if(json.plans){healthy=true;break}}}catch{}await pause(3000)}
 assert(healthy,'Worker /api/config not healthy at '+kind);
 const live=await getLive('canvas.html',base);assert.equal(live.status,200,kind+' Canvas unavailable');
 const built=stripPagesInjectedSnippet(live.bytes).toString('utf8');
 const desired=textOf(path.join(stage,'canvas.html'));
 assert.equal(built,desired,kind+' Canvas HTML not equal to intended MAIN-derived patch');
 assert(built.includes('id="cwGallery"')&&built.includes('id="cwStage"'),kind+' working gallery missing');
 for(const rel of ['canvas-workspace.js','canvas-workspace.css']){
   const r=await getLive(rel,base);assert.equal(r.status,200,kind+' new editor code unavailable '+rel);
   assert.equal(hash(r.bytes),hash(fs.readFileSync(path.join(stage,rel))),kind+' new editor bytes differ '+rel);
 }
 for(let i=1;i<=13;i++){
   const id=String(i).padStart(2,'0');
   const rel='media/canvas-demos/20261110/canvas-demo-'+id+'.webp';
   const r=await getLive(rel,base);assert.equal(r.status,200,kind+' photo '+i+' unavailable');
   assert.equal(hash(r.bytes),hash(fs.readFileSync(path.join(stage,rel))),kind+' photo '+i+' changed');
 }
 const preserved=JSON.parse(textOf(checks));for(const [rel,sha] of Object.entries(preserved)){
   const r=await getLive(rel,base);assert.equal(r.status,200,kind+' protected page unavailable '+rel);
   assert.equal(hash(r.bytes),sha,kind+' unrelated page changed '+rel);
 }
 if(kind==='main'){
  const p=await getProject();assert.notEqual(p.canonical_deployment?.id,data.liveId,'Production release has not landed');
  assert.equal(p.canonical_deployment?.uses_functions,true,'Production Worker was dropped');
  assert.equal(p.production_script_name,data.workerName,'Worker identity changed');
  // Assert the new production asset manifest is IDENTICAL to the exact live baseline
  // except the three owner-approved Canvas static resources. Not just a few pages.
  const oldFiles=JSON.parse(textOf(manifestFile));
  const deployed=await api(projectUrl+'/deployments/'+p.canonical_deployment.id);
  assert(deployed.files&&deployed.uses_functions===true,'New production manifest or Worker missing');
  const approved=new Set(paths.map(x=>'/'+x));
  const core=new Set(['/canvas.html','/canvas-workspace.js','/canvas-workspace.css']);
  const expected=new Set([...Object.keys(oldFiles),...approved]);
  assert.deepEqual(Object.keys(deployed.files).sort(),[...expected].sort(),'Production file list changed outside approved Canvas scope');
  let changed=0,restored=0;
  for(const [filename,digest] of Object.entries(oldFiles)){
    if(core.has(filename)){
      assert.notEqual(deployed.files[filename],digest,'Canvas update not included '+filename);changed++;
    }else{
      assert.equal(deployed.files[filename],digest,'Unapproved production asset changed '+filename);
    }
  }
  for(const filename of approved){
    if(!Object.hasOwn(oldFiles,filename)){
      assert.match(deployed.files[filename]||'',/^[a-f0-9]{32}$/,'Missing restored Canvas asset '+filename);
      restored++;
    }
  }
  assert.equal(changed+restored,3+paths.length-3-[...approved].filter(x=>Object.hasOwn(oldFiles,x)&&!core.has(x)).length,'Canvas manifest diff incomplete');
  const settings=await api('https://api.cloudflare.com/client/v4/accounts/'+account+'/workers/scripts/'+encodeURIComponent(p.production_script_name)+'/settings');
  assert.equal(settingsDigest(settings),data.settingsHash,'Critical Worker bindings/settings changed (excluding CF_PAGES deployment metadata)');
  const billing=await getLive('api/ai-billing/config');assert.equal(billing.status,200,'Billing configuration API unavailable');
  fs.writeFileSync('/tmp/deepsyq-canvas-workspace-verified','yes');
 }
 console.log('OWNER_CANVAS_'+kind.toUpperCase()+'_VERIFIED',JSON.stringify({published:kind==='main',photos:13,thumbs:13,protectedPages:Object.keys(preserved).length,workerPreserved:true}));
}
async function rollback(){const data=load(),p=await getProject();if(p.canonical_deployment?.id===data.liveId){console.log('MAIN_NOT_MODIFIED');return}
 const sha=p.canonical_deployment?.deployment_trigger?.metadata?.commit_hash;
 assert.equal(sha,data.target,'Another owner published; never roll back their revision');
 await api(projectUrl+'/deployments/'+data.liveId+'/rollback','POST');
 console.log('CANVAS_WORKSPACE_RELEASE_ROLLED_BACK',data.liveId);
}
try{
 if(mode==='prepare')await prepare();
 else if(mode==='stage')await stageResources();
 else if(mode==='guard')await guard();
 else if(mode==='test'||mode==='main')await verify(mode);
 else if(mode==='rollback')await rollback();
 else throw Error('Specify prepare/stage/guard/test/main/rollback');
}catch(e){console.error('BLOCKED_MAIN:',e.stack||e.message);process.exitCode=2}
