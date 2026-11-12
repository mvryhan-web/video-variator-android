import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {validateInspiration,installInspiration} from '../server/generation-inspiration.js';
import {readFileSync} from 'node:fs';

// Public Inspiration uses curated manifests; the owner-only CMS and rights-checked
// SQL detail fallback have separate security tests below. Never modify live cards
// just to satisfy an obsolete database-only public fixture.
const manifestNames=[
 'media/home/owner-20261018/manifest.json',
 'media/inspiration/openai-20261021/manifest.json',
 'media/inspiration/owner-20261031/manifest.json',
 'media/inspiration/owner-next-20261031/manifest.json'
];
const manifestGallery=()=>manifestNames.flatMap(name=>{
 const manifest=JSON.parse(readFileSync(new URL('../app/src/main/assets/'+name,import.meta.url),'utf8'));
 return manifest.items||[];
}).filter(item=>!item.previewUrl?.includes('logo')&&!item.previewPosterUrl?.includes('logo'));
async function openManifestGallery({env={},pool}={}){
 const queries=[];
 const conn=pool||{async query(sql,args=[]){
  queries.push({sql,args});
  if(sql.includes('CREATE TABLE IF NOT EXISTS vv_ai_inspiration'))return {rows:[]};
  throw Error('Unexpected public gallery SQL: '+sql);
 }};
 const app=express();app.use(express.json());
 installInspiration(app,{pool:conn,env:{NODE_ENV:'test',AI_INSPIRATION_ENABLED:'true',...env},
  auth:(req,_res,next)=>{req.user={id:'owner',provider:'google',email:'owner@example.test'};next();}});
 const server=app.listen(0);await new Promise(r=>server.once('listening',r));
 const base='http://127.0.0.1:'+server.address().port;
 return {base,queries,close:async()=>{
  server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
 }};
}


test('inspiration validation requires owned/licensed media and safe preview URLs',()=>{
 const item=validateInspiration({title:'Owned editorial image',slug:'owned-editorial-image',kind:'image',category:'editorial',previewUrl:'/owned/inspiration/editorial.webp',prompt:'Editorial portrait with soft natural light',aspectRatio:'2:3',rightsBasis:'owned',rightsNote:'Created in house',active:true,featured:true});
 assert.equal(item.kind,'image');assert.equal(item.rightsBasis,'owned');assert.equal(item.aspectRatio,'2:3');
 assert.throws(()=>validateInspiration({...item,rightsBasis:'unknown'}),/INVALID_INSPIRATION/);
 assert.throws(()=>validateInspiration({...item,previewUrl:'javascript:alert(1)'}),/INVALID_INSPIRATION/);

 // Browsers treat backslashes after a leading slash like a protocol-relative URL.
 // Do not let an apparent local media path resolve to another origin.
 for(const unsafe of [String.raw`/\\evil.example/asset.webp`,String.raw`/gallery\\asset.webp`,String.raw`https:\\evil.example/asset.webp`]){
  assert.throws(()=>validateInspiration({...item,previewUrl:unsafe}),/INVALID_INSPIRATION/);
  assert.throws(()=>validateInspiration({...item,previewPosterUrl:unsafe}),/INVALID_INSPIRATION/);
 }
 assert.equal(validateInspiration({...item,previewUrl:'/gallery/valid.webp'}).previewUrl,'/gallery/valid.webp');
 assert.equal(validateInspiration({...item,previewUrl:'https://media.example.test/valid.webp'}).previewUrl,'https://media.example.test/valid.webp');
 assert.throws(()=>validateInspiration({...item,aspectRatio:'10:1'}),/INVALID_INSPIRATION/);
});

test('public Inspiration serves the existing manifest gallery with exact kind and ratio filters',async()=>{
 const gallery=await openManifestGallery();
 try{
  const expected=manifestGallery().filter(item=>item.kind==='image'&&item.aspectRatio==='1:1')
   .sort((a,b)=>(a.sortOrder||100)-(b.sortOrder||100));
  const res=await fetch(gallery.base+'/api/inspiration?kind=image&ratio=1%3A1&limit=60');
  assert.equal(res.status,200);
  const data=await res.json();
  assert.equal(data.pagination.total,expected.length);
  assert.deepEqual(data.items.map(x=>x.slug),expected.slice(0,60).map(x=>x.slug));
  assert.ok(data.items.every(x=>x.kind==='image'&&x.aspectRatio==='1:1'));
  assert.ok(data.items.every(x=>!Object.hasOwn(x,'rightsNote')&&!Object.hasOwn(x,'rightsBasis')));
  assert.ok(data.ratios.includes('1:1'));
  assert.ok(gallery.queries.length>0);
  assert.ok(gallery.queries.every(q=>!q.sql.startsWith('SELECT * FROM vv_ai_inspiration')),
   'public manifest listing must not be silently swapped for a DB query');
 }finally{await gallery.close();}
});


