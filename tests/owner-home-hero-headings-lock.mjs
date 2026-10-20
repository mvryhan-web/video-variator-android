import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {OWNER_HOME_HERO_HEADINGS,ownerHomeShowcase} from '../app/src/main/assets/owner-home-hero-headings.js';

// Historical owner baseline: 815f89fffc9312de41796b0a4e90620219bbf1f1.
// This expected array is independent of the manifest and the frontend mapping.
const approved=[
 ['owner-01-close-up-woman','AI Canvas','CREATIVE WORKSPACE'],
 ['owner-02-futuristic-portal','Seedance 2.0','EXPLORE VIDEO MODELS'],
 ['owner-03-underwater-woman','Seedance 2.5','EXPLORE VIDEO MODELS'],
 ['owner-04-neon-motorcycle','Video Studio','CREATE WITH DEEPSYQ'],
 ['owner-05-sky-whale','AI Agent','CREATIVE CO-PILOT · COMING SOON'],
 ['owner-06-golden-forest','Image Studio','CREATE WITH DEEPSYQ']
];

test('owner immutable six headlines and subtitles exactly match historical approval',()=>{
 assert.deepEqual(Object.keys(OWNER_HOME_HERO_HEADINGS),approved.map(x=>x[0]));
 assert.equal(Object.isFrozen(OWNER_HOME_HERO_HEADINGS),true);
 for(const [slug,title,label] of approved){
  assert.deepEqual(OWNER_HOME_HERO_HEADINGS[slug],{title,label});
 }
});

test('owner published manifest retains the six exact names, order, subtitle and destinations',async()=>{
 const f=JSON.parse(await readFile(new URL('../app/src/main/assets/media/home/owner-20261018/manifest.json',import.meta.url)));
 assert.deepEqual(f.carouselOrder,approved.map(x=>x[0]));
 assert.deepEqual(f.items.filter(x=>x.carouselOrder!==null).map(x=>x.slug),approved.map(x=>x[0]));
 for(const [i,entry] of approved.entries()){
  const [slug,title,label]=entry,item=f.items.find(x=>x.slug===slug);
  assert.equal(item.carouselOrder,i+1);
  assert.equal(item.defaultSettings.homeShowcase.title,title);
  assert.equal(item.defaultSettings.homeShowcase.label,label);
  assert.match(item.defaultSettings.homeShowcase.note,/created in Google Flow/);
  assert.equal(item.kind,'video');assert.equal(item.aspectRatio,'16:9');
 }
});

test('stale API labels are overridden, but factual source notes and links stay untouched',()=>{
 for(const [slug,title,label] of approved){
  const item={slug,defaultSettings:{homeShowcase:{
   title:'Sample video, created in Google Flow',label:'FEATURED VIDEO',
   note:'This is a Google Flow sample, not model attribution.',href:'#quickCreateForm'
  }}};
  assert.deepEqual(ownerHomeShowcase(item),{title,label,note:item.defaultSettings.homeShowcase.note,href:'#quickCreateForm'});
  assert.equal(item.defaultSettings.homeShowcase.title,'Sample video, created in Google Flow','do not mutate API data');
 }
 const other={slug:'future-scene',defaultSettings:{homeShowcase:{title:'Future tool',label:'NEW'}}};
 assert.equal(ownerHomeShowcase(other),other.defaultSettings.homeShowcase);
 assert.equal(ownerHomeShowcase(null),undefined);
});
