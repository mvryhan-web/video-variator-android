import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareTemplatePrompt,templateSupport} from '../app/src/main/assets/ai-template-product-name.js';

const product={title:'Product video',generationType:'product_video',requiredInputTypes:['image','product_name'],promptTemplate:'Show {{product_name}} in a premium product video. End with {{ product_name }} in a title card.'};

test('personalized product name is substituted locally for every supported placeholder',()=>{
 const support=templateSupport(product);
 assert.equal(support.supported,true);
 assert.equal(support.requiresProductName,true);
 assert.equal(prepareTemplatePrompt(product,'  Velvet   Tote '),'Show Velvet Tote in a premium product video. End with Velvet Tote in a title card.');
});
test('empty, overlong and excessively large personalized prompts never reach Studio',()=>{
 assert.throws(()=>prepareTemplatePrompt(product,'   '),/Enter your product name/);
 assert.throws(()=>prepareTemplatePrompt(product,'x'.repeat(81)),/80 characters/);
 const cannotFit={...product,promptTemplate:'x'.repeat(2000)+' {{product_name}}'};
 assert.equal(templateSupport(cannotFit).supported,false);
 assert.throws(()=>prepareTemplatePrompt(cannotFit,'Bag'),/not ready for Studio/);
});
test('unsupported media and missing placeholder stay disabled without changing existing text/image workflows',()=>{
 assert.equal(templateSupport({...product,requiredInputTypes:['logo','product_name']}).supported,false);
 assert.equal(templateSupport({...product,promptTemplate:'No placeholder'}).supported,false);
 assert.equal(templateSupport({generationType:'avatar',requiredInputTypes:[]}).supported,false);
 assert.equal(templateSupport({generationType:'image',requiredInputTypes:['image'],promptTemplate:'Original image'}).supported,true);
 assert.equal(templateSupport({generationType:'product_video',requiredInputTypes:[],promptTemplate:'Film {{product_name}}'}).requiresProductName,true);
});
test('product name is not HTML-interpreted and does not trigger any paid request',()=>{
 const prepared=prepareTemplatePrompt(product,'<My Brand> & Friends');
 assert.ok(prepared.includes('<My Brand> & Friends'));
 assert.ok(!prepared.includes('{{product_name}}'));
});


test('long plain prompts stay disabled instead of losing suffix in Studio',()=>{
 const exactlyLimit='A'.repeat(1993)+'ENDMARK'; // 2,000 characters exactly
 assert.equal(exactlyLimit.length,2000);
 assert.equal(templateSupport({generationType:'image',promptTemplate:exactlyLimit}).supported,true);
 assert.equal(prepareTemplatePrompt({generationType:'image',promptTemplate:exactlyLimit}),exactlyLimit);
 const oversized=exactlyLimit+' USER-REQUIRED ENDING';
 const blocked=templateSupport({generationType:'image',promptTemplate:oversized});
 assert.equal(blocked.supported,false);
 assert.match(blocked.reason,/2,000-character Studio limit/);
 assert.throws(()=>prepareTemplatePrompt({generationType:'image',promptTemplate:oversized}),/not ready for Studio/);
 // Personalized templates with a short replacement remain functional within the same limit.
 const personalized={generationType:'product_video',requiredInputTypes:['product_name'],
  promptTemplate:'X'.repeat(1975)+' {{product_name}}'};
 assert.equal(templateSupport(personalized).supported,true);
 assert.equal(prepareTemplatePrompt(personalized,'A').length,1977);
 assert.throws(()=>prepareTemplatePrompt(personalized,'A'.repeat(70)),/too long/);
 const impossible={generationType:'product_video',requiredInputTypes:['product_name'],promptTemplate:'Z'.repeat(2001)+'{{product_name}}'};
 assert.equal(templateSupport(impossible).supported,false,'a published template must not offer a button that always fails');
 assert.match(templateSupport(impossible).reason,/even with a short product name/);
 assert.throws(()=>prepareTemplatePrompt(impossible,'X'),/not ready for Studio/);
 const justFits={...impossible,promptTemplate:'Z'.repeat(1999)+'{{product_name}}'};
 assert.equal(templateSupport(justFits).supported,true);
 assert.equal(prepareTemplatePrompt(justFits,'X').length,2000);
});


test('missing or whitespace-only template prompts remain disabled, without Studio handoff',()=>{
 for(const prompt of [undefined,null,'','   ','\n\t ']){
  const template={generationType:'image',requiredInputTypes:['image'],promptTemplate:prompt};
  const support=templateSupport(template);
  assert.equal(support.supported,false,'empty prompt must not advertise a ready workflow');
  assert.match(support.reason,/has no prompt/);
  assert.throws(()=>prepareTemplatePrompt(template),/not ready for Studio/);
 }
 const ready={generationType:'image',requiredInputTypes:['image'],promptTemplate:'Create a simple example'};
 assert.equal(templateSupport(ready).supported,true);
 assert.equal(prepareTemplatePrompt(ready),'Create a simple example');
});
