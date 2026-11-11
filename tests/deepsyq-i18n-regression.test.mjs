import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
const dir='app/src/main/assets';
const js=readFileSync(dir+'/deepsyq-i18n.js','utf8');
test('shared locale bridge syntax and four languages',()=>{
 assert.equal(spawnSync(process.execPath,['--check',dir+'/deepsyq-i18n.js']).status,0);
 for(const locale of ["en","ru","fr","es"]) assert.ok(js.includes("'"+locale+"'"));
 assert.match(js,/deepsyq_home_language/);assert.match(js,/deepsyq_lang/);
 assert.match(js,/MutationObserver/);assert.match(js,/deepsyq:lang/);
});
test('every HTML page loads the single locale bridge',()=>{
 const html=readdirSync(dir).filter(f=>f.endsWith('.html'));
 assert.ok(html.length>=33,'site pages must not silently disappear');
 for(const file of html){
   const content=readFileSync(dir+'/'+file,'utf8');
   assert.ok(content.includes('deepsyq-site-shell.js')||content.includes('deepsyq-i18n.js'),
      file+' is not localized');
 }
});
test('owner-approved plan and checkout values not changed by locale integration',()=>{
 const src=readFileSync(dir+'/pricing-page.js','utf8');
 assert.match(src,/validPlanPrice/);assert.match(src,/validAiPack/);
 assert.match(src,/isValidCheckoutURL/);
});

test('all shared glossary rows contain translations in four languages',()=>{
 const start=js.indexOf('const rows=')+'const rows='.length;
 const end=js.indexOf(';\n const normalize=',start);
 assert.ok(end>start,'localized glossary declaration not found');
 const rows=JSON.parse(js.slice(start,end));
 assert.ok(rows.length>=200,'a large glossary may have been accidentally removed');
 const english=new Set();
 for(const row of rows){
   assert.equal(row.length,4);
   for(const value of row)assert.ok(typeof value==='string'&&value.trim(),'missing language variant');
   assert.ok(!english.has(row[0]),'duplicate English term: '+row[0]);
   english.add(row[0]);
 }
});
test('Spanish localization stays linked to Video Uniquifier and Everyday Tools',()=>{
 const app=readFileSync(dir+'/app-v4.js','utf8');
 const free=readFileSync(dir+'/free-tools.js','utf8');
 assert.match(app,/translations\.es=/);
 assert.match(app,/raw\.startsWith\('es'\)/);
 assert.match(free,/dict\.es=/);
 assert.match(free,/es:\['Texto → MP3/);
});
