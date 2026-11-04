import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {SourceTextModule} from 'node:vm';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const defaultRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

// Link without evaluating: catches missing exports and circular import mistakes,
// but never starts browser listeners, a model, a server, or a provider request.
export async function linkModules(root,entry){
 const modules=new Map(),edges=[];
 function load(file){
  const absolute=path.resolve(root,file);
  assert.ok(absolute.startsWith(path.resolve(root)+path.sep),'Module escapes project: '+file);
  if(!modules.has(absolute))modules.set(absolute,new SourceTextModule(readFileSync(absolute,'utf8'),{identifier:absolute}));
  return modules.get(absolute);
 }
 const top=load(entry);
 await top.link((specifier,referrer)=>{
  assert.ok(specifier.startsWith('.'),'Unexpected nonlocal browser import: '+specifier);
  assert.ok(!/[?#]/.test(specifier),'Versioned browser module splits runtime identity: '+specifier);
  const target=path.resolve(path.dirname(referrer.identifier),specifier);
  edges.push({from:path.relative(root,referrer.identifier),to:path.relative(root,target)});
  return load(path.relative(root,target));
 });
 return {modules:modules.size,edges};
}
export function verifyRecordings(root){
 const assets=path.join(root,'app/src/main/assets');
 const manifest=JSON.parse(readFileSync(path.join(assets,'media/jarvix/clips/manifest.json'),'utf8'));
 assert.ok(Array.isArray(manifest.clips)&&manifest.clips.length,'Empty audio manifest');
 const ids=new Set();
 for(const item of manifest.clips){
  assert.match(item.id,new RegExp('^jarvix_'+item.language+'_[0-9]{2}$'));
  assert.ok(['ru','en','fr','es'].includes(item.language),'Unknown locale');
  assert.ok(!ids.has(item.id),'Duplicate clip '+item.id);ids.add(item.id);
  assert.match(item.url,new RegExp('^/media/jarvix/clips/'+item.id+'\\.(mp3|wav)\\?v=[a-f0-9]{12}$'));
  const bytes=readFileSync(path.join(assets,item.url.split('?')[0].slice(1)));
  assert.ok(bytes.length>44,'Empty recording '+item.id);
  const hash=createHash('sha256').update(bytes).digest('hex');
  assert.equal(item.sha256,hash,'Audio bytes changed without matching manifest: '+item.id);
  assert.ok(item.url.endsWith('?v='+hash.slice(0,12)),'Stale audio cache version: '+item.id);
 }
 for(const language of ['ru','en','fr','es'])for(const number of ['37','76'])assert.ok(ids.has('jarvix_'+language+'_'+number),'Missing activation phrase');
 return manifest.clips.length;
}
export function assertAudioOnlyPaths(paths){
 for(const file of paths)assert.match(file,/^app\/src\/main\/assets\/media\/jarvix\/[a-zA-Z0-9_./-]+\.(?:json|mp3|wav)$/,'Audio-only release includes unrelated source: '+file);
}
export async function checkContracts(root=defaultRoot){
 const registry=JSON.parse(readFileSync(path.join(root,'docs/JARVIS_COMPONENTS.json'),'utf8'));
 const ids=new Set(registry.components.map(c=>c.id));
 assert.equal(ids.size,registry.components.length,'Duplicate component');
 for(const component of registry.components){
  for(const dependency of component.dependsOn)assert.ok(ids.has(dependency),'Unknown component '+dependency);
  for(const file of component.files)assert.ok(existsSync(path.join(root,file)),'Component moved without updating tree: '+file);
 }
 for(const test of registry.regressionTests)assert.ok(existsSync(path.join(root,test)),'Missing regression test '+test);
 const graph=await linkModules(root,registry.entry);
 const recordings=verifyRecordings(root);
 return {registry,graph,recordings};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const audioOnly=process.argv.indexOf('--audio-only');
  if(audioOnly!==-1){
   const base=process.argv[audioOnly+1];assert.match(base||'',/^[a-f0-9]{40}$/,'Pass the exact approved base SHA to --audio-only');
   const diff=spawnSync('git',['diff','--name-only',base,'HEAD'],{cwd:defaultRoot,encoding:'utf8'});assert.equal(diff.status,0,diff.stderr);
   assertAudioOnlyPaths(diff.stdout.trim().split('\n').filter(Boolean));
  }
  const result=await checkContracts();
  console.log(`Jarvis contracts PASS: ${result.graph.modules} linked browser modules, ${result.recordings} verified recordings.`);
  if(process.argv.includes('--tree'))console.log(JSON.stringify(result.graph.edges,null,2));
  const child=spawnSync(process.execPath,['--experimental-vm-modules','--test','--test-concurrency=2',...result.registry.regressionTests],{cwd:defaultRoot,stdio:'inherit'});
  process.exitCode=child.status??1;
 }catch(error){console.error('Jarvis stability gate FAILED:',error.message);process.exitCode=1;}
}
