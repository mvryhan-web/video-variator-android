import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const lock=JSON.parse(readFileSync('docs/OWNER_FINAL_PAGE_DESIGN_LOCK.json','utf8'));
for(const [file,hash] of Object.entries(lock.sha256))assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'),hash,file+': owner permission required before changing approved design');
console.log('Owner final Pricing / Video Uniquifier design lock PASS');
