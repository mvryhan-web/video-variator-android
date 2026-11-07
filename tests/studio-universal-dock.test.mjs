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


test('Owner six approved Studio panels reuse six existing native dialogs with premium styling',async()=>{
 const css=await get('studio-premium-panels.css');
 assert.match(dock,/studio-premium-panels\.css/);
 assert.match(dock,/document\.body\.classList\.add\('studio-premium-panels'\)/);
 for(const s of ['#studioSettingsHub','#modelDialog','#settingsDialog',
    '.model-provider-mark','.ratio-choices','.composer-setting-choices','#musicOptions']){
  assert.ok(css.includes(s),'premium existing control '+s);
 }
 assert.match(css,/#ffbf52/); // muted gold accent
 assert.match(css,/#40e6e9/); // turquoise accent
 assert.match(css,/aria-pressed="true"/);
 assert.match(dock,/new MutationObserver\(labelProviders\)/);
 assert.match(dock,/card\.dataset\.modelId/);
 assert.match(dock,/b\.disabled=true/);
 assert.match(dock,/nativeSettings\.dataset\.studioKind!=='video'/);
 assert.match(dock,/for\(const label of \['1:1','2:3','3:2','9:16','16:9'\]\)/);
 assert.match(dock,/extra visual slots mirror Image Settings/);
 assert.doesNotMatch(dock,/\.requestSubmit\(|fetch\(|\/api\/studio\/jobs|\/api\/stripe\//);
 assert.match(studiojs,/for\(const r of m\?\.ratios\|\|\[\]\)/);
 assert.match(studiojs,/\$\('ratio'\)\.value=r/);
 assert.match(pop,/hub\.append\(heading,close,picker,model,format\)/);
});

test('Owner final identity badges distinguish official model names without fake logos',async()=>{
 const css=await get('studio-premium-panels.css');
 for(const [name,code] of [
  ['nano-banana','NB'],['seedream','SR'],['seedance','SE'],
  ['veo','V'],['gpt-image','GPT']
 ]){
  assert.ok(dock.includes("family:'"+name+"'"),'recognized family '+name);
  assert.ok(dock.includes("badge:'"+code), 'short readable badge for '+name);
 }
 assert.match(dock,/model-family text badge, not an official image/);
 assert.match(dock,/modelIdentity===signature/);
 assert.match(css,/white-space:nowrap!important/);
 assert.match(css,/tabular-nums/);
 assert.doesNotMatch(dock,/<img|https:\/\/www\.google|https:\/\/seed\.bytedance/);
});
test('Video ratio grid presents Image-order slots but never enables missing provider ratios',()=>{
 assert.match(dock,/const slots=\['1:1','2:3','3:2','9:16','16:9'\]/);
 assert.match(dock,/const nativeButtons=\[\.\.\.ratioTiles\.querySelectorAll\('button'\)\]/);
 assert.match(dock,/ratioTiles\.append\(button\)/);
 assert.match(dock,/button\.disabled=true/);
 assert.match(dock,/aria-disabled/);
 assert.match(dock,/ratioTiles\.querySelectorAll\('\.premium-unavailable-ratio'\)/);
 assert.match(dock,/недоступно для выбранной модели/);
 assert.doesNotMatch(dock,/new Option\(|\$\('ratio'\)\.value=/);
});
