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

test('Primary navigation opens the named creation studio',()=>{
 assert.equal(homeNavigationTarget('Image studio'),'generate-studio.html?studio=image');
 assert.equal(homeNavigationTarget('Video studio'),'generate-studio.html?studio=video');
 assert.equal(homeNavigationTarget('Audio studio'),'generate-studio.html?studio=audio');
 assert.match(studio,/requested==='audio'\?'music'/,'Audio URL must select the Music/Audio editor');
});

test('History navigation opens saved results, not a Home teaser anchor',()=>{
 assert.equal(homeNavigationTarget('History'),'generate-studio.html?view=history');
 assert.match(studio,/get\('view'\)==='history'\)setHistory\(true\)/,'Studio must honor the history deep link');
});

test('Canvas and local Assets anchors exist, disabled features remain non-links',()=>{
 assert.equal(homeNavigationTarget('Canvas'),'#quickCreateForm');
 assert.equal(homeNavigationTarget('Assets and saved creations'),'#recentCreations');
 for(const id of ['quickCreateForm','recentCreations']){
  assert.ok(home.includes('id="'+id+'"'),'Missing anchor target '+id);
 }
 assert.match(home,/<span class="nav-pending" aria-label="AI Agent coming soon"/);
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
