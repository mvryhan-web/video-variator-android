import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {WATCHER_INTERVAL_MS} from '../server/product-watcher/scheduler.js';
import {OFFICIAL_SOURCES,OFFICIAL_SOURCE_INTERVAL_MS,OFFICIAL_SOURCE_MAX_BYTES} from '../server/product-watcher/official-sources.js';

const repoRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const dir=resolve(repoRoot,'server/product-watcher');
const modules=readdirSync(dir).filter(p=>p.endsWith('.js'));
const load=(p)=>readFileSync(resolve(repoRoot,p),'utf8');

test('Watcher cannot import customer tools, AI provider clients, wallets or paid billing actions',()=>{
 const allowedParent={
  'admin-api.js':['../admin-audit.js'],
  'worker.js':['../db.js'],
  'run-once.js':['../db.js'],
  // Read-only catalog/config inspection, never handler execution:
  'webhook-config.js':['../generation-billing.js']
 };
 for(const name of modules){
  const code=load('server/product-watcher/'+name);
  const imports=[...code.matchAll(/\bfrom\s+['"]([^'"]+)['"]|\bimport\s*['"]([^'"]+)['"]/g)]
    .map(m=>m[1]||m[2]);
  for(const target of imports){
   if(target.startsWith('../'))assert.ok((allowedParent[name]||[]).includes(target),name+' unexpected parent import: '+target);
   assert.doesNotMatch(target,/stripe|wallet|provider-router|generation-jobs|user-agent|agent-orchestrator/i,
     name+' must not import shared paid/cost-bearing execution');
  }
 }
});

test('Watcher SQL writes stay in separate watcher queue/report tables or the shared owner audit',()=>{
 let writes=0;
 for(const name of modules){
  const code=load('server/product-watcher/'+name);
  // Catch direct SQL writes; refactors to composed SQL require manual PR review.
  for(const match of code.matchAll(/\b(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|TRUNCATE(?:\s+TABLE)?|DROP\s+TABLE|ALTER\s+TABLE)\s+(vv_[a-z_]+)/gi)){
   writes++;
   const table=match[1].toLowerCase();
   assert.ok(table.startsWith('vv_product_watcher_')||table==='vv_admin_audit',
     name+' must not write to customer jobs, wallet, payments or main content: '+table);
  }
 }
 assert.ok(writes>=5,'guard must examine actual Watcher table modifications');
});

test('no paid provider origin and operationally bounded separate scheduling/notification budget',()=>{
 assert.ok(modules.length>=10,'isolation scan must cover entire Watcher folder');
 assert.ok(WATCHER_INTERVAL_MS>=15*60*1000);
 assert.ok(OFFICIAL_SOURCE_INTERVAL_MS>=6*60*60*1000);
 assert.ok(OFFICIAL_SOURCE_MAX_BYTES<=1024*1024);
 // Seven pinned public docs at most; this bounds worst-case download volume to 7 MiB / six hours.
 assert.ok(OFFICIAL_SOURCES.length>0 && OFFICIAL_SOURCES.length<=7);
 assert.ok(OFFICIAL_SOURCES.length*OFFICIAL_SOURCE_MAX_BYTES<=7*1024*1024);
 assert.equal(new Set(OFFICIAL_SOURCES.map(s=>s.key)).size,OFFICIAL_SOURCES.length);
 for(const source of OFFICIAL_SOURCES){
  const host=new URL(source.url).hostname;
  assert.ok(['docs.byteplus.com','ai.google.dev','developers.openai.com'].includes(host));
 }
 const telegram=load('server/product-watcher/telegram-alerts.js');
 assert.match(telegram,/LIMIT 3/,'each tick limits non-billable owner notifications');
 assert.match(telegram,/PRODUCT_WATCHER_TELEGRAM_ALERTS_ENABLED/);
 assert.match(telegram,/vv_product_watcher_notifications/);
 const worker=load('server/product-watcher/worker.js');
 assert.match(worker,/PRODUCT_WATCHER_ENABLED/);
 assert.match(worker,/PRODUCT_WATCHER_SCHEDULER_ENABLED/);
 assert.doesNotMatch(worker,/stripe\.com|api\.openai\.com|generativelanguage\.googleapis\.com/i);
});
