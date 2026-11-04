import test from 'node:test';
import assert from 'node:assert/strict';
import {processTurnWithLocalQwen} from '../server/jarvix-brain.js';
const session=()=>({history:[],accumulatedPrompt:{}});
test('local brain is opt-in and rejects insecure remote or Render loopback endpoints',async()=>{
 let calls=0;const fetcher=async()=>{calls++;throw Error('unexpected');};
 for(const env of [{},{JARVIX_LOCAL_LLM_ENABLED:'true',JARVIX_LOCAL_LLM_URL:'http://example.com/v1/chat/completions'},
 {JARVIX_LOCAL_LLM_ENABLED:'true',JARVIX_LOCAL_LLM_URL:'http://127.0.0.1:8766/v1/chat/completions',RENDER:'true'},
 {JARVIX_LOCAL_LLM_ENABLED:'true',JARVIX_LOCAL_LLM_URL:'https://example.com/v1/chat/completions'}])
 assert.equal(await processTurnWithLocalQwen('hello',session(),'en',{env,fetcher}),null);
 assert.equal(calls,0);
});
test('configured local brain preserves conversation and selected language without paid API',async()=>{
 const s=session();s.history.push({role:'user',content:'previous'});let request;
 const reply=await processTurnWithLocalQwen('bonjour',s,'fr',{env:{JARVIX_LOCAL_LLM_ENABLED:'true',JARVIX_LOCAL_LLM_URL:'https://owner.example/v1/chat/completions',JARVIX_LOCAL_LLM_TOKEN:'x'.repeat(40)},fetcher:async(url,options)=>{request={url,...options};return {ok:true,json:async()=>({choices:[{message:{content:'Bonjour !'}}]})};}});
 assert.equal(reply.provider,'qwen-hybrid');assert.equal(reply.language,'fr');assert.equal(s.history.length,3);
 const body=JSON.parse(request.body);assert.match(body.messages[0].content,/concisely in fr/);assert.equal(body.messages[1].content,'previous');assert.equal(request.redirect,'error');
});
