import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const assets=new URL('../app/src/main/assets/',import.meta.url);
const get=f=>readFile(new URL(f,assets),'utf8');
const [html,pop,dock,style,decorator,studiojs]=await Promise.all(
 ['generate-studio.html','studio-composer-popovers.js','studio-universal-dock.js','jarvix-chat.css','jarvix-composer-design.js','generate-studio.js'].map(get)
);
test('All three Studio URLs are same existing studio, and original provider-backed controls remain',()=>{
 for(const id of ['creator','prompt','generate','references','studioVoiceBtn','modelButton','settingsButton','settingsDialog','modelDialog','consent'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/href="jarvix-chat.css"/);
 assert.match(pop,/decorateComposer\(\$\('creator'\)\);mountStudioUniversalDock\(/);
 assert.match(dock,/prompt\.setAttribute\('form','creator'\)/);
 assert.match(dock,/submit\.setAttribute\('form','creator'\)/);
 assert.match(dock,/submit\.replaceChildren\(\)/);
 assert.match(dock,/bar\.append\(plus,menu,prompt,mic,gear,submit\)/);
 assert.doesNotMatch(dock,/jSettingsMenu|j-settings-tile/);
 assert.match(studiojs,/\$\('creator'\)\.onsubmit=async e=>/);
 assert.match(studiojs,/\/api\/studio\/estimate/);
 assert.match(studiojs,/original\.consent/);
});
test('Owner Universal Hub is same 8-tile 4x2 menu, one visual dock only',()=>{
 for(const label of ['Image','Video','Audio','Tools','AI Apps','Inspiration','Upload','Assets'])assert.ok(dock.includes("name:'"+label+"'"),label);
 assert.match(dock,/const actions=\[/);
 assert.match(dock,/dock\.append\(bar,rail\)/);
 assert.match(dock,/document\.body\.append\(dock\)/);
 assert.match(dock,/closeMenu\(\)/);
 assert.match(dock,/const selectNative=mode=>/);
 assert.match(dock,/real\.click\(\)/);
 assert.match(style,/#studioUniversalDock\.j-neon-dock/);
 assert.match(style,/#studioDockControls\.jarvix-compose\.j-neon-composer/);
});
test('Mode selection stays in page, real Studio Settings Hub remains authoritative',()=>{
 assert.match(decorator,/isQuickChat=\['homeQuickForm','jChatForm','creator'\]/);
 assert.doesNotMatch(decorator,/jSettingsMenu|j-settings-tile|choice\.onclick/);
 assert.match(decorator,/gear\.onclick=settingsTarget/);
 assert.doesNotMatch(decorator,/link\.href='generate-studio\.html\?studio='\+kind/);
 assert.match(dock,/openRealStudioSettings\?\.call\(gear\)/);
 assert.match(dock,/sessionStorage\.setItem\('jarvix_composer_mode',mode\)/);
 assert.match(dock,/form\.dispatchEvent\(new CustomEvent\('jarvix:mode'/);
 assert.match(pop,/hub\.append\(heading,close,picker,model,format\)/);
});
test('Files and consent are never bypassed, no new paid API or unsupported media provider calls',()=>{
 assert.match(dock,/references\.click\(\)/);
 assert.match(dock,/does not support reference uploads/);
 assert.doesNotMatch(dock,/api\.openai\.com|stripe|\/api\/studio\/jobs|fetch\(/);
 assert.match(dock,/submit\.setAttribute\('form','creator'\)/);
 assert.match(studiojs,/quote\.credits/);
 assert.match(studiojs,/confirm\(freePreview/);
 assert.doesNotMatch(dock,/\.requestSubmit\(/);
});
