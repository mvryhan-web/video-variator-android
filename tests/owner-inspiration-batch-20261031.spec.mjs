import {test} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'app/src/main/assets');
test('owner 2026-10-31 approved DEV-preview Inspiration 21 image cards have real local WebP and usable prompts',async()=>{
 const m=JSON.parse(await readFile(path.join(base,'media/inspiration/owner-20261031/manifest.json'),'utf8'));
 assert.equal(m.publishedScope,'isolated_dev_preview_only');
 assert.equal(m.previewPublicationApproved,true);
 assert.equal(m.ownerRequestedPublication,true);
 assert.equal(m.productionPublicationApproved,false);
 assert.equal(m.commercialRightsConfirmed,false);
 assert.equal(m.items.length,21);
 assert.equal(new Set(m.items.map(x=>x.slug)).size,21);
 for(const item of m.items){
  assert.equal(item.kind,'image');assert.equal(item.actionTarget,'studio');assert.equal(item.active,true);
  assert.equal(item.featured,true);assert.ok(item.title.length>6);
  assert.ok(item.prompt.length>80&&item.prompt.length<=4000);
  assert.match(item.previewUrl,/^\/media\/inspiration\/owner-(?:batch2-)?20261031\/[a-z0-9-]+\.webp$/);
  assert.ok(['1:1','4:5','16:9'].includes(item.aspectRatio));
  const bytes=await readFile(path.join(base,item.previewUrl.slice(1)));
  assert.ok(bytes.length>10_000);
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
 }
});
test('DEV preview serves the new owner manifest and Home paginates without affecting hero',async()=>{
 const preview=await readFile(path.join(root,'server/deepsyq-preview.js'),'utf8');
 const home=await readFile(path.join(base,'deepsyq.js'),'utf8');
 assert.match(preview,/ownerInspiration\.items/);
 assert.match(preview,/ownerPreviewReady/);
 assert.match(preview,/q\.offset/);
 assert.match(home,/inspirationFeed\.push/);
 assert.match(home,/limit=48&offset=/);
 assert.match(home,/featured=true&kind=video&target=studio&limit=13/);
});
