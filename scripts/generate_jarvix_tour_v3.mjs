#!/usr/bin/env node
// Generate JARVIX Tour V3 *only* with the owner's existing VoxCPM2 bridge.
// Never synthesize with browser voices, other models, or paid third-party APIs.
// Running this script does NOT publish audio: human approval of the same timbre
// is required before marking the manifest and clips reviewed.
import {createHash} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tourV3AllPhrases} from '../app/src/main/assets/jarvix-tour-v3-script.js';

const raw=process.env.JARVIX_VOICE_URL?.replace(/\/$/,'');
const token=process.env.JARVIX_VOICE_TOKEN;
const expected=process.env.JARVIX_OWNER_VOICE_PROFILE;
const output='app/src/main/assets/media/jarvix/tour-v3';
const phrases=tourV3AllPhrases();
const generate=process.argv.includes('--generate');
if(!generate){console.log('Dry run: '+phrases.length+' exact V3 phrases across 4 languages.');console.log('To generate locally: JARVIX_VOICE_URL=https://... JARVIX_VOICE_TOKEN=<owner token> JARVIX_OWNER_VOICE_PROFILE=<owner approved profile> node scripts/generate_jarvix_tour_v3.mjs --generate');process.exit(0);}
if(!raw||!/^https:\/\//.test(raw)||!token||token.length<32||!expected)throw Error('Owner VoxCPM2 HTTPS URL, token and pinned voice profile are required. Refusing fallback voice.');
const headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'};
const health=await fetch(raw+'/health',{headers,redirect:'error',signal:AbortSignal.timeout(7000)});
const info=health.ok?await health.json():{};
if(info.ready!==true||info.engine!=='VoxCPM2')throw Error('Owner VoxCPM2 worker is not ready');
if((info.voiceProfile||info.voice_profile||info.voiceId)!==expected)throw Error('Voice profile differs from owner-approved identity. Abort without writing any new speech.');
await mkdir(output,{recursive:true});
const clips=[];
for(const [i,{language,text}] of phrases.entries()){
 if(text.length>300)throw Error('Voice request exceeds safe 300-character limit');
 const hash=createHash('sha256').update(language+'\0'+text).digest('hex').slice(0,12);
 const filename='t3_'+language+'_'+hash+'.wav';
 let file;
 try{file=await readFile(join(output,filename));}catch{
  const response=await fetch(raw+'/tts',{method:'POST',headers,redirect:'error',body:JSON.stringify({text,language}),signal:AbortSignal.timeout(110000)});
  if(!response.ok||!response.headers.get('content-type')?.startsWith('audio/wav'))throw Error('Owner voice worker unavailable for '+language+' '+(i+1));
  file=Buffer.from(await response.arrayBuffer());
  if(file.length<44||file.length>12*1024*1024||file.toString('ascii',0,4)!=='RIFF'||file.toString('ascii',8,12)!=='WAVE')throw Error('Invalid WAV from owner voice worker');
  await writeFile(join(output,filename),file);
 }
 const sha256=createHash('sha256').update(file).digest('hex');
 clips.push({filename,language,text,sha256,reviewed:false});
 console.log((i+1)+'/'+phrases.length+' '+filename);
}
await writeFile(join(output,'manifest.json'),JSON.stringify({schemaVersion:'jarvix-tour-v3-audio/v1',engine:'VoxCPM2',voiceProfile:expected,reviewed:false,clips},null,2)+'\n');
console.log('Generated: '+clips.length+'. No audio is playable as V3 until owner listens, verifies same timbre, sets reviewed=true for approved clips and publishes the pack.');
