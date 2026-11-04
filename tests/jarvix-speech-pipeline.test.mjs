import assert from 'node:assert/strict';
const cached = process.argv.includes('--cached');
if (!cached) {
  const {spawnSync} = await import('node:child_process');
  const child = spawnSync(process.execPath, [new URL(import.meta.url).pathname, '--cached'], {encoding:'utf8'});
  assert.equal(child.status, 0, child.stderr);
}
const text = ('This is the first sentence. ' + 'Here is some useful information about your creative project. '.repeat(8)).trim();
const events=[];
globalThis.fetch=async (url,options={}) => {
  if (options.signal?.aborted) throw new DOMException('Aborted','AbortError');
  if (url.endsWith('manifest.json')) return Response.json({clips:cached?[{id:'jarvix_en_51',language:'en',text,url:'/media/jarvix/clips/jarvix_en_51.mp3'}]:[]});
  if (url.endsWith('voice-config')) return Response.json({configured:true,speechModelInstalled:true});
  if (url.endsWith('/tts')) {events.push(['tts',JSON.parse(options.body).text]);return new Response('wave',{headers:{'Content-Type':'audio/wav'}});}
  if (url.endsWith('.mp3')) return new Response('mp3',{headers:{'Content-Type':'audio/mpeg'}});
  throw new Error('Unexpected URL '+url);
};
globalThis.Audio=class {
  play() {events.push(['play']);setTimeout(()=>{events.push(['end']);this.onended?.();},5);return Promise.resolve();}
  pause() {}
};
const {speakOwnerSpeech,splitSpeechChunks}=await import('../app/src/main/assets/jarvix-owner-speech.js');
assert.equal(splitSpeechChunks(text).join(' '),text,'all words retained in order');
let completed=0;
await speakOwnerSpeech(text,'en',{start(){},source(){},phase(){},fallback(){throw Error('Unexpected fallback');},error(reason){throw Error(reason);},complete(){completed++;}});
assert.equal(completed,1);
const requests=events.filter(item=>item[0]==='tts');
if(cached) {
  assert.equal(requests.length,0);
  assert.equal(events.filter(item=>item[0]==='play').length,1,'a long cached recording plays once');
} else {
  assert.ok(requests.length>1);
  assert.equal(requests.map(item=>item[1]).join(' '),text);
  const firstEnd=events.findIndex(item=>item[0]==='end');
  assert.equal(events.slice(0,firstEnd).filter(item=>item[0]==='tts').length,2,'the next request starts before playback ends');
}
console.log('PASS: '+(cached?'long cached recording plays once':'ordered speech pipeline overlaps synthesis and playback'));
