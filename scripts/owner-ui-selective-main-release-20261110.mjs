// Only owner-approved UI changes on MAIN. No paid calls or unreviewed source overwrite.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const mode=process.argv[2];
const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
const proj='https://api.cloudflare.com/client/v4/accounts/'+account+'/pages/projects/deepsyq';
const prod='https://deepsyq.app',preview='https://owner-tools-scoped-20261110.deepsyq.pages.dev';
const stageRoot='/tmp/deepsyq-owner-ui-selective',stage=stageRoot+'/app/src/main/assets';
const statusFile='/tmp/deepsyq-owner-ui-status.json';
const changes=[
 'app-v4.js','deepsyq-mobile-shell.js','deepsyq-unified-platform-header.css',
 'deepsyq-unified-platform-header.js','deepsyq.html','everyday-tools-visual.js',
 'pricing-page.css','pricing.html','video-uniquifier-reference.js','video-uniquifier.html'
];
const baseline='d36a2b1d59596943de332f9919ca6ac77a728588';
const approved='e5825301df43dccf964308cc441a9f2c32c2995a';
const important=['index.html','free-tools.html','jarvix-chat.html','canvas.html',
 'my-creations.html','audio-studio.html','ai-apps.html'];
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
 console.log('OWNER_SCOPE_PATCH_PASS',JSON.stringify({count:modified.length,files:modified}));
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
 console.log('OWNER_SELECTIVE_MAIN_PREFLIGHT_PASS',JSON.stringify({id:d.id,previous,dev:data.dev,workerUnchanged:true,bindings:true}));
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
 const original={},stageBefore={},skipped=[];
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
   const saved=ext==='html'?strippedHtml(r.bytes):r.bytes;
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
 const patch=execFileSync('git',['diff','--binary','--no-ext-diff',baseline,approved,'--',
   ...changes.map(n=>'app/src/main/assets/'+n)],{maxBuffer:10000000});
 const patchFile='/tmp/deepsyq-approved-ui.patch';
 fs.writeFileSync(patchFile,patch);
 const args=['--batch','--forward','--fuzz=0','-p1','-d',stageRoot,'-i',patchFile];
 try{
  const report=sh('patch',['--dry-run',...args]);
  console.log('OWNER_PATCH_DRYRUN_PASS',report.slice(0,1600));
  const done=sh('patch',args);console.log('OWNER_PATCH_APPLIED',done.slice(0,1600));
 }catch(e){
  console.error('OWNER_PATCH_FAILED',String(e.stdout||e.stderr||e).slice(0,4000));
  throw new Error('No safe hunk match on live site; production not modified');
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
 const protectedHashes=Object.fromEntries(important.map(n=>[n,original[n]]));
 fs.writeFileSync('/tmp/deepsyq-ui-protected.json',JSON.stringify(protectedHashes));
 console.log('OWNER_ONLY_TEN_FILES_CHANGED',JSON.stringify({count:changed.length,files:changed,liveTextCopied:Object.keys(original).length,normalizedHtml:normalized,missingStaleFiles:skipped.length}));
}
async function check(mode){
 const base=mode==='preview'?preview:prod;
 const data=readStatus();
 let cfg=null;
 for(let i=0;i<14;i++){
  try{
   const r=await getAsset('api/config',base);
   if(r.status===200){cfg=JSON.parse(r.bytes.toString('utf8'));if(cfg?.plans)break}
  }catch{}
  await sleep(3500);
 }
 assert(cfg?.plans,mode+' live Cloudflare Worker /api/config invalid');
 const cssJs=changes.filter(n=>/\.(js|css)$/.test(n));
 for(const name of cssJs){
  const r=await getAsset(name,base);
  assert.equal(r.status,200,mode+' missing modified '+name);
  assert.equal(dig(r.bytes),dig(fs.readFileSync(path.join(stage,name))),mode+' did not publish exact '+name);
 }
 const protectedHashes=JSON.parse(fs.readFileSync('/tmp/deepsyq-ui-protected.json','utf8'));
 for(const [name,expected] of Object.entries(protectedHashes)){
  const r=await getAsset(name,base);
  assert.equal(r.status,200,mode+' other page missing '+name);
  assert.equal(dig(r.bytes),expected,mode+' unrelated page changed '+name);
 }
 if(mode==='main'){
  const p=await project();
  assert(p.canonical_deployment?.id!==data.id,'MAIN deployment did not change');
  assert.equal(p.canonical_deployment?.uses_functions,true,'MAIN Functions missing');
  assert.equal(p.production_script_name,data.workerName,'MAIN Worker identity changed');
  const billed=await getAsset('api/ai-billing/config');
  assert.equal(billed.status,200,'Production read-only AI billing config broken');
 }
 const {chromium}=await import('playwright');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [label,width] of [['desktop',1360],['mobile',390]]){
   const ctx=await browser.newContext({viewport:{width,height:900},isMobile:width<700,hasTouch:width<700});
   await ctx.addInitScript(()=>{
    if(!localStorage.getItem('owner_mock_initialized')){
     localStorage.setItem('vv_token','qa-only-fake-session');
     localStorage.setItem('owner_mock_initialized','1');
    }
   });
   await ctx.route('**/api/**',async r=>{
    const url=r.request().url();
    const body=url.includes('/api/me')?{user:{name:'QA',email:'qa@example.test',isAdmin:false}}:
     url.includes('/api/config')?{googleClientId:'',billingConfigured:false,plans:{basic:{price:9,limit:750},pro:{price:24,limit:2250},business:{price:99,limit:15000},lifetime:{price:2999,currency:'eur'}}}:
     url.includes('/api/ai-billing/config')?{packs:[],billingConfigured:false}:{available:0,items:[]};
    await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
   });
   try{
    const p=await ctx.newPage();
    await p.goto(base+'/free-tools.html',{waitUntil:'domcontentloaded',timeout:42000});
    await p.locator('#etShowcase').waitFor({state:'attached',timeout:20000});
    assert.equal(await p.locator('.et-topbar').count(),0,'Secondary Tools bar still exists');
    assert.equal(await p.locator('.et-uniquifier').getAttribute('href'),'video-uniquifier.html','Video Uniquifier main card wrong');
    assert.equal(await p.locator('.ds-owner-social-link').count(),4,'Four social icons missing');
    if(width>700)assert(await p.locator('.ds-header-help-link').isVisible(),'Help not in top header');
    else assert.equal(await p.locator('.ds-owner-sidebar-language').count(),1,'Mobile language missing from sidebar');
    await p.locator('.et-uniquifier').click();
    await p.waitForURL(u=>u.pathname==='/video-uniquifier.html',{timeout:18000});
    const v=await ctx.newPage();
    await v.goto(base+'/video-uniquifier.html#profile',{waitUntil:'domcontentloaded',timeout:42000});
    await v.locator('#profileView').waitFor({state:'visible',timeout:23000});
    assert(await v.locator('#profileLogoutBtn').isVisible(),'Profile logout invisible');
    await v.locator('#profileLogoutBtn').click();
    await v.waitForURL(u=>u.pathname==='/deepsyq.html',{timeout:18000});
    assert.equal(await v.evaluate(()=>localStorage.getItem('vv_token')),null,'Logout retained token');
    const pricing=await ctx.newPage();
    await pricing.goto(base+'/pricing.html',{waitUntil:'domcontentloaded',timeout:42000});
    await pricing.locator('#planCards .price-plan').first().waitFor({state:'visible',timeout:20000});
    assert.equal(await pricing.locator('#planCards .price-plan').count(),5);
    assert.equal(await pricing.locator('#creditCards .price-credit-card').count(),5);
    assert.equal((await pricing.locator('.price-offer-badge').textContent()).trim(),'85% OFF');
    if(width<700){
     const style=await pricing.locator('#pricePlanNext').evaluate(e=>getComputedStyle(e).borderTopWidth);
     assert.equal(style,'0px','Carousel arrow still has border');
     await pricing.locator('#pricePlanNext').click();
     await pricing.waitForFunction(()=>document.querySelector('#pricePlanPosition').textContent.includes('2 / 5'));
    }
    const home=await ctx.newPage();
    await home.goto(base+'/deepsyq.html',{waitUntil:'domcontentloaded',timeout:42000});
    await home.locator('.ds-owner-social-link').first().waitFor({state:'attached',timeout:20000});
    assert.equal(await home.locator('.home-global-search').count(),0);
    assert.equal(await home.locator('#topPromo').count(),0);
    console.log('OWNER_SCOPED_LIVE_BROWSER_PASS',mode,label);
   }finally{await ctx.close()}
  }
 }finally{await browser.close()}
 if(mode==='main')fs.writeFileSync('/tmp/owner-ui-main-verified','yes');
 console.log('OWNER_SCOPED_RELEASE_CHECK_PASS',mode);
}
async function guard(){
 const data=readStatus(),p=await project();
 assert.equal(p.canonical_deployment?.id,data.id,'Another owner published while staging; stop');
 assert.equal(p.canonical_deployment?.uses_functions,true);
 console.log('OWNER_MAIN_CONCURRENCY_GUARD_PASS',data.id);
}
async function rollback(){
 const data=readStatus(),p=await project();
 if(p.canonical_deployment?.id===data.id){console.log('OWNER_MAIN_UNCHANGED');return}
 if(p.canonical_deployment?.deployment_trigger?.metadata?.commit_hash!==data.dev)
   throw Error('Other owner active; never roll back their production');
 const r=await cf(proj+'/deployments/'+data.id+'/rollback','POST');
 assert([200,201,202].includes(r.status),'Failed safe rollback '+r.status);
 console.log('OWNER_UI_ROLLED_BACK',data.id);
}
if(mode==='prepare')await prepare();
else if(mode==='snapshot')await snapshot();
else if(mode==='preview'||mode==='main')await check(mode);
else if(mode==='guard')await guard();
else if(mode==='rollback')await rollback();
else throw Error('Unsupported release action '+mode);
