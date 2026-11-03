// Owner-hosted speech; no private URL or key is sent to the browser.
let version = 0, pending = null, playing = null, objectUrl = null;
export function stopOwnerSpeech() {
  version += 1;
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
    const configReply = await fetch('/api/jarvix/voice-config', {signal:controller.signal});
    const config = configReply.ok ? await configReply.json() : {};
    if (turn !== version) return;
    if (!config.configured) { hooks.fallback(); return; }
    if (!config.speechModelInstalled) throw Error('Voice worker unavailable');
    hooks.start();
    // Split long replies without silently cutting their final words.
    let rest = text.trim();
    while (rest && turn === version) {
      let end = Math.min(300, rest.length);
      if (rest.length > 300) {
        const space = rest.lastIndexOf(' ', 300);
        if (space > 150) end = space;
      }
      const chunk = rest.slice(0, end); rest = rest.slice(end).trim();
      const reply = await fetch('/api/jarvix/tts', {method:'POST', signal:controller.signal,
        headers:{'Content-Type':'application/json'},body:JSON.stringify({text:chunk,language})});
      if (!reply.ok || !reply.headers.get('content-type')?.startsWith('audio/wav')) throw Error('Speech failed');
      const blob = await reply.blob();
      if (turn !== version) return;
      objectUrl = URL.createObjectURL(blob);
      playing = new Audio(objectUrl);
      const audio = playing;
      await new Promise((resolve,reject) => {
        audio.onended = resolve; audio.onerror = reject;
        controller.signal.addEventListener('abort',reject,{once:true});
        audio.play().catch(reject);
      });
      if (turn !== version) return;
      playing = null;
      URL.revokeObjectURL(objectUrl); objectUrl = null;
    }
    if (turn === version) hooks.complete();
  } catch (_) {
    if (turn === version) {
      if (playing) { playing.pause(); playing = null; }
      if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
      hooks.error();
      hooks.complete();
    }
  } finally {
    clearTimeout(timer);
    if (pending === controller) pending = null;
  }
}
