import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, readFileSync, rmSync} from 'node:fs';
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
