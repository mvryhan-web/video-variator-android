import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
const exporter = new URL('./export-safe-index.mjs', import.meta.url).pathname;
const SHA = 'a'.repeat(40);

test('Keeps symbols, excludes raw source, secrets and private paths', () => {
  const dir = mkdtempSync(join(tmpdir(), 'graphify-safe-'));
  try {
    const nodes = Array.from({length:12}, (_,i) => ({
      id:'symbol-'+i, label:i===3?'submitPurchasedProviderRequest':'safeFunction'+i,
      source_file:'server/generation-studio.js', source_location:'L'+(i+10),
      content:'sk_live_SECRET_MUST_NEVER_EXPORT', secret:'GRAPHIFY_SECRET_SENTINEL'
    }));
    nodes.push({id:'bad',label:'secretFn',source_file:'server/customer-data/secret.js',source_location:'L1'});
    nodes.push({id:'env',label:'password',source_file:'.env',source_location:'L1'});
    const raw = join(dir,'graph.json'), out = join(dir,'code-map.md');
    writeFileSync(raw,JSON.stringify({nodes,links:[{source:'symbol-1',target:'symbol-3',relation:'calls'}]}));
    execFileSync(process.execPath,[exporter,raw,SHA,out],{stdio:'pipe'});
    const m = readFileSync(out,'utf8');
    assert.ok(m.includes('submitPurchasedProviderRequest (L13)'));
    assert.ok(m.includes('Source commit:'));
    assert.ok(m.includes('server/generation-studio.js'));
    assert.doesNotMatch(m,/sk_live_|GRAPHIFY_SECRET_SENTINEL|customer-data|\.env|secretFn|password/);
    assert.doesNotMatch(m,/\\"content\\"|\\"nodes\\"|\\"links\\"/);
  } finally { rmSync(dir,{force:true,recursive:true}); }
});

test('Refuses malformed Graphify data or unverifiable SHA',()=>{
  const dir = mkdtempSync(join(tmpdir(),'graphify-fail-'));
  try {
    const f=join(dir,'x.json'),out=join(dir,'output.md');
    writeFileSync(f,JSON.stringify({nodes:[],links:[]}));
    assert.throws(()=>execFileSync(process.execPath,[exporter,f,SHA,out],{stdio:'pipe'}));
    assert.throws(()=>execFileSync(process.execPath,[exporter,f,'latest',out],{stdio:'pipe'}));
  } finally {rmSync(dir,{force:true,recursive:true});}
});

test('Indexes current server, browser and Android code; publishes filenames, never source text', () => {
  const dir = mkdtempSync(join(tmpdir(), 'graphify-platform-'));
  try {
    const assets = join(dir, 'app/src/main/assets');
    const java = join(dir, 'app/src/main/java/com/example');
    mkdirSync(assets, {recursive:true});
    mkdirSync(java, {recursive:true});
    writeFileSync(join(assets, 'jarvix-chat.html'), '<div>PRIVATE_USER_TEXT</div>');
    writeFileSync(join(assets, 'jarvix-chat.css'), 'body{color:red}');
    writeFileSync(join(java, 'MainActivity.java'), 'class MainActivity {}');
    const nodes = [
      ...Array.from({length:10}, (_,i)=>({
        id:'backend-'+i, label:'serverMethod'+i,
        source_file:'server/worker.js',source_location:'L'+(i+1)
      })),
      {id:'web',label:'launchJarvix',source_file:'app/src/main/assets/jarvix-chat.js',source_location:'L4'},
      {id:'android',label:'MainActivity',source_file:'app/src/main/java/com/example/MainActivity.java',source_location:'L1'},
      {id:'excluded',label:'unsafe',source_file:'app/src/main/assets/uploads/secret.js',source_location:'L1'}
    ];
    const graph = join(dir, 'graph.json'), out = join(dir, 'map.md');
    writeFileSync(graph, JSON.stringify({nodes, links:[]}));
    execFileSync(process.execPath, [exporter,graph,SHA,out], {stdio:'pipe',env:{...process.env,GRAPHIFY_REPO_ROOT:dir}});
    const md = readFileSync(out,'utf8');
    const index = JSON.parse(readFileSync(join(dir,'map.json'),'utf8'));
    assert.equal(index.schema,2);
    assert.ok(index.nodes.some(x=>x[0]==='app/src/main/assets/jarvix-chat.js'));
    assert.ok(index.nodes.some(x=>x[0]==='app/src/main/java/com/example/MainActivity.java'));
    assert.ok(index.page_files.includes('app/src/main/assets/jarvix-chat.html'));
    assert.ok(index.style_files.includes('app/src/main/assets/jarvix-chat.css'));
    assert.ok(index.android_files.includes('app/src/main/java/com/example/MainActivity.java'));
    assert.doesNotMatch(md,/PRIVATE_USER_TEXT|body\{color:red\}|uploads\/secret/);
  } finally { rmSync(dir, {recursive:true,force:true}); }
});
