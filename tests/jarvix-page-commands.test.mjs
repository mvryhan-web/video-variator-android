import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveJarvixPageCommand as resolve} from '../app/src/main/assets/jarvix-page-commands.js';
for(const [phrase,target] of [['открой фото','generate-studio.html?studio=image&from=jarvix'],['открой видео','generate-studio.html?studio=video&from=jarvix'],['открой аудио','generate-studio.html?studio=audio&from=jarvix'],['открой канва','canvas.html'],['открой инструменты','free-tools.html'],['открой видео уникализатор','index.html'],['открой прайс','pricing.html'],['ouvre la vidéo','generate-studio.html?studio=video&from=jarvix'],['abre las herramientas','free-tools.html'],['open Canvas','canvas.html']])test(phrase,()=>assert.equal(resolve(phrase),target));
test('a video choice cannot silently open the image studio',()=>assert.match(resolve('видео',true),/studio=video/));
test('creation request does not run navigation or generation',()=>assert.equal(resolve('создай мне видео с котом'),null));
test('navigation is restricted to platform pages, including model-returned destinations',async()=>{
 const {resolveJarvixSiteUrl}=await import('../app/src/main/assets/jarvix-page-commands.js');
 const base='https://deepsyq.app/deepsyq.html';
 for(const url of ['https://outside.example/pricing.html','//outside.example/index.html','javascript:alert(1)','data:text/html,test','/api/config','/media/voice.mp3','https://user:pass@deepsyq.app/index.html',undefined])assert.equal(resolveJarvixSiteUrl(url,base),null);
 assert.equal(resolveJarvixSiteUrl('generate-studio.html?studio=image',base),'/generate-studio.html?studio=image');
 assert.equal(resolveJarvixSiteUrl('#inspirationPreview',base),'/deepsyq.html#inspirationPreview');
});
