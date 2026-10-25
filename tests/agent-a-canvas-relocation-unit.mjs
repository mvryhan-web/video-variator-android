import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const base=new URL('../app/src/main/assets/',import.meta.url);
const read=name=>readFileSync(new URL(name,base),'utf8');
const home=read('deepsyq.html'),canvas=read('canvas.html'),editor=read('canvas-editor.js'),shell=read('deepsyq-site-shell.js');
const section=home.split('<section id="canvasFeature"')[1]?.split('<section id="agentFeature"')[0];
test('Home Canvas contains only one Canvas heading and nine real pictures',()=>{
 assert.ok(section,'Home Canvas missing');
 assert.match(section,/<h2 id="canvasFeatureTitle">Canvas<\/h2>/);
 assert.equal((section.match(/class="canvas-example"/g)||[]).length,9);
 assert.equal((section.match(/<img /g)||[]).length,9);
 assert.ok(!/quickCreateForm|Start with your idea|One idea|creative workspace|Need a starting idea|canvas-workflow/.test(section));
 assert.match(home,/href="canvas-home-compact\.css"/);
});
test('Each Home image opens the dedicated Canvas page with its own example',()=>{
 const urls=[...section.matchAll(/href="(canvas\.html\?example=[^"]+)"/g)].map(m=>m[1]);
 assert.equal(urls.length,9);assert.equal(new Set(urls).size,9);
 for(const path of urls)assert.ok(new URL(path,'https://site.invalid/').searchParams.get('example')?.startsWith('creative50-'));
});
test('Canvas page retains 9 images and all original working editor controls',()=>{
 for(const id of ['canvasFeature','canvasExampleGrid','quickCreateForm','quickCreatePrompt','quickCreateKind','quickCreateSubmit','quickCreateClear','quickCreateFiles','quickCreateRatio','quickCreatePreviews','quickCreateDropzone','quickCreateStatus']){
  assert.ok(canvas.includes('id="'+id+'"'),id+' missing');
 }
 assert.equal((canvas.match(/data-creative-example=/g)||[]).length,9);
 assert.ok(!home.includes('id="quickCreateForm"'));
 assert.ok(editor.includes('saveStudioHandoff('));
 assert.ok(editor.includes('guardQuickDraftAccount'));
 assert.ok(editor.includes('CREATIVE_EXAMPLES.find('));
 assert.ok(existsSync(new URL('canvas-page.css',base)));
});
test('Home, site sidebar and AI Apps links open the real Canvas page',()=>{
 assert.match(home,/href="canvas\.html" aria-label="Canvas"/);
 assert.match(shell,/url:'canvas\.html'/);
 assert.match(read('ai-apps.html'),/href="canvas\.html"/);
 assert.match(read('home-experience.js'),/href=destinations\.includes\(destination\)/);
});