test('active inspiration requires recorded rights evidence',()=>{
 const base={title:'Licensed example',slug:'licensed-example',kind:'video',category:'ads',previewUrl:'https://media.example.test/example.mp4',prompt:'Product ad prompt',aspectRatio:'9:16',rightsBasis:'licensed'};
 assert.equal(validateInspiration({...base,active:false}).active,false);
 assert.throws(()=>validateInspiration({...base,active:true,rightsNote:''}),/INSPIRATION_RIGHTS_NOTE_REQUIRED/);
 assert.equal(validateInspiration({...base,active:true,rightsNote:'License contract #42'}).active,true);
});


test('owner Inspiration readiness reports concrete content blockers',async()=>{
 const rows=[
  {kind:'image',category:'Fashion',aspect_ratio:'2:3',action_target:'studio',rights_basis:'owned',rights_note:'Created in house',active:true,featured:true},
  {kind:'video',category:'Cinematic',aspect_ratio:'16:9',action_target:'studio',rights_basis:'licensed',rights_note:'License #7',active:true,featured:false},
  {kind:'image',category:'Draft',aspect_ratio:'1:1',action_target:'studio',rights_basis:'owned',rights_note:'',active:true,featured:false},
  {kind:'video',category:'Agent',aspect_ratio:'9:16',action_target:'agent',rights_basis:'owned',rights_note:'Created in house',active:true,featured:true}
 ];
 const pool={async query(sql){if(sql.includes('CREATE TABLE IF NOT EXISTS vv_ai_inspiration'))return {rows:[]};if(sql.startsWith('SELECT kind,category,aspect_ratio'))return {rows};throw new Error(sql);}};
 const app=express();installInspiration(app,{pool,env:{NODE_ENV:'test',AI_INSPIRATION_ENABLED:'true',AI_INSPIRATION_AGENT_TARGETS_ENABLED:'false',ADMIN_EMAIL:'owner@example.test'},auth:(req,_res,next)=>{req.user={id:'owner',provider:'google',email:'owner@example.test'};next();}});
 const server=app.listen(0);await new Promise(r=>server.once('listening',r));try{const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/studio/admin/inspiration-readiness');assert.equal(r.status,200);const d=await r.json();assert.equal(d.ready,false);assert.equal(d.counts.images,1);assert.equal(d.counts.videos,1);assert.equal(d.counts.featured,1);assert.equal(d.counts.rightsBlocked,1);assert.equal(d.counts.agentGated,1);assert.ok(d.blockers.includes('ACTIVE_ITEMS_MISSING_RIGHTS_EVIDENCE'));assert.deepEqual(d.ratios,['16:9','2:3']);}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});


test('DB-only agent inspiration detail requires explicit opt-in and safe same-origin path',async()=>{
 const slug='test-agent-db-only-not-in-manifest';
 const item={id:'agent-db-1',slug,title:'Agent test',kind:'video',category:'Campaign',
  description:'',preview_url:'/owned-agent.webp',preview_poster_url:null,prompt:'Owned example',
  default_model:null,aspect_ratio:'9:16',required_input_types:[],default_settings:{},
  action_target:'agent',rights_basis:'owned',rights_note:'Created in house',
  active:true,featured:true,sort_order:1,created_at:new Date(),updated_at:new Date()};
 const makePool=()=>({async query(sql){
  if(sql.includes('CREATE TABLE IF NOT EXISTS vv_ai_inspiration'))return {rows:[]};
  if(sql.startsWith('SELECT * FROM vv_ai_inspiration WHERE slug=')){
   assert.match(sql,/rights_basis IN \('owned','licensed'\)/);
   assert.match(sql,/length\(trim\(rights_note\)\)>=3/);
   return {rows:sql.includes("action_target='studio'")?[]:[item]};
  }
  throw Error('Unexpected SQL: '+sql);
 }});
 for(const [env,expected] of [
  [{AI_INSPIRATION_AGENT_TARGETS_ENABLED:'false',AI_INSPIRATION_AGENT_PATH:'/agent.html'},404],
  [{AI_INSPIRATION_AGENT_TARGETS_ENABLED:'true'},404],
  [{AI_INSPIRATION_AGENT_TARGETS_ENABLED:'true',AI_INSPIRATION_AGENT_PATH:'https://evil.example/agent'},404],
  [{AI_INSPIRATION_AGENT_TARGETS_ENABLED:'true',AI_INSPIRATION_AGENT_PATH:'/agent.html'},200]
 ]){
  const gallery=await openManifestGallery({env,pool:makePool()});
  try{
   const res=await fetch(gallery.base+'/api/inspiration/'+slug);
   assert.equal(res.status,expected,JSON.stringify(env));
   if(expected===200){
    const data=await res.json();
    assert.equal(data.item.actionTarget,'agent');
    assert.equal(data.item.actionPath,'/agent.html');
    assert.equal(data.item.rightsBasis,undefined);
   }
  }finally{await gallery.close();}
 }
});


test('public inspiration pagination is bounded and exposes a next offset',async()=>{
 const rows=Array.from({length:25},(_,i)=>({id:'p'+i,title:'Item '+i,slug:'item-'+i,kind:'image',category:'Editorial',description:'',preview_url:'/p'+i+'.webp',preview_poster_url:null,prompt:'Prompt '+i,default_model:null,aspect_ratio:'1:1',required_input_types:[],default_settings:{},action_target:'studio',rights_basis:'owned',rights_note:'Created in house',active:true,featured:false,sort_order:i,created_at:new Date(),updated_at:new Date()}));
 const pool={async query(sql){if(sql.includes('CREATE TABLE IF NOT EXISTS vv_ai_inspiration'))return {rows:[]};if(sql.startsWith('SELECT DISTINCT category'))return {rows:[{category:'Editorial'}]};if(sql.startsWith('SELECT DISTINCT aspect_ratio'))return {rows:[{aspect_ratio:'1:1'}]};if(sql.startsWith('SELECT * FROM vv_ai_inspiration WHERE active=true'))return {rows};throw new Error(sql);}};
 const app=express();installInspiration(app,{pool,env:{NODE_ENV:'test',AI_INSPIRATION_ENABLED:'true',ADMIN_EMAIL:'owner@example.test'},auth:(req,_res,next)=>next()});const server=app.listen(0);await new Promise(r=>server.once('listening',r));
 try{const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/inspiration?limit=24&offset=0');assert.equal(r.status,200);const d=await r.json();assert.equal(d.items.length,24);assert.equal(d.pagination.hasMore,true);assert.equal(d.pagination.nextOffset,24);assert.equal(d.pagination.limit,24);}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});

test('public Inspiration manifest order and offset pagination stay stable across repeated requests',async()=>{
 const gallery=await openManifestGallery();
 try{
  const expected=manifestGallery().filter(x=>x.kind==='image')
   .sort((a,b)=>(a.sortOrder||100)-(b.sortOrder||100)).slice(0,8).map(x=>x.slug);
  assert.equal(expected.length,8);
  const load=async offset=>{
   const res=await fetch(gallery.base+'/api/inspiration?kind=image&limit=2&offset='+offset);
   assert.equal(res.status,200);
   return res.json();
  };
  const pages=await Promise.all([load(0),load(2),load(4),load(6)]);
  assert.deepEqual(pages.flatMap(p=>p.items.map(x=>x.slug)),expected);
  assert.equal(new Set(expected).size,8,'no duplicates across offset pages');
  assert.deepEqual(pages.map(p=>p.pagination.nextOffset),[2,4,6,8]);
  assert.deepEqual((await load(2)).items.map(x=>x.slug),expected.slice(2,4));
 }finally{await gallery.close();}
});


test('public Inspiration manifest filters keep category, ratio, featured and query semantics',async()=>{
 const gallery=await openManifestGallery();
 try{
  const manifest=manifestGallery();
  const search='orbital';
  const params=new URLSearchParams({kind:'image',category:'Cinematic',ratio:'1:1',
   target:'studio',featured:'true',q:search});
  const res=await fetch(gallery.base+'/api/inspiration?'+params);
  assert.equal(res.status,200);
  const data=await res.json();
  const expected=manifest.filter(x=>x.kind==='image'&&x.category==='Cinematic'&&
   x.aspectRatio==='1:1'&&x.actionTarget==='studio'&&x.featured&&
   ((x.title||'').toLowerCase().includes(search)||(x.prompt||'').toLowerCase().includes(search)))
   .sort((a,b)=>(a.sortOrder||100)-(b.sortOrder||100));
  assert.deepEqual(data.items.map(x=>x.slug),expected.slice(0,24).map(x=>x.slug));
  assert.deepEqual(data.categories,[...new Set(manifest.map(x=>x.category).filter(Boolean))].sort());
  assert.deepEqual(data.ratios,[...new Set(manifest.map(x=>x.aspectRatio).filter(Boolean))].sort());
  assert.ok(data.items.every(x=>x.kind==='image'&&x.category==='Cinematic'&&x.aspectRatio==='1:1'));
 }finally{await gallery.close();}
});


test('public Inspiration manifest target filter cannot return unrelated studio items as agent results',async()=>{
 const gallery=await openManifestGallery({env:{AI_INSPIRATION_AGENT_TARGETS_ENABLED:'false'}});
 try{
  const res=await fetch(gallery.base+'/api/inspiration?target=agent&kind=image');
  assert.equal(res.status,200);
  const data=await res.json();
  assert.deepEqual(data.items,[]);
  const studio=await (await fetch(gallery.base+'/api/inspiration?target=studio&limit=5')).json();
  assert.ok(studio.items.length>0);
  assert.ok(studio.items.every(x=>x.actionTarget==='studio'));
  assert.ok(gallery.queries.every(q=>!q.sql.startsWith('SELECT * FROM vv_ai_inspiration')),
   'a manifest list request must not use the DB-only agent fallback');
 }finally{await gallery.close();}
});


test('production Inspiration never auto-creates its database table',async()=>{
 const statements=[];
 const pool={async query(sql){statements.push(sql);if(sql.includes("to_regclass('public.vv_ai_inspiration')"))return {rows:[{table_name:null}]};throw Error('UNEXPECTED_SQL');}};
 const app=express();app.use(express.json());installInspiration(app,{pool,env:{NODE_ENV:'production',AI_INSPIRATION_ENABLED:'true',ADMIN_EMAIL:'owner@example.test'},auth:(_req,_res,next)=>next()});
 const listener=app.listen(0);await new Promise(r=>listener.once('listening',r));
 try{
  const r=await fetch('http://127.0.0.1:'+listener.address().port+'/api/inspiration');
  assert.equal(r.status,503);
  assert.equal((await r.json()).error,'INSPIRATION_UNAVAILABLE');
  assert.ok(statements.some(sql=>sql.includes("to_regclass('public.vv_ai_inspiration')")));
  assert.ok(statements.every(sql=>!sql.includes('CREATE TABLE')&&!sql.includes('ALTER TABLE')));
 }finally{listener.closeAllConnections();await new Promise(r=>listener.close(r));}
});


test('public manifest search treats typed percent, underscore and backslash as literal text',async()=>{
 const gallery=await openManifestGallery();
 try{
  const typed='100%_'+String.fromCharCode(92)+'sale';
  const res=await fetch(gallery.base+'/api/inspiration?q='+encodeURIComponent(typed));
  assert.equal(res.status,200);
  const data=await res.json();
  const expected=manifestGallery().filter(x=>String(x.title||'').toLowerCase().includes(typed.toLowerCase())||
   String(x.prompt||'').toLowerCase().includes(typed.toLowerCase()));
  assert.deepEqual(data.items.map(x=>x.slug),expected.slice(0,24).map(x=>x.slug));
  const textRes=await fetch(gallery.base+'/api/inspiration?q='+encodeURIComponent('ORBITAL'));
  assert.equal(textRes.status,200);
  const actual=(await textRes.json()).items;
  assert.ok(actual.length>0,'case-insensitive literal title search returns matching gallery cards');
  assert.ok(actual.every(x=>(x.title||'').toLowerCase().includes('orbital')||(x.prompt||'').toLowerCase().includes('orbital')));
  assert.ok(gallery.queries.every(q=>!q.sql.startsWith('SELECT * FROM vv_ai_inspiration')),
   'manifest text search must never interpolate raw query into SQL');
 }finally{await gallery.close();}
});

