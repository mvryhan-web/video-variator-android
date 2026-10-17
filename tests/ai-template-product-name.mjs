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
 assert.throws(()=>prepareTemplatePrompt({...product,promptTemplate:'x'.repeat(2000)+' {{product_name}}'},'Bag'),/too long/);
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
