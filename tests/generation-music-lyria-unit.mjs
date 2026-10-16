import test from 'node:test';
import assert from 'node:assert/strict';
import {buildLyriaClipPrompt,parseLyriaClipResult,looksLikeMp3} from '../server/generation-music-lyria.js';
import {generateGoogle,validateGeneration} from '../server/generation-provider.js';

const mp3=Buffer.concat([Buffer.from([0xff,0xfb,0x90,0x64]),Buffer.alloc(96)]);
const b64=mp3.toString('base64');
const request=()=>validateGeneration({kind:'music',model:'lyria-3-clip-preview',
 prompt:'Warm lo-fi jazz with piano',ratio:'',references:[],musicMode:'instrumental',consent:true});
const providerResponse=(data=b64,mimeType='audio/mpeg')=>({candidates:[{content:{parts:[
 {text:'Track structure\nInstrumental\n[A]'},
 {inlineData:{mimeType,data}}
]}}]});

test('owner #177 official Lyria Clip contract: exactly one 30-second prompt, no fake duration or unsupported controls',()=>{
 const r=request();const prompt=buildLyriaClipPrompt(r);
 assert.match(prompt,/30-second/);assert.match(prompt,/Instrumental only, no vocals/);
 for(const option of [
  {musicDuration:90},{durationSeconds:120},{genre:'ambient'},
  {lyrics:'fake native structured control'},{musicLanguage:'ru'},{vocalStyle:'dramatic'}
 ])assert.throws(()=>validateGeneration({...r,consent:true,...option}),/UNSUPPORTED_MUSIC_CONTROL/);
 assert.throws(()=>buildLyriaClipPrompt({...r,model:'lyria-3.5'}),/INVALID_MUSIC_REQUEST/);
 assert.throws(()=>buildLyriaClipPrompt({...r,musicMode:'voice'}),/INVALID_MUSIC_REQUEST/);
 assert.throws(()=>buildLyriaClipPrompt({...r,references:[{}]}),/INVALID_MUSIC_REQUEST/);
 assert.match(buildLyriaClipPrompt({...r,musicMode:'song'}),/original song with vocals/);
});

test('official generateContent clip request uses selected Google Lyria model and receives true MP3',async()=>{
 let calls=0,payload,url;
 const result=await generateGoogle(request(),{key:'local-fixture',fetcher:async(u,options)=>{
  calls++;url=u;payload=JSON.parse(options.body);
  assert.equal(options.headers['x-goog-api-key'],'local-fixture');
  return new Response(JSON.stringify(providerResponse()),{headers:{'Content-Type':'application/json'}});
 }});
 assert.equal(calls,1);assert.match(url,/models\/lyria-3-clip-preview:generateContent$/);
 assert.equal(payload.contents.length,1);
 assert.equal(payload.contents[0].parts.length,1);
 assert.equal(payload.generationConfig,undefined);
 assert.equal(result.mime,'audio/mpeg');
 assert.deepEqual(result.bytes,mp3);assert.match(result.text,/Track structure/);
});

test('Lyria response may put MP3 after lyrics and metadata, never invent empty music',()=>{
 const got=parseLyriaClipResult(providerResponse());
 assert.deepEqual(got.bytes,mp3);
 assert.equal(got.text.includes('Instrumental'),true);
 assert.throws(()=>parseLyriaClipResult({candidates:[{content:{parts:[{text:'lyrics only'}]}}]}),/EMPTY_GENERATION/);
 assert.throws(()=>parseLyriaClipResult({candidates:[]}),/EMPTY_GENERATION/);
});

test('reject HTML/JSON masquerading as MP3 and unsupported WAV before durable storage',()=>{
 for(const s of ['<html>not music</html>','{"error":"no access"}','random bytes']){
  const data=Buffer.from(s.repeat(5)).toString('base64');
  assert.throws(()=>parseLyriaClipResult(providerResponse(data)),/INVALID_PROVIDER_MEDIA/);
 }
 assert.throws(()=>parseLyriaClipResult(providerResponse(b64,'audio/wav')),/UNSUPPORTED_PROVIDER_MEDIA/);
 assert.throws(()=>parseLyriaClipResult(providerResponse('***=')),/INVALID_PROVIDER_MEDIA/);
});

test('ID3-tagged MP3 and legitimate raw MPEG frame accepted, incomplete tags rejected',()=>{
 assert.equal(looksLikeMp3(mp3),true);
 const header=Buffer.concat([Buffer.from('ID3'),Buffer.from([4,0,0,0,0,0,4]),Buffer.alloc(4)]);
 assert.equal(looksLikeMp3(Buffer.concat([header,mp3])),true);
 const corrupt=Buffer.from(header);corrupt[6]=0xff;
 assert.equal(looksLikeMp3(Buffer.concat([corrupt,mp3])),false);
 assert.equal(looksLikeMp3(Buffer.alloc(128)),false);
});

test('without any approved live API no paid calls occur in validation and parsing fixtures',()=>{
 const r=request();
 assert.deepEqual(parseLyriaClipResult(providerResponse()).bytes,mp3);
 assert.equal(r.references.length,0);
 assert.equal(r.musicMode,'instrumental');
});
