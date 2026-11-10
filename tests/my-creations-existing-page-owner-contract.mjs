import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

const assets=fileURLToPath(new URL('../app/src/main/assets/',import.meta.url));
const src=file=>readFileSync(join(assets,file),'utf8');
const home=src('deepsyq.html');
const nav=src('deepsyq-site-shell.js');
const page=src('my-creations.html');
const ui=src('my-creations-gallery.js');
const style=src('my-creations-gallery.css');

test('The original My Creations route remains; no extra Assets or duplicate chat pages',()=>{
 assert.match(home,/<a href="my-creations\.html" aria-label="My Creations"/);
 assert.match(nav,/\{ label: 'My Creations', icon: '▣', url:'my-creations\.html'/);
 assert.doesNotMatch(nav,/label: 'Assets'/);
 assert.doesNotMatch(home,/aria-label="History"/);
 assert.doesNotMatch(page,/data-jarvix-chat/);
 assert.ok(existsSync(join(assets,'my-creations.html')));
});

test('Only this existing page gets the reference gallery layout with Audio replacing Failed',()=>{
 assert.match(page,/id="mcGrid" class="mc-grid"/);
 assert.match(page,/id="mcDetail" class="mc-detail"/);
 assert.match(page,/data-filter="all"/);
 assert.match(page,/data-filter="image"/);
 assert.match(page,/data-filter="video"/);
 assert.match(page,/data-filter="audio"/);
 assert.match(page,/data-filter="processing"/);
 assert.doesNotMatch(page,/data-filter="failed"/);
 assert.match(page,/href="my-creations-gallery\.css"/);
 assert.match(page,/src="my-creations-gallery\.js"/);
 assert.match(style,/\.mc-grid\{display:grid;grid-template-columns:repeat\(6/);
 assert.match(style,/\.mc-shell\{display:grid/);
 assert.match(style,/@media\(max-width:600px\)/);
 assert.match(page,/id="mcDownload"/);
 assert.match(page,/id="mcShare"/);
 assert.match(page,/id="mcReference"/);
 assert.match(page,/id="mcRemove"/);
});

test('Existing personal Workspace API remains the only user-creation source',()=>{
 assert.match(ui,/\/api\/studio\/workspace\/cards\?/);
 assert.match(ui,/\/api\/studio\/workspace\/cards\//);
 assert.match(ui,/localStorage\.getItem\('vv_token'\)/);
 assert.match(ui,/json\.sections\?\.recent/);
 assert.match(ui,/kind:'own'/);
 assert.match(ui,/kind:'sample'/);
 assert.match(ui,/state\.userItems/);
 assert.doesNotMatch(ui,/\/api\/public\/users\/creations/);
 assert.match(ui,/action:'favorite'/);
 assert.match(ui,/action:'archive'/);
 assert.doesNotMatch(ui,/action:'delete'/);
});

test('Sample artwork is explicitly an example and image source already exists in the repository',()=>{
 assert.ok(existsSync(join(assets,'media/approved-design-20261023/08_My_Creations.png')));
 assert.match(ui,/sourceArt = 'media\/approved-design-20261023\/08_My_Creations\.png'/);
 assert.equal((ui.match(/crop:\[/g)||[]).length,8);
 for(const name of ['Crystal Bloom','Eclipse Portal','Velvet Rain','Bioluminescent Tide','Skyward Citadel','Porcelain Grace','Neon Rider','Sculpted Sound'])assert.ok(ui.includes(name),name);
 assert.match(ui,/Sample collection/);
 assert.match(page,/other users' private work is not published here/);
 assert.ok(existsSync(join(assets,'media/my-creations/spring-hero-20261106.webp')),'Older artwork was not deleted');
});

test('Global site header and orb remain controlled by the original shared scripts',()=>{
 assert.match(page,/<header class="ws-site-header" aria-label="Deepsyq site header">/);
 assert.match(page,/<a class="ws-header-brand" href="deepsyq\.html"/);
 assert.match(page,/<a id="topPricing" href="pricing\.html">Pricing<\/a>/);
 assert.match(page,/<a id="topLogin" class="ws-header-account" href="deepsyq\.html\?panel=login">Log in<\/a>/);
 assert.match(page,/src="deepsyq-site-shell\.js"/);
 assert.match(page,/src="deepsyq-mobile-shell\.js"/);
 assert.doesNotMatch(page,/<button id="topJarvisBtn"/);
 assert.doesNotMatch(nav,/\baffiliate\b/i);
 assert.match(home,/id="topInvite"/);
});

test('All new interactions exist without uploading personal work to a public feed',()=>{
 for(const action of ['mcDownload','mcShare','mcReference','mcRemove','mcCopyPrompt','mcDetailClose'])assert.match(ui,new RegExp(action));
 assert.match(ui,/navigator\.share/);
 assert.match(ui,/navigator\.clipboard\.writeText/);
 assert.match(ui,/state\.showcaseFav/);
 assert.match(ui,/state\.hiddenSamples/);
 assert.match(ui,/fetchMyCards/);
});
