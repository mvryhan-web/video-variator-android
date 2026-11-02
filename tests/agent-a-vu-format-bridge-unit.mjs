import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const root=new URL('../app/src/main/assets/',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const ui=read('video-uniquifier-reference.js'),css=read('video-uniquifier-reference.css'),page=read('index.html'),process=read('app-v4.js');
test('real Deepsyq approved logo replaces the temporary star without changing sidebar',()=>{
 assert.ok(existsSync(new URL('deepsyq-logo.png',root)));
 assert.match(ui,/class="vu-logo-image" src="deepsyq-logo\.png"/);
 assert.doesNotMatch(ui,/vu-brandmark">✦/);
 assert.match(css,/\.vu-appbar \.vu-logo \.vu-logo-image/);
});
test('two buttons select the real aspectRatio used by the existing video processor',()=>{
 assert.match(ui,/const ratio=\$\('aspectRatio'\)/);
 assert.match(ui,/\['9:16','9:16','Vertical'\]/);
 assert.match(ui,/\['16:9','16:9','Landscape'\]/);
 assert.match(ui,/ratio\.value=button\.dataset\.ratio/);
 assert.match(ui,/ratio\.dispatchEvent\(new Event\('change',\{bubbles:true\}\)\)/);
 assert.match(ui,/ratio\.addEventListener\('change',refreshFormat\)/);
 assert.match(ui,/setAttribute\('aria-pressed',String\(selected\)\)/);
 assert.match(ui,/params\.after\(formatGroup\)/);
 assert.match(ui,/formatGroup\.after\(preserved\)/);
 assert.equal((page.match(/id="aspectRatio"/g)||[]).length,1);
 assert.match(page,/<option value="9:16" selected>/);
 assert.match(page,/<option value="16:9">/);
});
test('underlying video engine maps actual ratio+quality to real output and invokes core.process',()=>{
 assert.match(process,/function getResolution\(\)\{const a=\$\('aspectRatio'\)\.value,q=\$\('quality'\)\.value/);
 for(const value of ['3840x2160','1920x1080','1280x720','2160x3840','1080x1920','720x1280'])assert.ok(process.includes(value),value);
 assert.match(process,/core\.process\(\{variants:Number\(\$\('variantCount'\)\.value\),mode:\$\('mode'\)\.value,resolution:getResolution\(\)/);
});
test('format is above existing bottom create action, after quality; sidebar left unchanged',()=>{
 assert.match(css,/\.vu-video-format\{[\s\S]*?margin:14px 0 0/);
 assert.match(css,/\.vu-format-button\[aria-pressed="true"\]/);
 assert.match(css,/\.vu-format-options\{[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(ui,/const btn=\$\('startBtn'\)/);
 const patch=css.split('/* Agent A: true Video Uniquifier output-ratio controls')[1];
 assert.ok(patch);
 assert.doesNotMatch(patch,/\.sidebar|\.vu-side-nav|\.vu-top-tools/);
});
