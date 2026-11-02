import {test} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const assets=path.join(root,'app/src/main/assets');
const mediaDir=path.join(assets,'media/inspiration/owner-next-20261031');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

test('owner next 28 image artworks are individually accessible, valid and have reusable prompts',async()=>{
 const m=JSON.parse(await readFile(path.join(mediaDir,'manifest.json'),'utf8'));
 assert.equal(m.previewPublicationApproved,true);
 assert.equal(m.ownerRequestedPublication,true);
 assert.equal(m.publishedScope,'isolated_dev_preview_only');
 assert.equal(m.productionPublicationApproved,false);
 assert.equal(m.commercialRightsConfirmed,false);
 assert.equal(m.items.length,28);
 assert.equal(new Set(m.items.map(x=>x.slug)).size,28);
 for(const item of m.items){
  assert.equal(item.kind,'image');
  assert.equal(item.actionTarget,'studio');
  assert.equal(item.featured,true);
  assert.equal(item.active,true);
  assert.ok(item.title.length>8);
  assert.ok(item.prompt.length>150&&item.prompt.length<=4000);
  assert.equal(item.promptProvenance,'reconstructed_from_generated_or_owner_resubmitted_visual');
  assert.ok(['16:9','9:16','1:1'].includes(item.aspectRatio));
  assert.match(item.previewUrl,/^\/media\/inspiration\/owner-next-20261031\/[a-z0-9-]+\.webp$/);
  const file=path.join(assets,item.previewUrl.slice(1));
  const bytes=await readFile(file);
  assert.ok(bytes.length>20_000);
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
  assert.equal(sha(bytes),item.sha256);
 }
});

test('existing read-only preview consumes next owner gallery and prompt detail is actually copyable',async()=>{
 const s=await readFile(path.join(root,'server/deepsyq-preview.js'),'utf8');
 const ui=await readFile(path.join(assets,'home-inspiration.js'),'utf8');
 assert.match(s,/owner-next-20261031\/manifest\.json/);
 assert.match(s,/ownerNextPreviewReady/);
 assert.match(s,/ownerNext\.items/);
 assert.match(ui,/Copy prompt/);
 assert.match(ui,/navigator\.clipboard\?\.writeText/);
 assert.match(ui,/document\.execCommand\('copy'\)/);
 assert.match(ui,/copy\.onclick/);
 assert.match(ui,/actions\.append\(clone,use,copy,create\)/);
});
