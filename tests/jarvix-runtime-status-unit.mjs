import test from 'node:test';
import assert from 'node:assert/strict';
import {getJarvixRuntimeStatus,getOrCreateSession,clearSession,processTurnWithOpenAI,processTurnWithMockBrain} from '../server/jarvix-brain.js';

test('preview status never claims a connected model or leaks a configured key',()=>{
 const env={OPENAI_API_KEY:'test-secret',JARVIX_AI_ENABLED:'true',JARVIX_AI_MODEL:'test-model'};
 const status=getJarvixRuntimeStatus({previewOnly:true,env});
 assert.equal(status.llm.status,'not_connected');
 assert.equal(status.llm.model,null);
 assert.equal(status.memory.persistent,false);
 assert.equal(status.speech.dedicatedVoiceInstalled,false);
 assert.equal(JSON.stringify(status).includes('test-secret'),false);
 assert.equal(getJarvixRuntimeStatus({env}).llm.status,'configured_unverified');
});

test('mock Responses turn sends prior context but navigation never starts generation',async()=>{
 const session=getOrCreateSession('responses-contract');
 session.history.push({role:'user',content:'My idea is a black Porsche'});
 let request;
 const result=await processTurnWithOpenAI('Open image studio',session,'en',{
  env:{OPENAI_API_KEY:'test-only-key',JARVIX_AI_ENABLED:'true',JARVIX_AI_MODEL:'test-model'},
  fetcher:async(url,options)=>{
   assert.equal(url,'https://api.openai.com/v1/responses');request=JSON.parse(options.body);
   return {ok:true,json:async()=>({output:[{content:[{type:'output_text',text:'Ready to review. {"action":{"type":"open_studio","studio":"image","url":"https://bad.example"}}'}]}]})};
  }
 });
 assert.equal(request.model,'test-model');assert.equal(request.store,false);
 assert.equal(request.input[0].content,'My idea is a black Porsche');
 assert.match(request.instructions,/Verified public DEEPSYQ pages/);
 assert.equal(result.action.url,'generate-studio.html?studio=image&from=jarvix');
 assert.equal(session.history.at(-1).role,'assistant');
 clearSession(session.id);
});

test('discussing a studio does not open it; model queries disclose the local fallback',()=>{
 const session=getOrCreateSession('discussion-not-navigation');
 assert.equal(processTurnWithMockBrain('Tell me about the studio',session,'en').action,null);
 const reply=processTurnWithMockBrain('Is the LLM connected?',session,'en');
 assert.match(reply.reply,/No LLM is connected/);
 const open=processTurnWithMockBrain('Open studio',session,'en');
 assert.equal(open.studioHandoff.autoGenerate,false);
 assert.equal(new URL(open.action.url,'https://local/').searchParams.has('auto'),false);
 clearSession(session.id);
});
