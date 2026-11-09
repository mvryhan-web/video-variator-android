import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Script } from 'node:vm';

const page = await readFile(new URL('../app/src/main/assets/my-creations.html', import.meta.url),'utf8');
const api = await readFile(new URL('../server/generation-studio.js', import.meta.url),'utf8');
const endpointStart = api.indexOf("app.get('/api/studio/workspace/cards',auth,generationUser");
const endpointEnd = api.indexOf("app.patch('/api/studio/workspace/cards/:id'", endpointStart);
const endpoint = api.slice(endpointStart,endpointEnd);

test('F4: existing authenticated Workspace API and legacy response remain intact', () => {
  assert.ok(endpointStart > 0 && endpointEnd > endpointStart);
  assert.match(endpoint,/app\.get\('\/api\/studio\/workspace\/cards',auth,generationUser/);
  assert.match(endpoint,/Object\.prototype\.hasOwnProperty\.call\(req\.query,'section'\)/);
  assert.match(endpoint,/WHERE user_id=\$1 AND deleted=false/);
  assert.match(endpoint,/\[req\.user\.id,WORKSPACE_SOURCE_LIMIT\+1\]/);
  assert.match(endpoint,/verifiedAccountKey:String\(req\.user\.id\)/);
  assert.match(endpoint,/WORKSPACE_CURSOR_SECRET\|\|env\.APP_JWT_SECRET/);
  assert.match(endpoint,/return res\.json\(paged\)/);
  assert.match(endpoint,/const cards=projectWorkspaceJobView/);
  assert.match(endpoint,/res\.json\(\{\.\.\.sections,metadata:/);
  assert.doesNotMatch(endpoint,/req\.query\.userId|req\.body\.userId/);
  assert.doesNotMatch(endpoint,/\b(?:generateOpenAIImage|dispatchGeneration|stripe\.charges)\s*\(/);
});

test('F4: minimal My Creations load-more is accessible and does not alter surrounding navigation', () => {
  assert.match(page,/<button id="wsLoadMore"[^>]+type="button" hidden>Load more<\/button>/);
  assert.match(page,/\.ws-load-more\[hidden\]\{display:none\}/);
  assert.match(page,/pageStates = Object\.create\(null\)/);
  assert.match(page,/if \(generation !== loadGeneration\) return;/);
  assert.match(page,/if \(section === 'favorites'\) return;/);
  assert.match(page,/if \(cursor\) params\.set\('cursor', cursor\)/);
  assert.match(page,/if \(!response\.ok \|\| !Array\.isArray\(page\.items\) \|\| !page\.pageInfo\)/);
  assert.match(page,/const list = paged\?\.items \|\| lastData\?\.sections\?\.\[activeSection\] \|\| \[\]/);
  assert.match(page,/<a class="ws-header-brand" href="deepsyq.html"/);
  assert.match(page,/<a class="ws-primary" href="generate-studio.html">/);
  assert.match(page,/data-sec="favorites"/);
});

test('F4: original inline client module parses as valid JavaScript', () => {
  const match = page.match(/<script type="module">([\s\S]*?)<\/script>/);
  assert.ok(match && match[1]);
  assert.doesNotThrow(()=>new Script(match[1],{filename:'my-creations.inline.mjs'}));
});
