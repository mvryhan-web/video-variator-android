import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const assets=fileURLToPath(new URL('../app/src/main/assets/',import.meta.url));
const source=name=>readFileSync(join(assets,name),'utf8');
const home=source('deepsyq.html');
const studio=source('generate-studio.js');

function homeNavigationTarget(label){
 const anchor=(home.match(/<a\b[^>]*>/gi)||[]).find(tag=>tag.includes('aria-label="'+label+'"'));
 assert.ok(anchor,'Missing navigation link: '+label);
 const href=anchor.match(/\bhref=(["'])(.*?)\1/i)?.[2];
 assert.ok(href,'Missing href: '+label);
 return href;
}

test('Primary navigation opens modes of the ONE JARVIX Chat',()=>{
 assert.equal(homeNavigationTarget('Image studio'),'jarvix-chat.html?mode=image');
 assert.equal(homeNavigationTarget('Video studio'),'jarvix-chat.html?mode=video');
 assert.equal(homeNavigationTarget('Audio studio'),'jarvix-chat.html?mode=audio');
 assert.match(studio,/requested==='audio'\?'music'/,'Audio URL must select the Music/Audio editor');
});

test('Only Library contains the My Creations entry; the More duplicate is removed',()=>{
 assert.equal(homeNavigationTarget('My Creations'),'my-creations.html');
 assert.equal((home.match(/aria-label="My Creations"/g)||[]).length,1);
 assert.ok(!home.includes('aria-label="History"'),'Remove duplicate under More');
 assert.match(studio,/get\('view'\)==='history'\)setHistory\(true\)/,'Saved Studio history remains functional, without a separate navigation item');
 assert.ok(!home.includes('aria-label="Assets and saved creations"'),'Retired navigation entry must not return');
 assert.ok(!source('deepsyq-site-shell.js').includes("label: 'Assets'"),'Shared sidebar must not display retired navigation');
});

test('Canvas, My Creations and JARVIX links have correct existing destinations',()=>{
 assert.equal(homeNavigationTarget('Canvas'),'canvas.html');
 assert.ok(!home.includes('title="Assets — saved creations"'),'No retired sidebar label or destination remains');
 assert.ok(!home.includes('id="quickCreateForm"'),'Home must not retain Canvas editor');
 assert.ok(source('canvas.html').includes('id="quickCreateForm"'),'Canvas editor must exist on dedicated page');
 assert.ok(!home.includes('id="recentCreations"'),'Removed Home history cards must not be restored');
 assert.equal(homeNavigationTarget('JARVIX'),'jarvix-chat.html','Current published Jarvix destination must exist');
 assert.equal(homeNavigationTarget('My Creations'),'my-creations.html');
 assert.ok(!home.includes('Affiliate program coming soon'),'Retired navigation must be absent');
});

test('Every local HTML anchor links to an existing project asset',()=>{
 const pages=readdirSync(assets).filter(f=>f.endsWith('.html'));
 let checked=0;
 for(const page of pages){
  const html=source(page);
  for(const anchor of html.match(/<a\b[^>]*>/gi)||[]){
   const href=anchor.match(/\bhref=(["'])(.*?)\1/i)?.[2];
   if(!href||/^(?:https?:|\/\/|mailto:|tel:|javascript:|data:)/i.test(href))continue;
   const url=new URL(href,'https://deepsyq.local/'+page);
   if(url.origin!=='https://deepsyq.local')continue;
   const path=decodeURIComponent(url.pathname).slice(1);
   if(!path)continue;
   assert.ok(existsSync(join(assets,path)),page+' has broken destination: '+href);
   checked++;
  }
 }
 assert.ok(checked>=30,'Expected a meaningful set of local links');
});
