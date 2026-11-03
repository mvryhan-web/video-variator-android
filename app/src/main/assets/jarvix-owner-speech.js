// Owner-hosted speech; no private URL or key is sent to the browser.
let version = 0, pending = null, playing = null, objectUrl = null;
let audioContext = null, audioReady = null, source = null;
// Must run synchronously in the real activation click, before network awaits.
export function unlockOwnerSpeech() {
  const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Context) return;
  if (!audioContext || audioContext.state === 'closed') audioContext = new Context();
  audioReady = audioContext.resume();
  audioReady.catch(() => {});
}
export const OWNER_GREETING_TEXT = Object.freeze({ru:'Я Джарвис. Слушаю вас.',en:'I am Jarvis. How can I help?',fr:'Je suis Jarvis. Je vous écoute.',es:'Soy Jarvis. ¿En qué puedo ayudarte?'});
let greetingsPromise = null;
export function prepareOwnerGreetings() {
  if (!greetingsPromise) greetingsPromise = fetch('/media/jarvix/owner-greetings.json', {signal:AbortSignal.timeout(8000)})
    .then(reply => reply.ok ? reply.json() : null).catch(() => null);
  return greetingsPromise;
}
function greetingBlob(data, text, language) {
  const item = data?.languages?.[language];
  if (!item || item.text !== text.trim() || typeof item.audio !== 'string') return null;
  const bytes = Uint8Array.from(atob(item.audio), character => character.charCodeAt(0));
  return new Blob([bytes], {type:item.mime});
}
export function stopOwnerSpeech() {
  version += 1;
  if (source) { source.onended = null; try { source.stop(); } catch {} source = null; }
  pending?.abort(); pending = null;
  if (playing) { playing.onended = null; playing.onerror = null; playing.pause(); playing = null; }
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
}
export async function speakOwnerSpeech(text, language, hooks) {
  stopOwnerSpeech();
  const turn = version, controller = new AbortController();
  pending = controller;
  const timer = setTimeout(() => controller.abort(), 120000);
  try {
    const greetingData = OWNER_GREETING_TEXT[language] === text.trim() ? await prepareOwnerGreetings() : null;
    if (turn !== version) return;
    const cached = greetingBlob(greetingData, text, language);
    const configReply = cached ? null : await fetch('/api/jarvix/voice-config', {signal:controller.signal});
    const config = cached ? {configured:true, speechModelInstalled:true} : configReply.ok ? await configReply.json() : {};
    if (turn !== version) return;
    if (!config.configured) { hooks.fallback(); return; }
    if (!config.speechModelInstalled) throw Error('Voice worker unavailable');
    hooks.start();
    hooks.phase?.('generating');
    // Split long replies without silently cutting their final words.
    let rest = text.trim();
    while (rest && turn === version) {
      let end = Math.min(300, rest.length);
      if (rest.length > 300) {
        const space = rest.lastIndexOf(' ', 300);
        if (space > 150) end = space;
      }
      const chunk = rest.slice(0, end); rest = rest.slice(end).trim();
      let blob = cached;
      if (!blob) {
        const reply = await fetch('/api/jarvix/tts', {method:'POST', signal:controller.signal,
          headers:{'Content-Type':'application/json'},body:JSON.stringify({text:chunk,language})});
        if (!reply.ok || !reply.headers.get('content-type')?.startsWith('audio/wav')) throw Error('Speech failed');
        blob = await reply.blob();
      }
      if (turn !== version) return;
      if (audioContext) {
        await audioReady;
        if (audioContext.state !== 'running') throw new Error('AUDIO_GESTURE_REQUIRED');
        const decoded = await audioContext.decodeAudioData(await blob.arrayBuffer());
        if (turn !== version) return;
        const node = audioContext.createBufferSource();
        source = node; node.buffer = decoded; node.connect(audioContext.destination);
        hooks.phase?.('playing');
        await new Promise((resolve, reject) => {
          const abort = () => reject(new Error('CANCELLED'));
          controller.signal.addEventListener('abort', abort, {once:true});
          node.onended = () => {
            controller.signal.removeEventListener('abort', abort); resolve();
          };
          node.start();
        });
        node.disconnect();
        if (source === node) source = null;
      } else {
        objectUrl = URL.createObjectURL(blob);
        playing = new Audio(objectUrl);
        const audio = playing;
        hooks.phase?.('playing');
        await new Promise((resolve,reject) => {
          const abort = () => reject(new Error('CANCELLED'));
          const cleanup = () => controller.signal.removeEventListener('abort', abort);
          audio.onended = () => {cleanup();resolve();};
          audio.onerror = () => {cleanup();reject(new Error('AUDIO_PLAYBACK_FAILED'));};
          controller.signal.addEventListener('abort',abort,{once:true});
          audio.play().catch(error => {cleanup();reject(error);});
        });
        if (turn !== version) return;
        playing = null;
        URL.revokeObjectURL(objectUrl); objectUrl = null;
      }
      if (turn !== version) return;
      if (rest) hooks.phase?.('generating');
    }
    if (turn === version) hooks.complete();
  } catch (error) {
    if (turn === version) {
      if (playing) { playing.pause(); playing = null; }
      if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
      if (source) { source.onended = null; try { source.stop(); } catch {} source = null; }
      hooks.error(error?.name === 'NotAllowedError' || error?.message === 'AUDIO_GESTURE_REQUIRED'
        ? 'AUDIO_GESTURE_REQUIRED' : 'VOICE_PLAYBACK_FAILED');
      hooks.complete();
    }
  } finally {
    clearTimeout(timer);
    if (pending === controller) pending = null;
  }
}
