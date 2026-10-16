import test from 'node:test';
import assert from 'node:assert/strict';
import {authorizedOnboardingOptions,onboardingResponseTarget} from '../app/src/main/assets/onboarding-options.js';

const known=[
 {id:'image',target:'/generate-studio.html?studio=image'},
 {id:'video',target:'/generate-studio.html?studio=video'},
 {id:'product_ads',target:'/product-video.html'},
 {id:'avatar',target:'/avatar-studio.html'}
];

test('BASE 45: the current backend still authorizes only its two persisted choices',()=>{
 const options=authorizedOnboardingOptions(known.slice(0,2));
 assert.deepEqual(options.map(x=>x.id),['image','video']);
 assert.ok(!options.some(x=>x.id==='avatar'||x.id==='product_ads'));
});

test('BASE 45: all four future workflows are valid only when the backend explicitly advertises exact routes',()=>{
 const options=authorizedOnboardingOptions(known);
 assert.deepEqual(options.map(x=>x.id),['image','video','product_ads','avatar']);
 assert.equal(onboardingResponseTarget({ok:true,goal:'avatar',target:'/avatar-studio.html'},'avatar',options),'/avatar-studio.html');
 assert.equal(onboardingResponseTarget({ok:true,goal:'product_ads',target:'/product-video.html'},'product_ads',options),'/product-video.html');
});

test('BASE 45: forged, external and duplicate options cannot open an unauthorized flow',()=>{
 const options=authorizedOnboardingOptions([
  ...known,
  {id:'avatar',target:'https://attacker.example/collect'},
  {id:'other',target:'/secret'},
  {id:'image',target:'//attacker.example/'},
  {id:'__proto__',target:'/anything'},
  {id:'avatar',target:'/wrong-route'}
 ]);
 assert.equal(options.length,4);
 assert.equal(authorizedOnboardingOptions(null).length,0);
 assert.equal(onboardingResponseTarget({ok:true,goal:'image',target:'https://attacker.example'},'image',options),null);
 assert.equal(onboardingResponseTarget({ok:true,goal:'avatar',target:'/product-video.html'},'avatar',options),null);
 assert.equal(onboardingResponseTarget({ok:false,goal:'avatar',target:'/avatar-studio.html'},'avatar',options),null);
 assert.equal(onboardingResponseTarget({ok:true,goal:'avatar',target:'/avatar-studio.html'},'image',options),null);
});
