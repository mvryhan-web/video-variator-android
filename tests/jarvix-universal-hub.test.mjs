import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const src=new URL('../app/src/main/assets/',import.meta.url);
const get=p=>readFile(new URL(p,src),'utf8');
const [home,chat,composer,design,css]=await Promise.all(['deepsyq.html','jarvix-chat.html','jarvix-composer.js','jarvix-composer-design.js','jarvix-chat.css'].map(get));
test('Universal Hub has eight distinct options with NO duplicate Text/Auto/Attach files',()=>{
 for(const html of [home,chat]){
  const menu=html.match(/<div id="jPlusMenu"[^>]*>[\s\S]*?<\/div>/)?.[0]||'';
  assert.match(menu,/class="j-plus-menu j-hub-menu"/);
  assert.equal((menu.match(/class="j-hub-tile"/g)||[]).length,8);
  for(const mode of ['image','video','audio'])assert.match(menu,new RegExp('data-j-mode="'+mode+'"'));
  for(const url of ['free-tools.html','ai-apps.html','deepsyq.html#inspirationPreview','my-creations.html'])assert.ok(menu.includes('href="'+url+'"'),url);
  assert.match(menu,/id="jAttach"/);assert.doesNotMatch(menu,/>Auto<|>Text<|>Attach files</);
 }
});
test('Modes are selected in existing composer; plus stays plus and selection glows in lower rail',()=>{
 assert.match(composer,/sessionStorage\.setItem\('jarvix_composer_mode',mode\)/);
 assert.match(composer,/reportMode\(\)/);
 assert.match(composer,/plus\.textContent='\+'/);
 assert.match(design,/const isQuickChat=\['homeQuickForm','jChatForm','creator'\]\.includes\(form\.id\)/);
 assert.match(design,/activeMode\.hidden=!/);
 assert.match(design,/if\(attach&&!isQuickChat\)/);
 assert.match(design,/if\(imageChoice&&!isQuickChat/);
 assert.match(design,/navItems=isQuickChat\?\[\['JARVIX'/);
 assert.match(design,/j-active-mode/);
 assert.match(css,/\.j-mode-rail \.j-active-mode:not\(\[hidden\]\)/);
});
test('No new website framework, no invented asset page, upload uses original validation and mic/send unchanged',async()=>{
 assert.ok(composer.includes("document.getElementById('jAttach').onclick=()=>fileInput.click()"));
 assert.ok(composer.includes("files=validateAttachments([...files,...fileInput.files])"));
 assert.ok(composer.includes("await voice.stop()"));
 assert.match(home,/href="my-creations\.html"/);
 assert.match(design,/\[data-j-icon\]/);
 assert.ok(!css.includes('.j-mode-rail::after'));
 // The prohibited secondary Image/Video/Audio gear chooser must be absent
 // from Home, JARVIX Chat and native Studio. "+" remains the one mode picker.
 assert.doesNotMatch(design,/jSettingsMenu|j-settings-tile|j-settings-menu/);
 assert.doesNotMatch(design,/if\(isQuickChat&&form\.id!=='homeQuickForm'\)/);
 assert.match(design,/gear\.onclick=settingsTarget/);
 assert.match(composer,/openHomeStudioSettings\(\{gear:form\.querySelector\('\.j-settings-shortcut'\),mode:selected\}\)/);
 assert.doesNotMatch(composer,/location\.assign\('generate-studio\.html/);
 assert.match(composer,/import \{openHomeStudioSettings\} from '\.\/home-studio-settings\.js'/);
 assert.match(composer,/\['image','video','audio'\]\.includes\(mode\)\?mode:'image'/);
 const dock=await get('studio-universal-dock.js');
 assert.doesNotMatch(dock,/jSettingsMenu|j-settings-tile/);
 assert.match(dock,/openRealStudioSettings\?\.call\(gear\)/);
 assert.doesNotMatch(design,/link\.href='generate-studio\.html\?studio='/);
 for(const html of [home,chat])assert.match(html,/class="j-send-plane"/);
 const overlay=await get('home-studio-settings.js');
 assert.match(overlay,/generate-studio\.html/);
 assert.match(overlay,/settings','1'/);
 assert.match(overlay,/studioSettingsHub/);
 assert.match(overlay,/homeStudioSettingsFrame/);
 assert.doesNotMatch(overlay,/\/api\/studio\/jobs|requestSubmit\(|fetch\('/);
});

test('existing My Creations Assets destination tolerates missing optional archived filter',async()=>{
 const s=await get('my-creations.html');
 assert.match(s,/<title>My Creations/);
 assert.match(s,/\$\('includeArchived'\)\?\.addEventListener\('change'/);
 assert.ok(s.includes("'/api/studio/workspace/cards?'"));
});
