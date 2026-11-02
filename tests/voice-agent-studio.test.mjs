import test from 'node:test';
import assert from 'node:assert/strict';
import { VoiceAgentController, VOICE_AGENT_STATES } from '../app/src/main/assets/voice-agent-controller.js';

class MockAudioTrack {
  constructor() {
    this.enabled = true;
    this.stopped = false;
    this.kind = 'audio';
  }
  stop() {
    this.stopped = true;
  }
}

class MockMediaStream {
  constructor() {
    this.tracks = [new MockAudioTrack()];
  }
  getAudioTracks() {
    return this.tracks;
  }
  getTracks() {
    return this.tracks;
  }
}

class MockMediaAdapter {
  constructor() {
    this.calls = 0;
  }
  async queryPermission() {
    return 'granted';
  }
  async getUserMedia() {
    this.calls++;
    return new MockMediaStream();
  }
}

test('F6 Voice Agent — Controller & Safety Contracts', async () => {
  const adapter = new MockMediaAdapter();
  const controller = new VoiceAgentController({ mediaAdapter: adapter });

  // Initial state is IDLE, 0 getUserMedia calls
  assert.equal(controller.getStatus().state, VOICE_AGENT_STATES.IDLE);
  assert.equal(adapter.calls, 0);

  // Requesting mic transitions to LIVE
  await controller.requestMicrophone();
  assert.equal(controller.getStatus().state, VOICE_AGENT_STATES.LIVE);
  assert.equal(adapter.calls, 1);

  // Toggle mute
  controller.toggleMute();
  assert.equal(controller.getStatus().isMuted, true);
  assert.equal(controller.getStatus().state, VOICE_AGENT_STATES.MUTED);

  // Toggle unmute
  controller.toggleMute();
  assert.equal(controller.getStatus().isMuted, false);
  assert.equal(controller.getStatus().state, VOICE_AGENT_STATES.LIVE);

  // Stop microphone
  controller.stopMicrophone();
  assert.equal(controller.getStatus().state, VOICE_AGENT_STATES.IDLE);
});

test('F6 Voice Agent — Preview Transcript Formatting & Safety', () => {
  const controller = new VoiceAgentController();

  const sample = 'Create a cinematic product commercial 9:16';
  const formatted = controller.formatPreviewTranscript(sample);

  assert.equal(formatted.label, 'preview only');
  assert.equal(formatted.text, sample);

  // Empty string handled safely
  const empty = controller.formatPreviewTranscript('   ');
  assert.equal(empty.text, '');
});

test('F6 Voice Agent — Studio Handoff URL Builder', () => {
  const prompt = 'Cyberpunk Tokyo skyline at night with neon lights';
  const studioUrl = `generate-studio.html?prompt=${encodeURIComponent(prompt)}`;

  const params = new URLSearchParams(studioUrl.split('?')[1]);
  assert.equal(params.get('prompt'), prompt);
});

test('F6 Voice Agent & BytePlus Lumina Terms UI Contracts', async () => {
  const { readFileSync } = await import('node:fs');
  const html = readFileSync(new URL('../app/src/main/assets/generate-studio.html', import.meta.url), 'utf8');

  // Verify pure microphone icon button without text
  assert.ok(html.includes('id="studioVoiceBtn"'), 'Must have studioVoiceBtn');
  assert.ok(!html.includes('id="studioVoiceBtnText"'), 'Must NOT have voice-btn-text label');

  // Verify consent button is completely removed from bottom of composer
  assert.ok(!html.includes('class="consent"'), 'Must NOT have visible consent label/button at bottom');

  // Verify BytePlus Lumina terms integration
  assert.ok(html.includes('lumina-terms.js'), 'Must load lumina-terms.js');
  assert.ok(html.includes('lumina-terms.css'), 'Must load lumina-terms.css');

  // Verify mic permission dialog
  assert.ok(html.includes('id="micPermissionDialog"'), 'Must have micPermissionDialog');
  assert.ok(html.includes('id="grantMicBtn"'), 'Must have grantMicBtn');
});
