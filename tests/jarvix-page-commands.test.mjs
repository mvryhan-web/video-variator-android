import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveJarvixPageCommand as resolve} from '../app/src/main/assets/jarvix-page-commands.js';
for(const [phrase,target] of [['открой фото','generate-studio.html?studio=image&from=jarvix'],['открой видео','generate-studio.html?studio=video&from=jarvix'],['открой аудио','generate-studio.html?studio=audio&from=jarvix'],['открой канва','canvas.html'],['открой инструменты','free-tools.html'],['открой видео уникализатор','index.html'],['открой прайс','pricing.html'],['ouvre la vidéo','generate-studio.html?studio=video&from=jarvix'],['abre las herramientas','free-tools.html'],['open Canvas','canvas.html']])test(phrase,()=>assert.equal(resolve(phrase),target));
test('a video choice cannot silently open the image studio',()=>assert.match(resolve('видео',true),/studio=video/));
test('creation request does not run navigation or generation',()=>assert.equal(resolve('создай мне видео с котом'),null));
