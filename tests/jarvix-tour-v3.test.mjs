import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tourV3Plan,tourV3AllPhrases,TOUR_V3_DATA} from '../app/src/main/assets/jarvix-tour-v3-script.js';

const root=new URL('../app/src/main/assets/',import.meta.url);
const file=path=>readFileSync(new URL(path,root));
const source=path=>file(path).toString('utf8');
const manifest=JSON.parse(source('media/jarvix/tour-v3/manifest.json'));

test('Tour V3 retains 19 safe stages, one action per spoken beat, four languages',()=>{
 const routes=['Home','Image','Video','Audio','AI Apps','Canvas','Tools','Compress photos','Trim video','Trim audio','Video Uniquifier','Inspiration','Pricing','trial','basic','pro','business','lifetime','Home'];
 assert.equal(TOUR_V3_DATA.length,19);
 for(const lang of ['ru','en','fr','es']){
  const plan=tourV3Plan(lang);
  assert.deepEqual(plan.map(p=>p.title),routes);
  assert.ok(plan.every(p=>p.narration==='v3'));
  for(const step of plan){
   assert.ok(step.url&&!/^https?:/i.test(step.url));
   assert.ok(step.beats.length>0);
   for(const beat of step.beats){
    assert.ok(beat.text.trim().length>3&&beat.text.length<=300);
    assert.ok(beat.target.length>1);
    assert.ok(['focus','openModel','openSettings','closeSettings'].includes(beat.action));
    assert.doesNotMatch(beat.action,/submit|checkout|generate|upload|pay|consent/i);
   }
  }
  assert.equal(plan[0].navText,null);
  assert.ok(plan[1].navText?.trim());
 }
 assert.equal(tourV3Plan('ru')[0].beats[0].text,'Привет! Я JARVIX. Смотрите, что я умею.');
 assert.equal(tourV3Plan('ru')[1].navText,'Изображения.');
});

test('All 192 owner WAV-derived MP3 clips match the approved speech texts and checksums',()=>{
 assert.equal(manifest.schemaVersion,'jarvix-tour-v3-audio/v1');
 assert.equal(manifest.engine,'VoxCPM2');
 assert.equal(manifest.format,'mp3');
 assert.equal(manifest.previewApproved,true);
 // Approved to run on TEST, not a claim that every line was listened to.
 assert.equal(manifest.reviewed,false);
 assert.equal(manifest.clips.length,192);
 const expected=tourV3AllPhrases();
 assert.equal(expected.length,192);
 const key=(lang,text)=>lang+'\u0000'+text.normalize('NFC').trim().replace(/\s+/g,' ');
 const fromScript=new Set(expected.map(x=>key(x.language,x.text)));
 const actual=new Set(manifest.clips.map(x=>key(x.language,x.text)));
 assert.equal(actual.size,192);
 assert.deepEqual(actual,fromScript);
 for(const lang of ['ru','en','fr','es']) assert.equal(manifest.clips.filter(x=>x.language===lang).length,48);
 for(const clip of manifest.clips){
  assert.match(clip.filename,/^t3_(ru|en|fr|es)_[0-9a-f]{12}\.mp3$/);
  assert.equal(clip.reviewed,false);
  const bytes=file('media/jarvix/tour-v3/'+clip.filename);
  assert.ok(bytes.length>300,clip.filename);
  assert.ok(bytes.subarray(0,3).toString()==='ID3'||bytes[0]===255,clip.filename);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),clip.sha256,clip.filename);
 }
});

test('Tour V3 uses pre-recorded owner voice, no browser speech and no on-screen captions',()=>{
 const loader=source('jarvix-tour-v3-audio.js');
 const guide=source('jarvix-guided-tour.js');
 assert.ok(loader.includes('manifest.previewApproved!==true'));
 assert.ok(loader.includes("manifest?.engine!=='VoxCPM2'"));
 assert.ok(loader.includes('t3_'));
 assert.ok(guide.includes('getTourV3Recording'));
 assert.ok(guide.includes('function playV3('));
 assert.ok(guide.includes('if(step.narration===\'v3\')'));
 assert.ok(guide.includes('speakOwnerSpeech(text,state.language'));
 assert.ok(!guide.includes('speechSynthesis.speak'));
 assert.ok(!guide.includes('<span class="ds-tour-caption"'));
 assert.ok(!guide.includes('<span class="ds-tour-label"'));
});

test('Central JARVIX voice catalog inventories both packs without overwriting legacy recordings',()=>{
 const index=JSON.parse(source('media/jarvix/voice-library.json'));
 const original=JSON.parse(source('media/jarvix/clips/manifest.json'));
 assert.equal(index.schemaVersion,'jarvix-voice-library/v1');
 assert.equal(index.engine,'VoxCPM2');
 assert.equal(index.totalRecordedClips,536);
 assert.deepEqual(index.collections.map(c=>c.count),[344,192]);
 // The original indexed 344 recordings remain a protected subset.
 // The owner's newer local voice library expanded the clips manifest to 1900
 // recordings. This tour regression must not reject legitimate additions.
 assert.ok(original.expected>=344);
 assert.equal(original.ready,original.expected);
 assert.equal(original.clips.length,original.expected);
 assert.equal(manifest.clips.length,192);
 assert.deepEqual(index.collections.map(c=>c.manifest),['clips/manifest.json','tour-v3/manifest.json']);
});
