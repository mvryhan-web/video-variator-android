import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root));
const source='app/src/main/assets/media/approved-design-20261023/09_Everyday_Tools.png';
const image=read(source);
const js=read('app/src/main/assets/everyday-tools-visual.js').toString();
const css=read('app/src/main/assets/everyday-tools-visual.css').toString();
const owners=read('.github/CODEOWNERS').toString();
const agent=read('AGENTS.md').toString();

test('owner banner: original local art is byte-for-byte unchanged and correctly sized',()=>{
 const gitBlob=createHash('sha1').update('blob '+image.length+'\0').update(image).digest('hex');
 assert.equal(gitBlob,'3e19328f1f3511441899577b878e0955620105f2');
 assert.equal(image.toString('hex',0,8),'89504e470d0a1a0a');
 assert.equal(image.readUInt32BE(16),1448);
 assert.equal(image.readUInt32BE(20),1086);
});
test('owner banner: exact title and subtitle only, original illustration cropped at native scale',()=>{
 assert.match(js,/const asset='media\/approved-design-20261023\/09_Everyday_Tools\.png'/);
 assert.match(js,/heroCopy\.append\(heading,lead\)/);
 assert.match(js,/make\('h1','',\s*'Everyday Tools'\)/);
 assert.match(js,/make\('strong','et-hero-lead','Less routine\. More creating\.'\)/);
 assert.doesNotMatch(js,/Simple, powerful tools to handle your everyday creative tasks\. All in one place\./);
 assert.match(js,/crop\(\[695,61,703,242\],'et-hero-art'\)/);
 assert.match(js,/preserveAspectRatio','xMidYMid meet'/);
 assert.match(js,/const artUrl=new URL\(asset,document\.baseURI\)\.href/);
 assert.match(js,/img\.setAttribute\('href',artUrl\)/);
 assert.match(css,/\.et-hero-art\{right:0;left:auto;top:0;width:min\(58%,703px\);height:100%;object-fit:contain;opacity:1/);
 assert.match(css,/\.et-hero-art\{left:auto;right:0;width:71%;opacity:1\}/);
});
test('owner banner: paths protected by owner review and operating rules',()=>{
 assert.match(owners,/\/app\/src\/main\/assets\/everyday-tools-visual\.js @mvryhan-web/);
 assert.match(owners,/\/app\/src\/main\/assets\/media\/approved-design-20261023\/09_Everyday_Tools\.png @mvryhan-web/);
 assert.match(agent,/OWNER PERMANENT EVERYDAY TOOLS DESIGN FREEZE/);
});
