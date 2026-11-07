import test from 'node:test';import assert from 'node:assert/strict';import {createSpeechDraft} from '../app/src/main/assets/jarvix-speech-draft.js';
const event=(texts,resultIndex=0)=>({resultIndex,results:texts.map(text=>[{transcript:text}])});
test('interim and repeated final events replace snapshots',()=>{const draft=createSpeechDraft();assert.equal(draft(event(['при'])),'при');assert.equal(draft(event(['привет'])),'привет');assert.equal(draft(event(['привет'])),'привет');});
test('adjacent duplicate Android result slots are collapsed',()=>{const draft=createSpeechDraft();assert.equal(draft(event(['привет',' привет ','ПРИВЕТ','привет'])),'привет');assert.equal(draft(event(['привет','открой видео'],1)),'привет открой видео');});
test('intentional repetition within an utterance and typed base remains',()=>{const draft=createSpeechDraft('привет');assert.equal(draft(event(['привет привет'])),'привет привет привет');});
test('shrinking browser result list removes stale slots',()=>{const draft=createSpeechDraft();draft(event(['привет','видео']));assert.equal(draft(event(['открой фото'])),'открой фото');});
