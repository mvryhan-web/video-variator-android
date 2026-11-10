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
 const state={liveId:live.id,previous,workerSha:liveWorker,workerName:p.production_script_name,
  target:sh('git',['rev-parse','HEAD']),settingsHash:settingsDigest(workerSettings),
  startedAt:new Date().toISOString()};
 fs.writeFileSync(metadata,JSON.stringify(state));
 console.log('OWNER_CANVAS_SAFE_LIVE_BASELINE',JSON.stringify({liveId:live.id,previous,target:state.target,workerUnchanged:true}));
}
async function stageResources(){
 const data=load();assert(!fs.existsSync(stageRoot),'Staging directory must start clean');
 const previousRoot='/tmp/deepsyq-canvas-prod-baseline';
 sh('git',['worktree','add','--detach',previousRoot,data.previous]);
 fs.mkdirSync(stageRoot,{recursive:true});fs.cpSync(previousRoot+'/'+sourceRoot,stage,{recursive:true});
 // Only copy the latest LIVE text assets. Copying the raw DEV tree over the
 // production baseline is prohibited; it would revert unrelated changes.
 const textPaths=sh('git',['ls-tree','-r','--name-only',data.previous,sourceRoot]).split('\n')
  .filter(x=>x.startsWith(sourceRoot+'/'))
  .map(x=>x.slice(sourceRoot.length+1))
  .filter(x=>/\.(?:html|css|js|mjs|json|svg|txt|xml|webmanifest)$/i.test(x) && x!=='_worker.js');
 let cursor=0;const unchanged={},removed=[],protectedHashes={};
 const webPage=await getLive('canvas.html');assert.equal(webPage.status,200,'Current Canvas unavailable on MAIN');
 let liveCanvas=stripPagesInjectedSnippet(webPage.bytes).toString('utf8');
 mainContent(liveCanvas);
 async function copyOne(){while(cursor<textPaths.length){const rel=textPaths[cursor++];
   const r=await getLive(rel);if(r.status!==200){
     if(protectedPages.includes(rel)||rel==='canvas.html')throw Error('LIVE required asset missing: '+rel);
     fs.rmSync(path.join(stage,rel),{force:true});removed.push(rel);continue;
   }
   const extension=path.extname(rel).slice(1).toLowerCase();
   const valid=extension==='html'?r.type.includes('html'):
    extension==='css'?r.type.includes('css'):
    ['js','mjs'].includes(extension)?/javascript|text\/plain/.test(r.type):
    ['json','webmanifest'].includes(extension)?/json|text\/plain/.test(r.type):true;
   assert(valid&&r.bytes.length<6000000,'Unexpected type or size for LIVE asset '+rel);
   const raw=extension==='html'?stripPagesInjectedSnippet(r.bytes):r.bytes;
   const dest=path.join(stage,rel);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,raw);
   unchanged[rel]=hash(raw);
   if(protectedPages.includes(rel))protectedHashes[rel]=hash(r.bytes);
 }}
 await Promise.all(Array.from({length:12},()=>copyOne()));
 for(const filename of protectedPages)assert(protectedHashes[filename], 'Cannot audit protected page '+filename);
 // Surgical v2: only existing Canvas JavaScript and CSS may be replaced.
 // The 26 previously approved photo assets must remain byte-for-byte identical.
 const scopedCode=new Set(['canvas-workspace.js','canvas-workspace.css']);
 for(const rel of paths.slice(1)){
   const dest=path.join(stage,rel),source=path.join(sourceRoot,rel);
   assert(fs.existsSync(dest)&&fs.existsSync(source),'Live Canvas file missing '+rel);
   if(scopedCode.has(rel)){
     fs.copyFileSync(source,dest);
   }else{
     const expected=hash(fs.readFileSync(source));
     assert.equal(hash(fs.readFileSync(dest)),expected,'Demo media changed in baseline '+rel);
     const actual=await getLive(rel);
     assert.equal(actual.status,200,'Demo media missing on LIVE '+rel);
     assert.equal(hash(actual.bytes),expected,'Demo media does not match approved image '+rel);
   }
 }
 // The latest live header, site-wide sidebar, account & footer are untouched.
 const updated=patchLatestCanvas(liveCanvas,textOf(path.join(sourceRoot,'canvas.html')));
 fs.writeFileSync(path.join(stage,'canvas.html'),updated);
 assert(updated.includes('id="canvasWorkspace"'),'Workspace main not installed');
 const changed=[];
 for(const [rel,oldHash] of Object.entries(unchanged)){
   const now=hash(fs.readFileSync(path.join(stage,rel)));
   if(now!==oldHash)changed.push(rel);
 }
 assert.deepEqual(changed.sort(),['canvas.html','canvas-workspace.js','canvas-workspace.css'].sort(),'Unrequested existing LIVE text file changed');
 const stagedWorker=sh('git',['hash-object',path.join(stage,'_worker.js')]);
 assert.equal(stagedWorker,data.workerSha,'Worker source not identical to current LIVE commit');
 sh('node',['--check',path.join(stage,'canvas-workspace.js')]);
 assert.equal(textOf(path.join(stage,'canvas-workspace.js')),textOf(path.join(sourceRoot,'canvas-workspace.js')));
 assert.equal(textOf(path.join(stage,'canvas-workspace.css')),textOf(path.join(sourceRoot,'canvas-workspace.css')));
 for(let i=1;i<=13;i++){
   const s=String(i).padStart(2,'0');for(const suffix of ['.webp','-thumb.webp']){
     const rel='media/canvas-demos/20261110/canvas-demo-'+s+suffix;
     assert(hash(fs.readFileSync(path.join(stage,rel)))===hash(fs.readFileSync(path.join(sourceRoot,rel))),'Photo bytes changed '+rel);
   }
 }
 fs.writeFileSync(checks,JSON.stringify(protectedHashes));
 console.log('OWNER_CANVAS_EXACT_ALLOWED_CHANGE',JSON.stringify({changedOld:changed,newFiles:0,protectedChecked:Object.keys(protectedHashes).length,staleGitTextExcluded:removed.length,workerPreserved:true}));
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
