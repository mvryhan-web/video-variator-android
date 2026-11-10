// Owner-approved Account & Video Uniquifier navigation-only MAIN release.
// Build on public live assets, never replace the existing backend or source assets blindly.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const mode=process.argv[2];
const account=process.env.CLOUDFLARE_ACCOUNT_ID;
const token=process.env.CLOUDFLARE_API_TOKEN;
const project='https://api.cloudflare.com/client/v4/accounts/'+account+'/pages/projects/deepsyq';
const store='/tmp/owner-account-nav-main-release.json';
const stage='/tmp/owner-account-nav-stage';
const live='https://deepsyq.app';
const preview='https://owner-account-navsafe-202611.deepsyq.pages.dev';
const hash=b=>createHash('sha256').update(b).digest('hex');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:10000000}).trim();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const source=()=>JSON.parse(fs.readFileSync(store,'utf8'));
async function cf(url,method='GET'){
  assert(token&&/^[0-9a-f]{32}$/.test(account||''),'Cloudflare token/account unavailable');
  const r=await fetch(url,{method,headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(20000)});
  const text=await r.text();let data={};try{data=JSON.parse(text)}catch{}
  return {status:r.status,result:data.result,errors:data.errors||[]};
}
async function projectState(){
  const p=await cf(project);
  assert.equal(p.status,200,'Pages project unavailable');
  assert(p.result?.name==='deepsyq'&&p.result?.production_branch==='deepsyq-platform','Wrong Pages project/MAIN branch');
  return p.result;
}
async function getPublic(name,base=live){
  const r=await fetch(base+'/'+name+'?navCheck='+Date.now(),{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(20000)});
  const bytes=Buffer.from(await r.arrayBuffer());
  return {status:r.status,bytes,type:r.headers.get('content-type')||''};
}
const ensure=(s,old,neu,label)=>{
  if(s.includes(neu))return s;
  assert(s.includes(old),'Required existing route missing: '+label);
  return s.replace(old,neu);
};
function patchTarget(name,text){
  if(name==='deepsyq-site-shell.js'){
    text=ensure(text,"{ label: 'Video Uniquifier', icon: '▤', url:'index.html', key: 'legacy' }",
      "{ label: 'Video Uniquifier', icon: '▤', url:'video-uniquifier.html', key: 'legacy' }",'Video Uniquifier sidebar');
    assert(text.includes("url:'video-uniquifier.html', key: 'legacy'"));
  }else if(name==='deepsyq-mobile-shell.js'){
    text=ensure(text,"href:token?'index.html?view=profile':'deepsyq.html?panel=login'",
      "href:token?'video-uniquifier.html#profile':'deepsyq.html?panel=login'",'mobile shell Account');
    assert(!text.includes('index.html?view=profile'));
  }else if(name==='deepsyq-unified-platform-header.js'){
    text=text.replaceAll('video-uniquifier.html?view=profile','video-uniquifier.html#profile');
    if(!text.includes("if (login.tagName === 'A') login.href = token ?")){
      const anchor='  right.append(login);';
      assert(text.includes(anchor),'Shared header Account insertion point missing');
      text=text.replace(anchor,
        "  if (login.tagName === 'A') login.href = token ? 'video-uniquifier.html#profile' : 'deepsyq.html?panel=login';\n"+anchor);
    }
    const outdated="    if (tkn) login.onclick = (e) => { e.preventDefault(); location.assign('video-uniquifier.html#profile'); };";
    if(text.includes(outdated))text=text.replace(outdated,
      "    if (login.tagName === 'A') login.href = tkn ? 'video-uniquifier.html#profile' : 'deepsyq.html?panel=login';");
    assert(text.includes("if (login.tagName === 'A') login.href = token ?"),'Account anchor not normalized');
  }else if(name==='deepsyq.js'){
    text=text.replaceAll('video-uniquifier.html?view=profile','video-uniquifier.html#profile');
    assert(text.includes("if(localStorage.getItem('vv_token'))location.assign('video-uniquifier.html#profile')"),'Home Account button not corrected');
    assert(text.includes('else openAuth()'),'Guest login must remain functional');
  }
  return text;
}

