import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseScope,validateScope,protectedPath,studioContract,deployContract} from '../scripts/owner-change-scope.mjs';

const dev='a'.repeat(40),head='b'.repeat(40);
const approval='https://github.com/mvryhan-web/video-variator-android/issues/233#issuecomment-6704350487';
const fixture={
 OWNER_REQUEST:'Owner asks to edit one authorized file, issue #233',
 BASE_DEV_SHA:dev,
 PRESERVE:'Existing Studio Settings and unrelated features',
 TESTS:'Desktop and mobile regression and no-spend',
 OWNER_APPROVAL:'NONE',
 paths:['app/src/main/assets/utility.js']
};
const repoRoot=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,repoRoot),'utf8');

test('scope block parses exact files without wildcards',()=>{
 const body=['<!-- OWNER_SCOPE_BEGIN','OWNER_REQUEST: Specific UI action','BASE_DEV_SHA: '+dev,
  'ALLOWED_PATHS:','- app/src/main/assets/utility.js','- tests/utility.test.mjs',
  'PRESERVE: Other pages','TESTS: Browser and node','OWNER_APPROVAL: NONE','OWNER_SCOPE_END -->'].join('\n');
 const x=parseScope(body);
 assert.deepEqual(x.paths,['app/src/main/assets/utility.js','tests/utility.test.mjs']);
 assert.equal(x.BASE_DEV_SHA,dev);
 assert.equal(parseScope('No scope declaration'),null);
});

test('only exact declared changed files are permitted',()=>{
 assert.deepEqual(validateScope(fixture,['app/src/main/assets/utility.js'],dev),[]);
 assert.match(validateScope(fixture,['app/src/main/assets/utility.js','app/src/main/assets/unrelated.css'],dev).join(' '),/Unrequested file changed/);
});

test('wildcards, duplicate entries and stale DEV baseline fail',()=>{
 assert.match(validateScope({...fixture,paths:['app/src/main/assets/*','app/src/main/assets/*']},['app/src/main/assets/test.js'],dev).join(' '),/Invalid|Duplicate|Unrequested/);
 assert.match(validateScope(fixture,['app/src/main/assets/utility.js'],head).join(' '),/Stale/);
});

test('protected UI needs a precise owner comment, not a generic issue or PR',()=>{
 const file='app/src/main/assets/studio-composer-popovers.js';
 assert.equal(protectedPath(file),true);
 assert.match(validateScope({...fixture,paths:[file]},[file],dev).join(' '),/Protected files need/);
 assert.match(validateScope({...fixture,paths:[file],OWNER_APPROVAL:'https://github.com/mvryhan-web/video-variator-android/issues/233'},[file],dev).join(' '),/Protected files need/);
 assert.deepEqual(validateScope({...fixture,paths:[file],OWNER_APPROVAL:approval},[file],dev),[]);
});

test('deploy candidate must equal merged DEV and preserve currently LIVE TEST',()=>{
 assert.deepEqual(deployContract(dev,dev,dev,()=>true),[]);
 assert.match(deployContract(head,dev,dev,()=>true).join(' '),/candidate must equal latest merged/);
 assert.match(deployContract(dev,head,dev,()=>false).join(' '),/TEST has changes not in DEV/);
});

test('current DEV still retains approved Studio Settings composition',()=>{
 const failures=studioContract({
  popovers:read('app/src/main/assets/studio-composer-popovers.js'),
  studio:read('app/src/main/assets/generate-studio.js'),
  css:read('app/src/main/assets/studio-composer-popovers.css'),
  html:read('app/src/main/assets/generate-studio.html')
 });
 assert.deepEqual(failures,[]);
});

test('explicit old auto-close regression is rejected',()=>{
 const s={
  popovers:"hub.id='studioSettingsHub' close.onclick=()=>hub.close() Child dialogs close independently if(!hub.open)hub.showModal() activePanel=hub;activeAnchor=gear; studioSettingsToggle for(const control of [picker,model,format])control.addEventListener('click',()=>hub.close())",
  studio:"'aspect-ratio'",css:'display:block!important',
  html:'studio-composer-popovers.css <script src="studio-composer-popovers.js"></script>'
 };
 assert.match(studioContract(s).join(' '),/illegally closes parent Settings/);
});
