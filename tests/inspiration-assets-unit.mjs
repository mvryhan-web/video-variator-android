import test from 'node:test';
import assert from 'node:assert/strict';
import {access,readFile} from 'node:fs/promises';

const assets=[
 'editorial-orbit.svg',
 'product-mint.svg',
 'fashion-night.svg',
 'food-still.svg',
 'cinematic-poster.svg',
 'social-poster.svg'
];

test('Block 3 ships only local original seed preview assets',async()=>{
 const sql=await readFile(new URL('../server/migrations/20261015-ai-inspiration.sql',import.meta.url),'utf8');
 assert.match(sql,/Original Deepsyq Block 3 concept media/);
 assert.doesNotMatch(sql,/https?:\/\/[^\s'\"]*(?:byteplus|lumina)/i);
 for(const file of assets){
  await access(new URL('../app/src/main/assets/inspiration/'+file,import.meta.url));
  assert.ok(sql.includes('/inspiration/'+file),file+' must be referenced by a seed row');
 }
 assert.ok((sql.match(/'owned'/g)||[]).length>=6);
 assert.ok((sql.match(/TRUE,TRUE/g)||[]).length>=4);
});