if(mode==='prepare'){
  const p=await projectState();
  const d=p.canonical_deployment;
  assert(d?.id&&d.uses_functions===true,'Existing production Worker/Functions missing');
  const oldSHA=d.deployment_trigger?.metadata?.commit_hash;
  assert(/^[a-f0-9]{40}$/.test(oldSHA||''),'Unverifiable production Git commit');
  const bindings=p.deployment_configs?.production||{};
  for(const k of ['DATABASE_URL','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','GOOGLE_CLIENT_ID'])assert(Object.hasOwn(bindings.env_vars||{},k),'Production binding missing: '+k);
  assert(Object.hasOwn(bindings.r2_buckets||{},'R2_BUCKET'),'R2 binding missing');
  const settings=await cf('https://api.cloudflare.com/client/v4/accounts/'+account+'/workers/scripts/'+encodeURIComponent(p.production_script_name)+'/settings');
  assert.equal(settings.status,200,'Cannot check current production Worker settings');
  execFileSync('git',['fetch','--no-tags','origin','deepsyq-platform']);
  const dev=git('rev-parse','FETCH_HEAD');
  for(const sha of ['c442f160df8bc962a12c04811a13a234351f52f9','c4ff242e1a284282d2d4e89941da82e15b5411e9','569e5f64aec49552d4448d94cfae9d6b77b5ce2d']){
    execFileSync('git',['merge-base','--is-ancestor',sha,dev]);
  }
  const oldWorker=git('rev-parse',oldSHA+':app/src/main/assets/_worker.js');
  const newWorker=git('rev-parse',dev+':app/src/main/assets/_worker.js');
  assert.equal(oldWorker,newWorker,'Worker changed relative to MAIN, release would replace backend');
  const configRes=await getPublic('api/config');
  assert.equal(configRes.status,200,'MAIN /api/config not healthy before release');
  fs.writeFileSync(store,JSON.stringify({oldId:d.id,oldSHA,dev,workerName:p.production_script_name,worker:oldWorker,time:new Date().toISOString()}));
  console.log('LIVE_NAV_RELEASE_PREFLIGHT_PASS',JSON.stringify({oldId:d.id,oldSHA,dev,workerUnchanged:true,bindingsVerified:true,functions:true}));
}
else if(mode==='snapshot'){
  const data=source();
  fs.cpSync('app/src/main/assets',stage,{recursive:true});
  const names=git('ls-files','--','app/src/main/assets').split('\n')
    .filter(p=>p.startsWith('app/src/main/assets/'))
    .map(p=>p.slice('app/src/main/assets/'.length))
    .filter(name=>/\.(html|css|mjs|js|json|svg|webmanifest|xml|txt)$/i.test(name));
  const critical=new Set(['deepsyq.html','index.html','pricing.html','jarvix-chat.html','free-tools.html','video-uniquifier.html']);
  const saved={},skip=[],replaced=[],normalizedHtml=[];
  let next=0;const concurrency=10;
  async function work(){
    while(next<names.length){
      const name=names[next++];
      if(name==='_worker.js')continue;
      let response;
      try{response=await getPublic(name)}catch(e){skip.push([name,'fetch_failed']);continue}
      if(response.status!==200){if(critical.has(name))throw Error('Critical live page missing '+name+' HTTP '+response.status);continue}
      const ext=path.extname(name).slice(1).toLowerCase(),type=response.type;
      const valid=ext==='html'?type.includes('html'):
        ['js','mjs'].includes(ext)?(/javascript|text\/plain/.test(type)):
        ext==='css'?type.includes('css'):
        ext==='json'||ext==='webmanifest'?(/json|text\/plain/.test(type)):
        ext==='svg'?type.includes('svg'):true;
      if(!valid||response.bytes.length>5*1024*1024){skip.push([name,'invalid_type_or_size']);continue}
      const dest=path.join(stage,name);
      fs.mkdirSync(path.dirname(dest),{recursive:true});
      const original=fs.existsSync(dest)?fs.readFileSync(dest):Buffer.alloc(0);
      // Cloudflare adds an automatic URL normalization script to non-home HTML
      // responses. Live HTML already contains one; remove it from the upload
      // source so Pages will inject exactly one again, preserving live bytes.
      let stageBytes=response.bytes;
      if(ext==='html' && name!=='index.html' && name!=='deepsyq.html'){
        const text=stageBytes.toString('utf8');
        const start=text.indexOf('<script>(function(){if(location.pathname!==');
        const end=start>=0?text.indexOf('</script>',start):-1;
        if(start>=0&&end>=start){
          const snippet=text.slice(start,end+9);
          if(snippet.includes('history.replaceState(null,')&&snippet.includes('location.search+location.hash')){
            stageBytes=Buffer.from(text.slice(0,start)+text.slice(end+9));
            normalizedHtml.push(name);
          }
        }
      }
      fs.writeFileSync(dest,stageBytes);
      saved[name]=hash(response.bytes);
      if(hash(original)!==hash(response.bytes))replaced.push(name);
    }
  }
  await Promise.all(Array.from({length:concurrency},()=>work()));
  for(const name of critical)assert(saved[name],'Cannot preserve current live page '+name);
  const patched={};
  for(const name of ['deepsyq-site-shell.js','deepsyq-mobile-shell.js','deepsyq-unified-platform-header.js','deepsyq.js']){
    assert(saved[name],'Cannot recover current live navigation '+name);
    const file=path.join(stage,name),previous=fs.readFileSync(file,'utf8');
    const after=patchTarget(name,previous);
    fs.writeFileSync(file,after);
    patched[name]={old:hash(Buffer.from(previous)),new:hash(Buffer.from(after)),changed:previous!==after};
    execFileSync('node',['--check',file],{stdio:'pipe'});
  }
  assert(fs.existsSync(path.join(stage,'_worker.js')),'Worker missing in stage');
  const originalWorker=git('rev-parse',data.oldSHA+':app/src/main/assets/_worker.js');
  const stagedWorkerBlob=git('hash-object',path.join(stage,'_worker.js'));
  assert.equal(stagedWorkerBlob,originalWorker,'Staged Worker not identical to known production Worker source');
  const preserved=Object.fromEntries([...critical].map(name=>[name,saved[name]]));
  fs.writeFileSync('/tmp/owner-account-nav-preserved.json',JSON.stringify({preserved,patched,count:names.length,copied:Object.keys(saved).length,drifted:replaced.length,skipped:skip.length}));
  console.log('LIVE_NAV_STAGE_READY',JSON.stringify({totalText:names.length,recoveredFromActualMain:Object.keys(saved).length,liveDifferencesPreserved:replaced.length,skipped:skip.length,normalizedHtml:normalizedHtml.length,patched,preservedCritical:[...critical]}));
}
else if(mode==='preview'||mode==='main'){
  const data=source();
  const base=mode==='preview'?preview:live;
  let config;
  for(let n=0;n<12;n++){
    try{
      const r=await getPublic('api/config',base);
      if(r.status===200){config=JSON.parse(r.bytes.toString('utf8'));if(config&&typeof config==='object'&&config.plans)break}
    }catch{}
    await sleep(3000);
  }
  assert(config&&typeof config==='object'&&config.plans,mode+' actual Worker /api/config not usable');
  const names=['deepsyq-site-shell.js','deepsyq-mobile-shell.js','deepsyq-unified-platform-header.js','deepsyq.js'];
  for(const name of names){
    const r=await getPublic(name,base);assert.equal(r.status,200,mode+' JS HTTP '+name);
    const expected=fs.readFileSync(path.join(stage,name));
    assert.equal(hash(r.bytes),hash(expected),mode+' JS not equal to staged file '+name);
  }
  const preserved=JSON.parse(fs.readFileSync('/tmp/owner-account-nav-preserved.json','utf8')).preserved;
  for(const [name,expected] of Object.entries(preserved)){
    const r=await getPublic(name,base);
    assert.equal(r.status,200,mode+' preserved page HTTP '+name);
    assert.equal(hash(r.bytes),expected,mode+' changed unrelated public page: '+name);
  }
  if(mode==='main'){
    const p=await projectState();
    assert(p.canonical_deployment?.id!==data.oldId,'MAIN deployment did not advance');
    assert.equal(p.canonical_deployment?.uses_functions,true,'Production Functions lost');
    assert.equal(p.production_script_name,data.workerName,'Production Worker name changed');
    const billing=await getPublic('api/ai-billing/config');
    assert.equal(billing.status,200,'Production AI billing read endpoint down');
  }
  const {chromium}=await import('playwright');
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    const tests=[['desktop-home',1360,'deepsyq.html'],['desktop-pricing',1360,'pricing.html'],['desktop-jarvix',1360,'jarvix-chat.html'],['desktop-tools',1360,'free-tools.html'],['mobile-home',390,'deepsyq.html'],['mobile-pricing',390,'pricing.html']];
    for(const [label,width,start] of tests){
      const ctx=await browser.newContext({viewport:{width,height:width===390?844:900},isMobile:width===390,hasTouch:width===390});
      await ctx.addInitScript(()=>{try{localStorage.setItem('vv_token','qa-local-fake-token')}catch{}});
      await ctx.route('**/api/**',async r=>{
        const url=r.request().url();
        const body=url.includes('/api/me')?{user:{name:'QA',email:'qa@example.test',isAdmin:false}}:
          url.includes('/api/config')?{googleClientId:'',billingConfigured:false,plans:{basic:{price:9,limit:750},pro:{price:24,limit:2250},business:{price:99,limit:15000},lifetime:{price:2999,currency:'eur'}}}:
          url.includes('/api/ai-billing/config')?{packs:[],billingConfigured:false}:{available:0,items:[]};
        await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
      });
      const page=await ctx.newPage();
      try{
        const initial=await page.goto(base+'/'+start,{waitUntil:'domcontentloaded',timeout:40000});
        assert.equal(initial.status(),200,label+' start');
        await page.locator('#topLogin').waitFor({state:'visible',timeout:18000});
        await page.locator('#topLogin').click({timeout:12000});
        await page.waitForURL(u=>u.pathname==='/video-uniquifier.html'&&u.hash==='#profile',{timeout:15000});
        await page.locator('#profileView').waitFor({state:'visible',timeout:20000});
        console.log('LIVE_ACCOUNT_FIRST_CLICK_PASS',mode,label);
      }finally{await ctx.close()}
    }
    for(const start of ['deepsyq.html','pricing.html']){
      const ctx=await browser.newContext({viewport:{width:1360,height:900}});
      const page=await ctx.newPage();
      try{
        const response=await page.goto(base+'/'+start,{waitUntil:'domcontentloaded',timeout:40000});
        assert.equal(response.status(),200);
        const href=await page.locator('#sidebar a[aria-label="Video Uniquifier"], #dsSiteSidebar a[href="video-uniquifier.html"]').first().getAttribute('href',{timeout:18000});
        assert.equal(href,'video-uniquifier.html');
        await page.locator('#sidebar a[aria-label="Video Uniquifier"], #dsSiteSidebar a[href="video-uniquifier.html"]').first().click({timeout:15000});
        await page.waitForURL(u=>u.pathname==='/video-uniquifier.html',{timeout:18000});
        console.log('LIVE_UNIQUIFIER_LINK_PASS',mode,start);
      }finally{await ctx.close()}
    }
  }finally{await browser.close()}
  console.log('LIVE_NAV_RELEASE_QA_PASS',mode);
  if(mode==='main')fs.writeFileSync('/tmp/owner-account-nav-verified','1');
}
else if(mode==='guard'){
  const data=source(),current=await projectState();
  assert.equal(current.canonical_deployment?.id,data.oldId,'Another executor deployed MAIN; abort to preserve their work');
  assert.equal(current.canonical_deployment?.uses_functions,true,'MAIN Worker was modified');
  console.log('LIVE_NAV_CONCURRENT_DEPLOY_GUARD_PASS',data.oldId);
}
else if(mode==='rollback'){
  const data=source(),current=await projectState();
  if(current.canonical_deployment?.id===data.oldId){console.log('NAV_MAIN_NOT_CHANGED');process.exit(0)}
  if(current.canonical_deployment?.deployment_trigger?.metadata?.commit_hash!==data.dev){
    console.error('ANOTHER_OWNER_DEPLOYMENT_ACTIVE: no automatic rollback');
    process.exitCode=1;
  }else{
    const r=await cf(project+'/deployments/'+data.oldId+'/rollback','POST');
    assert([200,201,202].includes(r.status),'Rollback failed HTTP '+r.status);
    console.log('NAV_MAIN_ROLLBACK_TO',data.oldId);
  }
}
else throw Error('Unknown release mode '+mode);
