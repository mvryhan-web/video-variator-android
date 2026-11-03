import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../app/src/main/assets/',import.meta.url);
const html=readFileSync(new URL('deepsyq.html',root),'utf8');
const script=readFileSync(new URL('home-experience.js',root),'utf8');
test('Home media budget: no MP4 source on neighbor or spotlight video until play/visibility',()=>{
 for(const id of ['homeHeroPreviousVideo','homeHeroNextVideo'])assert.match(html,new RegExp('<video id="'+id+'"[^>]*preload="none"'));
 for(const name of ['canvas-card','agent-card','apps-card']){
  assert.match(html,new RegExp('data-src="media/home/neon-20261018/'+name+'\\.mp4"[^>]*preload="none"'));
  assert.doesNotMatch(html,new RegExp('<video[^>]*src="media/home/neon-20261018/'+name+'\\.mp4"'));
 }
 assert.match(script,/function updateNeighbors\(\)/);
 assert.doesNotMatch(script,/v\.src=item\.previewUrl/,'never attach MP4 sources to neighboring films');
 assert.match(script,/v\.poster=item\.previewPosterUrl/);
 assert.match(script,/function ensureSelectedVideoSource\(\)/);
 assert.match(script,/if\(!ambientAllowed\(\)\|\|!ensureSelectedVideoSource\(\)\)return/);
 assert.match(script,/spotlightVideos\.find\(v=>v\.__spotlightVisible\)/);
 assert.match(script,/const active=allowed\?/);
 assert.match(script,/if\(active\)pauseFilms\(\)/);
});
