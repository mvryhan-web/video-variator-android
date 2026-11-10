import {prepareStaticClips, getStaticClip, findCatalogReply} from './jarvix-clip-library.js';
// Owner-hosted speech; no private URL or key is sent to the browser.
let version = 0, pending = null, playing = null, objectUrl = null;
// Only generic action acknowledgements are retained, never user prompts.
const actionAudio=new Map(),actionWords=new Set(['Открыл','Перешёл','Готово','Сделано','Выполняю','Запустил','Есть','Недостаточно кредитов','Уточните промпт','Opened','Done','Started','Clarify prompt','Insufficient credits','Ouvert','Fait','Lancé','Précisez','Abierto','Listo','Iniciado','Aclara petición']);
let audioContext = null, audioReady = null, source = null;
// Sentence-sized requests reduce time to first sound. They are not token streaming.
export function splitSpeechChunks(text) {
  const chunks = [];
  let rest = String(text).trim();
  while (rest) {
    const limit = chunks.length ? 240 : 140;
    if (rest.length <= limit) { chunks.push(rest); break; }
    const prefix = rest.slice(0, limit + 1);
    const sentenceEnds = [...prefix.matchAll(/[.!?…](?:["»”])?(?=\s)/gu)];
    let end = sentenceEnds.length ? sentenceEnds[sentenceEnds.length - 1].index + sentenceEnds[sentenceEnds.length - 1][0].length : rest.lastIndexOf(' ', limit);
    if (end < 30) end = limit;
    chunks.push(rest.slice(0, end).trim()); rest = rest.slice(end).trim();
  }
  return chunks;
}
// Must run synchronously in the real activation click, before network awaits.
export function unlockOwnerSpeech() {
  const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Context) return;
  if (!audioContext || audioContext.state === 'closed') audioContext = new Context();
  audioReady = audioContext.resume();
  audioReady.catch(() => {});
}
export const OWNER_GREETING_TEXT = Object.freeze({"ru":"Я Джарвис, голосовой помощник Deepsyq. Помогу с фото и видео, открою нужный раздел и настрою оформление: светлое, тёмное или неоновое. С чего начнём?","en":"I'm Jarvis, your Deepsyq assistant. I can help with images, video, and site themes: light, dark, or neon. What shall we do?","fr":"Je suis Jarvis, votre assistant Deepsyq. Je peux aider pour vos images, vidéos et thèmes du site : clair, sombre ou néon. Par quoi commencer ?","es":"Soy Jarvis, tu asistente Deepsyq. Te ayudo con imágenes, vídeos y temas del sitio: claro, oscuro o neón. ¿Por dónde empezamos?"});
let greetingsPromise = null;
export function prepareOwnerGreetings() {
  prepareStaticClips();
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
    const staticCached = await getStaticClip(text, language, controller.signal);
    const greetingData = !staticCached && OWNER_GREETING_TEXT[language] === text.trim() ? await prepareOwnerGreetings() : null;
    if (turn !== version) return;
    const greetingCached = greetingBlob(greetingData, text, language);
    const ackKey=language+':'+text.trim(),ackCached=actionAudio.get(ackKey);
    // For phrases not present verbatim, choose the closest *known* recording,
    // never synthesize new audio or play unknown/unverified filenames.
    let nearestReply = null, nearestAudio = null;
    if (!staticCached && !greetingCached && !ackCached) {
      nearestReply = await findCatalogReply(text, language);
      if (turn !== version) return;
      if (nearestReply?.text) nearestAudio = await getStaticClip(nearestReply.text, language, controller.signal);
    }
    const cached = staticCached || greetingCached || ackCached || nearestAudio;
    if (turn !== version) return;
    if (!cached) { hooks.unavailable?.(); hooks.complete?.(); return; }
    if (nearestAudio && nearestReply) hooks.recordedText?.(nearestReply.text);
    hooks.source?.(ackCached ? 'memory-ack' : greetingCached ? 'cached-greeting' :
                   staticCached ? 'static-clip' : 'nearest-recording');
    hooks.start();
    hooks.phase?.('generating');
    // A cached recording is complete: play it exactly once, regardless of text length.
    const chunks = [text.trim()];
    const loadChunk = async () => ({blob: cached});
    let next = loadChunk(chunks[0]);
    for (let index = 0; index < chunks.length && turn === version; index++) {
      const result = await next;
      if (result.error) throw result.error;
      const blob = result.blob;
      if (turn !== version) return;
      // Only one synthesis request at a time; prepare the next while this audio plays.
      next = index + 1 < chunks.length ? loadChunk(chunks[index + 1]) : null;
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
      if (index + 1 < chunks.length) hooks.phase?.('generating');
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

