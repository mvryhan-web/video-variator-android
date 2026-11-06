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
 assert.match(creations,/id="wsResultsTitle">Saved Creations/);
 assert.match(creations,/id="wsExploreTitle">Explore what you can create/);
 assert.doesNotMatch(creations,/Private workspace|Show archive|Image · Video · Audio|Nothing is generated automatically|Studio examples — not your saved files/);
 assert.doesNotMatch(creations,/<header class="topbar">/,'Custom header shortcuts must not overlap the shared orb');
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

test('Spring banner uses uploaded owner artwork full width, without duplicate baked-in heading',()=>{
 const path=join(assets,'media/my-creations/spring-hero-20261106.webp');
 assert.ok(existsSync(path),'User-approved hero photo must be committed as an image');
 const bytes=readFileSync(path);
 assert.ok(bytes.length>100000 && bytes.length<600000,'Optimized original photo, no placeholder');
 assert.equal(bytes.subarray(0,4).toString(),'RIFF');
 assert.equal(bytes.subarray(8,12).toString(),'WEBP');
 assert.match(creations,/\.ws-hero\{[^}]*spring-hero-20261106\.webp[^}]*cover no-repeat/);
 assert.match(creations,/\.ws-hero h1,\.ws-hero p\{[^}]*clip-path:inset\(50%\)/);
 assert.match(creations,/id="wsTitle">My Creations/,'Retain a semantic screen-reader heading');
 assert.match(creations,/class="ws-hero-actions"/,'Retain main functional Studio/Explore buttons');
 assert.match(creations,/src="deepsyq-site-shell\.js"/,'The existing shared header and orb are retained');
 assert.doesNotMatch(creations,/<nav class="topbar-nav"/);
});

test('My Creations keeps a full functional top header around the shared centered JARVIX sphere',()=>{
 const core=src('deepsyq-site-shell.js');
 const mobile=src('deepsyq-mobile-shell.js');
 assert.match(creations,/<header class="ws-site-header" aria-label="Deepsyq site header">/);
 assert.match(creations,/<a class="ws-header-brand" href="deepsyq\.html"/);
 assert.match(creations,/<a id="topPricing" href="pricing\.html">Pricing<\/a>/);
 assert.match(creations,/<a id="topLogin" class="ws-header-account" href="deepsyq\.html\?panel=login">Log in<\/a>/);
 assert.match(creations,/\.ws-site-header>\.ds-desktop-actions\{order:2;margin-left:auto/);
 assert.match(core,/const topH = document\.querySelector\('header'\)/,'Shared shell injects one orb into the existing header');
 assert.match(core,/jBtn\.id = 'topJarvisBtn'/,'Keep the original working Jarvis');
 assert.match(mobile,/const tools = link\(copy\(\)\[0\], 'free-tools\.html'/);
 assert.match(mobile,/tour\.addEventListener\('click', async \(\) =>/);
 assert.match(mobile,/const pricing = document\.getElementById\('topPricing'\)/);
 assert.match(mobile,/const login = document\.getElementById\('topLogin'\)/);
 assert.doesNotMatch(creations,/<button id="topJarvisBtn"/,'Never create a second sphere');
 assert.doesNotMatch(creations,/<nav class="topbar-nav"/,'Never restore the overlapping Open Studio shortcut');
 assert.match(creations,/media\/my-creations\/spring-hero-20261106\.webp/,'Preserve approved photo');
 assert.match(creations,/id="wsResultsTitle">Saved Creations/,'Preserve the work library');
});
