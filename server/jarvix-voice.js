/**
 * DEEPSYQ JARVIX voice integration status
 *
 * Implements:
 * No production speech model is installed yet. The waveform helper below is a
 * test fixture only; it does not synthesize speech and is never exposed by TTS.
 */

// Acoustic targets only. These are not implemented or currently selectable.
export const JARVIX_TIMBRES = Object.freeze({
  baritone: {
    id: 'baritone',
    name: 'Resonant Baritone',
    ruName: 'Глубокий спокойный баритон',
    fundamentalHz: 105,
    pacing: 1.0,
    resonance: 0.85,
    description: 'Глубокий бархатный тембр с мягкими низкими обертонами. Кинематографичный, невозмутимый голос дворецкого JARVIS.'
  },
  executive: {
    id: 'executive',
    name: 'Tech Executive / Crisp Butler',
    ruName: 'Интеллектуальный советник',
    fundamentalHz: 122,
    pacing: 1.02,
    resonance: 0.70,
    description: 'Чёткая академическая артикуляция, динамичный и аналитический тон. Идеален для быстрых ответов и точных инструкций.'
  },
  warm: {
    id: 'warm',
    name: 'Warm Companion',
    ruName: 'Тёплый дружелюбный голос',
    fundamentalHz: 115,
    pacing: 0.98,
    resonance: 0.78,
    description: 'Естественный, располагающий и мягкий тембр. Создаёт ощущение надёжного живого напарника.'
  }
});

export const SUPPORTED_LANGUAGES = Object.freeze({
  ru: { code: 'ru', name: 'Russian', native: 'Русский', locale: 'ru-RU' },
  en: { code: 'en', name: 'English', native: 'English', locale: 'en-US' },
  es: { code: 'es', name: 'Spanish', native: 'Español', locale: 'es-ES' },
  fr: { code: 'fr', name: 'French', native: 'Français', locale: 'fr-FR' }
});

// Explicit status: no private inference service or GPU has been provisioned.
export const INFRASTRUCTURE_SPEC = Object.freeze({
  ttsEngine: null,
  sttEngine: null,
  status: 'not_installed',
  latency: 'not_measured',
  hardware: 'not_provisioned',
  devSpend: '$0.00; local mock only'
});

// 3. PCM WAV GENERATOR UTILITY
export function createWavBuffer(pcmData, sampleRate = 24000, numChannels = 1) {
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const buffer = Buffer.alloc(44 + pcmData.length);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + pcmData.length, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // subchunk1size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // audio format (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(pcmData.length, 40);

  pcmData.copy(buffer, 44);
  return buffer;
}

// Test fixture: creates an audible tone with an audio header, not human speech.
export function synthesizeSpeechWave(text, arg2 = 'baritone', arg3 = null, sampleRate = 24000) {
  let timbreId = 'baritone';
  if (JARVIX_TIMBRES[arg2]) {
    timbreId = arg2;
  } else if (JARVIX_TIMBRES[arg3]) {
    timbreId = arg3;
  }
  if (typeof arg2 === 'number') sampleRate = arg2;
  if (typeof arg3 === 'number') sampleRate = arg3;

  const timbre = JARVIX_TIMBRES[timbreId] || JARVIX_TIMBRES.baritone;
  const f0 = timbre.fundamentalHz;
  const numWords = (text || '').trim().split(/\s+/).length || 4;
  const durationSec = Math.max(1.2, Math.min(8.0, numWords * 0.38 / timbre.pacing));
  const numSamples = Math.floor(durationSec * sampleRate);

  const pcm = Buffer.alloc(numSamples * 2);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Word cadence envelope
    const envelope = Math.sin(Math.PI * (i / numSamples)) * Math.min(1.0, 8.0 * (i / numSamples)) * Math.min(1.0, 8.0 * (1 - i / numSamples));
    const vibrato = 1.0 + 0.02 * Math.sin(2 * Math.PI * 5.0 * t);
    
    // Vocal tract formants (F0 fundamental + F1 + F2 + F3 harmonics)
    const fundamental = Math.sin(2 * Math.PI * f0 * vibrato * t);
    const h1 = 0.5 * Math.sin(2 * Math.PI * (f0 * 2.0) * vibrato * t);
    const h2 = 0.25 * Math.sin(2 * Math.PI * (f0 * 3.2) * vibrato * t);
    const h3 = 0.12 * Math.sin(2 * Math.PI * (f0 * 4.8) * vibrato * t);
    
    const sampleVal = (fundamental + h1 + h2 + h3) * envelope * 0.45;
    const intVal = Math.max(-32767, Math.min(32767, Math.floor(sampleVal * 32767)));
    pcm.writeInt16LE(intVal, i * 2);
  }

  return createWavBuffer(pcm, sampleRate);
}

// 5. INSTALL VOICE ROUTES FOR EXPRESS
export function installJarvixVoiceRoutes(app) {
  // Voice Configuration & Status
  app.get('/api/jarvix/voice-config', (req, res) => {
    res.json({
      ok: true,
      service: 'JARVIX voice status',
      defaultTimbre: null,
      timbres: {},
      languages: SUPPORTED_LANGUAGES,
      infrastructure: INFRASTRUCTURE_SPEC,
      speechModelInstalled: false,
      speechSource: 'browser',
      samples: {}
    });
  });

  const unavailable = (_req, res) => res.status(503).json({error:'VOICE_MODEL_NOT_INSTALLED',speechModelInstalled:false});
  app.all('/api/jarvix/tts', unavailable);
  app.all('/api/jarvix/stt', unavailable);
}
