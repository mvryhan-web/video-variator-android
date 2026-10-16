import test from 'node:test';
import assert from 'node:assert/strict';
import {buildOpenAIImageRequest,decodeOpenAIImageResponse,generateOpenAIImage} from '../server/generation-openai-image.js';

const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.alloc(24)]);
const jpg=Buffer.from([255,216,255,224,4,5,6,7,255,217]);
const model={id:'gpt-image-2.5-flare',enabled:true,quality:'low',
 sizes:{'1:1':{'1K':'1024x1024'},'3:2':{'1K':'1536x1024'}},
 formats:['png','jpeg'],maxReferences:3};
const input={kind:'image',model:model.id,prompt:'   an original blue flower  ',ratio:'1:1',
 resolution:'1K',outputFormat:'png',references:[]};
const allowed={customerPaymentConfirmed:true,purchasedCreditsReserved:true,
 serverPriceApproved:true,userConsented:true,durableStorageReady:true};
const apiImage={output_format:'png',data:[{b64_json:png.toString('base64')}]};
const answer=(data=apiImage,status=200)=>({ok:status===200,status,json:async()=>data});
const call=(extra={},config=model,opts={})=>generateOpenAIImage({...input,...extra},{
 key:'test-placeholder',modelConfig:config,purchasedJobGate:allowed,...opts});

