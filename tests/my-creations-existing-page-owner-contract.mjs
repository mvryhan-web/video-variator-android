import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

const assets=fileURLToPath(new URL('../app/src/main/assets/',import.meta.url));
const src=file=>readFileSync(join(assets,file),'utf8');
const home=src('deepsyq.html');
const nav=src('deepsyq-site-shell.js');
const creations=src('my-creations.html');

test('Library My Creations links directly to existing page, Assets remains unchanged',()=>{
 assert.match(home,/<a href="my-creations\.html" aria-label="My Creations"/);
 assert.match(home,/<a href="generate-studio\.html\?view=history" aria-label="Assets and saved creations"/);
 assert.match(nav, /\{ label: 'My Creations', icon: '▣', url:'my-creations\.html'/);
 assert.match(nav, /path === 'my-creations\.html' \? 'history'/);
 assert.ok(existsSync(join(assets,'my-creations.html')));
 assert.doesNotMatch(home,/aria-label="History"/,'Home More duplicate is retired');
 assert.doesNotMatch(nav,/label: 'History', icon:/,'Shared sidebar More duplicate is retired');
});

test('Existing My Creations retains actual private Workspace API and never invents items',()=>{
 assert.match(creations,/\/api\/studio\/workspace\/cards\?/);
 assert.match(creations,/\/api\/studio\/workspace\/cards\//);
 assert.match(creations,/localStorage\.getItem\('vv_token'\)/);
 assert.match(creations,/data-sec="recent"/);
 assert.match(creations,/data-sec="favorites"/);
 assert.match(creations,/data-sec="completed"/);
 assert.match(creations,/data-sec="drafts"/);
 assert.match(creations,/Sign in to view your creations/);
 assert.match(creations,/Nothing is generated automatically/);
 assert.match(creations,/Studio examples — not your saved files/);
 assert.doesNotMatch(creations,/3,842|54,320|1,276|fake results|sample user creations/i);
 assert.ok(!creations.includes('data-jarvix-chat'),'Library must not turn into another chat');
});

test('Owner retired Affiliate from both live navigation variants without removing general invites',()=>{
 assert.doesNotMatch(home,/Affiliate program coming soon/);
 assert.doesNotMatch(nav,/\baffiliate\b/i);
 assert.match(home,/id="topInvite"/,'Keep unrelated Invite Friend button');
 assert.match(home,/href="pricing.html"/,'Keep Pricing');
});

test('Owner artwork links and verified destination pages exist',()=>{
 for(const file of ['media/home/owner-20261018/01-close-up-woman.jpg','media/home/owner-20261018/02-futuristic-portal.jpg','media/home/neon-20261018/audio.webp','deepsyq-logo.png']){
  assert.ok(existsSync(join(assets,file)),file+' must be existing media');
 }
});
