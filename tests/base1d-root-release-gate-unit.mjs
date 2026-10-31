import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import vm from 'node:vm';

// Inspect and execute the REAL server root handler with a sealed, no-network
// sandbox. This must not instantiate Stripe, connect to Postgres or bind ports.
const source=await readFile(resolve(dirname(fileURLToPath(import.meta.url)),'../server/server.js'),'utf8');
const start=source.indexOf("app.get('/',(req,res,next)=>{");
const end=source.indexOf("app.get('/dashboard'",start);
assert.ok(start>=0&&end>start,'DEV must retain an explicit, opt-in root handler');
const rootHandler=source.slice(start,end);
const legacyPath='/isolated/deepsyq-static/index.html';
const homePath='/isolated/deepsyq-static/deepsyq.html';

function inspectRoot({enabled,query={}}={}){
 const routes=new Map();
 const app={get:(route,handler)=>routes.set(route,handler)};
 const sandbox={
  app,process:{env:enabled===undefined?{}:{DEEPSYQ_HOME_ENABLED:enabled}},
  path:{join:(...parts)=>parts.join('/')},staticDir:'/isolated/deepsyq-static'
 };
 vm.runInNewContext(rootHandler,sandbox,{timeout:1200,filename:'actual-root-release-route.js'});
 assert.equal(routes.size,1);
 const root=routes.get('/');
 assert.equal(typeof root,'function');
 let nextCalled=0,sent=null,cache=null;
 const res={
  setHeader:(name,value)=>{if(name==='Cache-Control')cache=value;},
  sendFile:file=>{sent=file;}
 };
 root({query},res,()=>{nextCalled++;sent=legacyPath;});
 return {nextCalled,sent,cache};
}

test('BASE 1-D root defaults to Video Uniquifier when flag is missing or not literally true',()=>{
 for(const flag of [undefined,'','false','1','TRUE','on']){
  const result=inspectRoot({enabled:flag});
  assert.equal(result.sent,legacyPath,String(flag));
  assert.equal(result.nextCalled,1,String(flag));
  assert.equal(result.cache,null,String(flag));
 }
});

test('BASE 1-D exact opt-in routes only clean home visits to Deepsyq',()=>{
 const result=inspectRoot({enabled:'true'});
 assert.equal(result.sent,homePath);
 assert.equal(result.nextCalled,0);
 assert.equal(result.cache,'no-cache');
});

test('BASE 1-D legacy checkout returns and Android/mobile auth bypass new home even when enabled',()=>{
 for(const query of [{checkout:'success'},{checkout:'cancel'},{mobileAuth:'1'},{mobileAuth:'yes'},{checkout:'success',mobileAuth:'1'}]){
  const result=inspectRoot({enabled:'true',query});
  assert.equal(result.sent,legacyPath,JSON.stringify(query));
  assert.equal(result.nextCalled,1,JSON.stringify(query));
 }
});

test('BASE 1-D old Video Uniquifier billing, webhooks, auth and explicit index remain installed',()=>{
 for(const marker of [
  "app.post('/api/webhooks/stripe',express.raw",
  "app.post('/api/billing/checkout',auth,",
  "app.post('/api/billing/portal',auth,",
  "app.post('/api/billing/cancel',auth,",
  "installEmailAuth(app,{signAppToken})",
  "app.get('/api/health'",
  "app.use(express.static(staticDir,",
  "path.join(staticDir,'index.html')",
  "const generationBilling=installGenerationBilling(app,"
 ])assert.ok(source.includes(marker),`Legacy entry or billing handler absent: ${marker}`);
 for(const line of [
  "basic:{name:'Basic',limit:750,amount:9",
  "pro:{name:'Pro',limit:2250,amount:24",
  "business:{name:'Business',limit:15000,amount:99",
  "lifetime:{name:'Lifetime',limit:null,amount:2999"
 ])assert.ok(source.includes(line),'Legacy product changed without explicit release compatibility audit');
 const rootIndex=source.indexOf("app.get('/',(req,res,next)=>{");
 assert.ok(source.indexOf("app.post('/api/webhooks/stripe',express.raw")<rootIndex);
 assert.ok(source.indexOf("app.post('/api/billing/checkout',auth,")<rootIndex);
 assert.ok(source.indexOf("installEmailAuth(app,{signAppToken})")<rootIndex);
});