test('generation has exactly one image; server-controlled model/quality/size and trimmed prompt',()=>{
 const result=buildOpenAIImageRequest(input,model);
 assert.equal(result.model,model.id);assert.equal(result.quality,'low');
 assert.equal(result.size,'1024x1024');assert.equal(result.n,1);
 assert.equal(result.prompt,'an original blue flower');assert.equal(result.output_format,'png');
 assert.deepEqual(result.references,[]);
});
test('reject unsupported provider controls rather than silently ignore',()=>{
 for(const key of ['seed','negativePrompt','mask','n','inputFidelity'])
  assert.throws(()=>buildOpenAIImageRequest({...input,[key]:'test'},model),/UNSUPPORTED_IMAGE_CONTROL/);
});
test('reject model not approved/enabled, wrong kind, missing prompt',()=>{
 assert.throws(()=>buildOpenAIImageRequest({...input,model:'arbitrary'},model),/INVALID_REQUEST/);
 assert.throws(()=>buildOpenAIImageRequest(input,{...model,enabled:false}),/INVALID_REQUEST/);
 assert.throws(()=>buildOpenAIImageRequest({...input,kind:'video'},model),/INVALID_REQUEST/);
 assert.throws(()=>buildOpenAIImageRequest({...input,prompt:'  '},model),/INVALID_REQUEST/);
});
test('invalid ratios/sizes/quality and unsupported formats fail closed',()=>{
 assert.throws(()=>buildOpenAIImageRequest({...input,ratio:'16:9'},model),/UNSUPPORTED_RESOLUTION/);
 assert.throws(()=>buildOpenAIImageRequest(input,{...model,sizes:{'1:1':{'1K':'1010x1024'}}}),/UNSUPPORTED_RESOLUTION/);
 assert.throws(()=>buildOpenAIImageRequest({...input,outputFormat:'webp'},model),/UNSUPPORTED_IMAGE_FORMAT/);
 assert.throws(()=>buildOpenAIImageRequest(input,{...model,quality:'max',id:model.id.replace('2.5-flare','1.5')}),/INVALID_REQUEST/);
});
test('accept approved genuine base64 PNG/JPEG inputs, forbid malformed and too many references',()=>{
 const ref={mimeType:'image/png',data:png.toString('base64')};
 assert.equal(buildOpenAIImageRequest({...input,references:[ref]},model).references.length,1);
 assert.throws(()=>buildOpenAIImageRequest({...input,references:[ref,ref,ref,ref]},model),/INVALID_REFERENCES/);
 assert.throws(()=>buildOpenAIImageRequest({...input,references:[ref]}, {...model,maxReferences:0}),/INVALID_REFERENCES/);
 assert.throws(()=>buildOpenAIImageRequest({...input,references:[{...ref,data:'bad!!!'}]},model),/INVALID_REFERENCES/);
 assert.throws(()=>buildOpenAIImageRequest({...input,references:[{mimeType:'image/jpeg',data:ref.data}]},model),/INVALID_REFERENCES/);
});
test('decode response: reject URL, duplicate, truncated, noncanonical and wrong format',()=>{
 assert.equal(decodeOpenAIImageResponse(apiImage,'png').mime,'image/png');
 assert.throws(()=>decodeOpenAIImageResponse({data:[{url:'https://example.com/image.png'}]},'png'),/INVALID_PROVIDER_MEDIA/);
 assert.throws(()=>decodeOpenAIImageResponse({data:[{},{}]},'png'),/EMPTY_GENERATION/);
 assert.throws(()=>decodeOpenAIImageResponse({data:[{b64_json:Buffer.alloc(8).toString('base64')}]},'png'),/INVALID_PROVIDER_MEDIA/);
 assert.throws(()=>decodeOpenAIImageResponse({output_format:'jpeg',data:apiImage.data},'png'),/INVALID_PROVIDER_MEDIA/);
 assert.equal(decodeOpenAIImageResponse({output_format:'jpeg',data:[{b64_json:jpg.toString('base64')}]},'jpeg').mime,'image/jpeg');
});
test('NO billable HTTP even if fetch is injected without real customer-paid gate',async()=>{
 let calls=0;
 await assert.rejects(generateOpenAIImage(input,{key:'test',modelConfig:model,
   fetcher:async()=>{calls++;return answer();}}),/CUSTOMER_PAID_GENERATION_REQUIRED/);
 for(const prop of Object.keys(allowed)){
  await assert.rejects(generateOpenAIImage(input,{key:'test',modelConfig:model,
    purchasedJobGate:{...allowed,[prop]:false},fetcher:async()=>{calls++;return answer();}}),
    /CUSTOMER_PAID_GENERATION_REQUIRED/);
 }
 assert.equal(calls,0);
});
test('no key never makes a request',async()=>{
 let calls=0;
 await assert.rejects(generateOpenAIImage(input,{modelConfig:model,purchasedJobGate:allowed,
  fetcher:async()=>{calls++;return answer();}}),/PROVIDER_NOT_CONFIGURED/);
 assert.equal(calls,0);
});
test('JSON generations endpoint, no redirect, no provider leakage',async()=>{
 let observed;
 const result=await call({},model,{fetcher:async(url,opts)=>{
   observed={url,opts};return answer();
 }});
 assert.equal(result.mime,'image/png');assert.ok(result.bytes.equals(png));
 assert.equal(observed.url,'https://api.openai.com/v1/images/generations');
 assert.equal(observed.opts.redirect,'error');
 assert.equal(observed.opts.headers['Content-Type'],'application/json');
 assert.equal(JSON.parse(observed.opts.body).n,1);
 assert.equal(JSON.parse(observed.opts.body).quality,'low');
});
test('multipart reference-image editing reuses actual PNG/JPG files and official form path',async()=>{
 const refs=[{mimeType:'image/png',data:png.toString('base64')},
             {mimeType:'image/jpeg',data:jpg.toString('base64')}];
 let form,route,headers;
 const result=await call({references:refs},model,{fetcher:async(url,opts)=>{
   route=url;form=opts.body;headers=opts.headers;return answer();
 }});
 assert.equal(result.mime,'image/png');
 assert.equal(route,'https://api.openai.com/v1/images/edits');
 assert.equal(headers['Content-Type'],undefined); // fetch must set multipart boundary
 assert.equal(form.getAll('image[]').length,2);
 assert.equal(form.getAll('image[]')[0].type,'image/png');
 assert.equal(form.getAll('image[]')[1].type,'image/jpeg');
 assert.equal(form.get('prompt'),'an original blue flower');
});
test('map HTTP failures without raw prompts, URLs, bodies or auto retries',async()=>{
 for(const [status,code] of [[429,'PROVIDER_BUSY'],[402,'PROVIDER_BILLING_REQUIRED'],
  [400,'PROVIDER_REQUEST_REJECTED'],[401,'PROVIDER_NOT_CONFIGURED'],[500,'PROVIDER_UNAVAILABLE']]){
  let calls=0;
  await assert.rejects(call({},model,{fetcher:async()=>{
    calls++;return answer({error:{message:'PRIVATE_RAW_PROVIDER_ERROR'}},status);
  }}),new RegExp(code));
  assert.equal(calls,1);
 }
});
test('network failure normalized and never auto-retried',async()=>{
 let calls=0;
 await assert.rejects(call({},model,{fetcher:async()=>{
   calls++;throw Error('SECRET_API_MESSAGE');
 }}),/PROVIDER_UNAVAILABLE/);
 assert.equal(calls,1);
});
test('malformed success output returns safe provider-media error',async()=>{
 await assert.rejects(call({},model,{fetcher:async()=>answer({data:[{b64_json:'Zg=='}]})}),
  /INVALID_PROVIDER_MEDIA/);
});
