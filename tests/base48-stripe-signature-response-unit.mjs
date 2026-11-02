import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// Execute the exact route callback with in-memory Express/Stripe stand-ins.
// No server, DB, payment API, env file or outbound request is involved.
async function invoke({secret='whsec_fixture',verificationError=null}={}){
 const source=await readFile(new URL('../server/server.js',import.meta.url),'utf8');
 const begin=source.indexOf("app.post('/api/webhooks/stripe'");
 const finish=source.indexOf('\n});',begin);
 assert.ok(begin>=0&&finish>begin,'expected existing shared Stripe webhook route');
 const registration=source.slice(begin,finish+4);
 let handler,verifyCalls=0,processed=0;
 const app={post(path,raw,callback){
  assert.equal(path,'/api/webhooks/stripe');assert.ok(raw);
  handler=callback;
 }};
 const stripeWebhookClient={webhooks:{constructEvent(body,signature,key){
  verifyCalls++;assert.equal(key,secret);assert.equal(signature,'t=123,v1=fixture');
  assert.equal(body.toString(),'fixture-body');
  if(verificationError)throw verificationError;
  return {type:'fixture.handled',data:{object:{}}};
 }}};
 const generationBilling={async handleEvent(){processed++;return true;}};
 new Function('app','express','process','stripeWebhookClient','generationBilling',registration)(
  app,{raw:()=>({kind:'raw'})},{env:secret?{STRIPE_WEBHOOK_SECRET:secret}:{}},stripeWebhookClient,generationBilling
 );
 let status=200,body,format;
 const res={
  status(code){status=code;return this;},
  send(value){body=value;format='text';return this;},
  json(value){body=value;format='json';return this;}
 };
 await handler({body:Buffer.from('fixture-body'),headers:{'stripe-signature':'t=123,v1=fixture'}},res);
 return {status,body,format,verifyCalls,processed};
}

test('BASE 48 invalid Stripe signature never exposes SDK diagnostics or secret',async()=>{
 const result=await invoke({verificationError:new Error('EXPOSED_WEBHOOK_SECRET=whsec_critical EXPOSED_RAW_SIGNATURE=t=evil')});
 assert.equal(result.status,400);
 assert.equal(result.body,'Invalid Stripe webhook signature');
 assert.doesNotMatch(result.body,/whsec_|EXPOSED_|t=evil|Webhook signature error/);
 assert.equal(result.verifyCalls,1);
 assert.equal(result.processed,0);
});

test('BASE 48 missing shared Stripe signing secret remains fail closed',async()=>{
 const result=await invoke({secret:''});
 assert.equal(result.status,503);
 assert.equal(result.body,'Stripe webhook is not configured');
 assert.equal(result.verifyCalls,0);
 assert.equal(result.processed,0);
});

test('BASE 48 valid signed shared webhook still dispatches and acknowledges once',async()=>{
 const result=await invoke();
 assert.equal(result.status,200);
 assert.deepEqual(result.body,{received:true});
 assert.equal(result.verifyCalls,1);
 assert.equal(result.processed,1);
});
