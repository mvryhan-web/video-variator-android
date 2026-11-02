import test from 'node:test';
import assert from 'node:assert/strict';
import {authorizedOnboardingOptions,onboardingResponseTarget} from '../app/src/main/assets/onboarding-options.js';

const known=[
 {id:'image',target:'/generate-studio.html?studio=image'},
 {id:'video',target:'/generate-studio.html?studio=video'},
 {id:'avatar',target:'/avatar-studio.html'}
];

test('BASE 45: server-advertised Image and Video goals retain exact safe routes',()=>{
 const options=authorizedOnboardingOptions(known.slice(0,2));
 assert.deepEqual(options.map(x=>x.id),['image','video']);
});
test('BASE 45: authorized Avatar keeps its existing workflow without a product option',()=>{
 const options=authorizedOnboardingOptions(known);
 assert.deepEqual(options.map(x=>x.id),['image','video','avatar']);
 assert.equal(onboardingResponseTarget({ok:true,goal:'avatar',target:'/avatar-studio.html'},'avatar',options),'/avatar-studio.html');
});
test('BASE 45: cancelled product goal is never authorized even if an API advertises it',()=>{
 const choices=authorizedOnboardingOptions([...known,{id:'product_ads',target:'/product-video.html'}]);
 assert.deepEqual(choices.map(x=>x.id),['image','video','avatar']);
});
test('BASE 45: forged, external and duplicate options cannot open an unauthorized flow',()=>{
 const options=authorizedOnboardingOptions([
  ...known,
  {id:'product_ads',target:'/product-video.html'},
  {id:'avatar',target:'https://attacker.example/collect'},
  {id:'other',target:'/secret'},
  {id:'image',target:'//attacker.example/'},
  {id:'__proto__',target:'/anything'},
  {id:'avatar',target:'/wrong-route'}
 ]);
 assert.equal(options.length,3);
 assert.equal(authorizedOnboardingOptions(null).length,0);
 assert.equal(onboardingResponseTarget({ok:true,goal:'image',target:'https://attacker.example'},'image',options),null);
 assert.equal(onboardingResponseTarget({ok:true,goal:'product_ads',target:'/product-video.html'},'product_ads',options),null);
 assert.equal(onboardingResponseTarget({ok:false,goal:'avatar',target:'/avatar-studio.html'},'avatar',options),null);
 assert.equal(onboardingResponseTarget({ok:true,goal:'avatar',target:'/avatar-studio.html'},'image',options),null);
});
