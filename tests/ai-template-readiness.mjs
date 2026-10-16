import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeAiTemplateReadiness} from '../app/src/main/assets/ai-template-readiness.js';

test('AI Apps readiness is truthful for an empty catalog and never invents content',()=>{
 const r=summarizeAiTemplateReadiness([]);
 assert.equal(r.total,0);assert.equal(r.active,0);assert.equal(r.actionable,0);
 assert.equal(r.publicEligible,0);assert.equal(r.blockers.length,0);
});
test('owner metadata detects legacy unverified actives and unsupported Studio inputs',()=>{
 const records=[
  {title:'Unverified legacy',active:true,featured:true,generationType:'image',requiredInputTypes:['image'],rightsBasis:null,rightsNote:'',thumbnail:null},
  {title:'Owner photo',active:true,generationType:'image',requiredInputTypes:['image'],rightsBasis:'owned',rightsNote:'Original asset evidence reference',thumbnail:'/assets/owner.webp'},
  {title:'Product campaign',active:true,generationType:'product_video',requiredInputTypes:['logo','product_name'],rightsBasis:'licensed',rightsNote:'Licensed promo package',thumbnail:'/assets/product.webp'},
  {title:'Draft',active:false,generationType:'image',requiredInputTypes:[],rightsBasis:null,rightsNote:'',thumbnail:null},
  {title:'Future avatar',active:true,generationType:'avatar',rightsBasis:'owned',rightsNote:'Original owner avatar',thumbnail:null}
 ];
 const r=summarizeAiTemplateReadiness(records);
 assert.equal(r.total,5);assert.equal(r.active,4);assert.equal(r.drafts,1);
 assert.equal(r.publicEligible,3);assert.equal(r.actionable,1);
 assert.equal(r.missingRights,2);assert.equal(r.noThumbnail,3);
 assert.ok(r.blockers.some(x=>x.includes('Unverified legacy')&&x.includes('public API hides')));
 assert.ok(r.blockers.some(x=>x.includes('Product campaign')&&x.includes('Studio handoff')));
 assert.ok(r.blockers.some(x=>x.includes('Future avatar')));
 assert.ok(!r.blockers.some(x=>x.includes('Owner photo')));
});
test('rights metadata alone is never treated as proof of working provider integration',()=>{
 const r=summarizeAiTemplateReadiness([{title:'Approved prompt',active:true,generationType:'image',requiredInputTypes:[],rightsBasis:'owned',rightsNote:'Internal original copy record'}]);
 assert.equal(r.actionable,1);assert.equal(r.noThumbnail,1);
 assert.equal(r.publicEligible,1);
});
