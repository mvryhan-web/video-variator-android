import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import vm from 'node:vm';

const server=await readFile(resolve(dirname(fileURLToPath(import.meta.url)),'../server/generation-studio.js'),'utf8');
const start=server.indexOf("app.get('/api/studio/jobs',auth,generationUser,async(req,res)=>{");
const end=server.indexOf("app.delete('/api/studio/jobs/:id'",start);
assert.ok(start>0&&end>start,'History GET handlers must exist in the real current server');
const handlers=server.slice(start,end);

// Register the real three production GET route functions in a no-network,
// no-database sandbox. No application server, paid providers or payment APIs run.
function fakeHistory({job=null,rows=[],dbThrows=false}={}){
 const routes=new Map(),sql=[],objects=[];
 const app={get:(path,...functions)=>routes.set(path,functions.at(-1))};
 const pool={query:async(statement,params)=>{
  sql.push({statement,params});
  if(dbThrows)throw Error('DISPOSABLE_DB_FAILURE');
  return {rows};
 }};
 const objectStorage={configured:true,get:async(key,options)=>{
  objects.push({key,options});
  return Buffer.from('test-owner-media');
 }};
 const context={app,pool,objectStorage,auth(){},generationUser(){},async init(){},
  async getJob(req){return req.user?.id==='owner-a'?job:null;},walletEnabled(){return false;},Buffer};
 vm.runInNewContext(handlers,context,{timeout:1500,filename:'real-history-get-handlers.js'});
 const req=(filter='all',id='owner-a')=>({query:{filter},user:{id},params:{id:'owned-job'}});
 async function dispatch(path,request){
  const handler=routes.get(path);assert.equal(typeof handler,'function',path);
  const response={statusCode:200,headers:{},payload:null,mime:null,
   set(name,value){this.headers[name.toLowerCase()]=value;return this;},
   status(code){this.statusCode=code;return this;},
   json(body){this.payload=body;return this;},
   type(mime){this.mime=mime;return this;},
   send(bytes){this.payload=bytes;return this;}};
  await handler(request,response);
  return response;
 }
 return {req,dispatch,sql,objects,routes};
}
const LIST='/api/studio/jobs',DETAIL='/api/studio/jobs/:id',MEDIA='/api/studio/jobs/:id/media';
const assertPrivate=response=>assert.equal(response.headers['cache-control'],'private, no-store');

test('authenticated Image, Video and Music filters use an actual bound SQL kind parameter',async()=>{
 for(const kind of ['image','video','music']){
  const db=fakeHistory();
  const res=await db.dispatch(LIST,db.req(kind));
  assert.equal(res.statusCode,200);
  assertPrivate(res);
  assert.equal(res.payload.filter,kind);
  assert.equal(db.sql.length,1);
  const [{statement,params}]=db.sql;
  assert.match(statement,/user_id=\$1/);
  assert.match(statement,/kind=\$2(?:\b|\s|$)/);
  assert.deepEqual(Array.from(params),['owner-a',kind]);
  assert.doesNotMatch(statement,/kind=2(?:\b|\s|$)/);
 }
});

test('invalid filter is rejected and never touches account database; list read errors are private',async()=>{
 const db=fakeHistory();
 const rejected=await db.dispatch(LIST,db.req('invalid;DROP TABLE'));
 assert.equal(rejected.statusCode,400);
 assert.equal(rejected.payload.error,'INVALID_HISTORY_FILTER');
 assert.equal(db.sql.length,0);
 assertPrivate(rejected);
 const broken=fakeHistory({dbThrows:true});
 const error=await broken.dispatch(LIST,broken.req('image'));
 assert.equal(error.statusCode,503);
 assert.equal(error.payload.error,'STUDIO_STORAGE_UNAVAILABLE');
 assertPrivate(error);
});

test('owner detail response and unauthorized 404 both prohibit browser caching',async()=>{
 const db=fakeHistory({job:{id:'owned-job',kind:'image',status:'ready',prompt:'private prompt'}});
 const good=await db.dispatch(DETAIL,db.req());
 assert.equal(good.statusCode,200);
 assert.equal(good.payload.prompt,'private prompt');
 assertPrivate(good);
 const stranger=await db.dispatch(DETAIL,db.req('all','not-owner'));
 assert.equal(stranger.statusCode,404);
 assertPrivate(stranger);
 assert.equal(stranger.payload.error,'NOT_FOUND');
});

test('owner media preserves S3 sha256 integrity verification and never caches personal bytes',async()=>{
 const job={id:'owned-job',kind:'video',status:'ready',mime:'video/mp4',
  output_assets:[{storage:'s3',key:'owner-a/private-video',sha256:'known-hash',mime:'video/mp4'}]};
 const db=fakeHistory({job});
 const res=await db.dispatch(MEDIA,db.req());
 assert.equal(res.statusCode,200);
 assertPrivate(res);
 assert.equal(res.mime,'video/mp4');
 assert.equal(Buffer.from(res.payload).toString(),'test-owner-media');
 assert.equal(db.objects.length,1);
 assert.equal(db.objects[0].key,'owner-a/private-video');
 assert.equal(db.objects[0].options.expectedSha256,'known-hash');
 const outsider=await db.dispatch(MEDIA,db.req('all','not-owner'));
 assert.equal(outsider.statusCode,404);
 assertPrivate(outsider);
 assert.equal(db.objects.length,1,'unauthorized read never hits object storage');
});

test('shared provider/payment guard is retained untouched by History GET fix',()=>{
 assert.match(server,/submitPurchasedProviderRequest/);
 assert.match(server,/expectedSha256:asset\.sha256\?\?null/);
 assert.match(server,/app\.delete\('\/api\/studio\/jobs\/:id'/);
 assert.equal([...server.matchAll(/app\.get\('\/api\/studio\/jobs(?:\/|')/g)].length,3);
});
