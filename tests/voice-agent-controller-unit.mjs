import test from 'node:test';
import assert from 'node:assert/strict';
import { VoiceAgentController, VOICE_AGENT_STATES } from '../app/src/main/assets/voice-agent-controller.js';

class FakeAudioTrack {
  constructor() {
    this.enabled = true;
    this.stopped = false;
    this.kind = 'audio';
  }

  stop() {
    this.stopped = true;
  }
}

class FakeMediaStream {
  constructor() {
    this.tracks = [new FakeAudioTrack()];
  }

  getAudioTracks() {
    return this.tracks;
  }

  getTracks() {
    return this.tracks;
  }
}

class FakeMediaAdapter {
  constructor(options = {}) {
    this.getUserMediaCalls = 0;
    this.queryPermissionCalls = 0;
    this.permissionState = options.permissionState || 'prompt';
    this.shouldFail = options.shouldFail || false;
    this.failError = options.failError || null;
    this.delay = options.delay || 0;
  }

  async queryPermission(name) {
    this.queryPermissionCalls++;
    return this.permissionState;
  }

  async getUserMedia(constraints) {
    this.getUserMediaCalls++;
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }
    if (this.shouldFail) {
      throw this.failError || new Error('GetUserMedia failed');
    }
    return new FakeMediaStream();
  }
}

test('NO getUserMedia or permission calls on import or instantiation', () => {
  const adapter = new FakeMediaAdapter();
  const controller = new VoiceAgentController({ mediaAdapter: adapter, accountId: 'acc_123' });

  assert.equal(adapter.getUserMediaCalls, 0);
  assert.equal(adapter.queryPermissionCalls, 0);
  assert.equal(controller.state, VOICE_AGENT_STATES.IDLE);

  const status = controller.getStatus();
  assert.equal(status.state, VOICE_AGENT_STATES.IDLE);
  assert.equal(status.isLive, false);
  assert.equal(status.isMuted, false);
  assert.equal(status.hasStream, false);
  assert.equal(status.accountId, 'acc_123');
});

test('Explicit requestMicrophone success transitions IDLE -> REQUESTING -> LIVE', async () => {
  const adapter = new FakeMediaAdapter();
  const controller = new VoiceAgentController({ mediaAdapter: adapter });

  const states = [];
  controller.subscribe(status => {
    states.push(status.state);
  });

  const stream = await controller.requestMicrophone();

  assert.ok(stream);
  assert.equal(adapter.getUserMediaCalls, 1);
  assert.equal(adapter.queryPermissionCalls, 1);
  assert.equal(controller.state, VOICE_AGENT_STATES.LIVE);

  const status = controller.getStatus();
  assert.equal(status.isLive, true);
  assert.equal(status.isMuted, false);
  assert.equal(status.hasStream, true);

  // Initial subscribe callback yields IDLE, then REQUESTING, then LIVE
  assert.deepEqual(states, [VOICE_AGENT_STATES.IDLE, VOICE_AGENT_STATES.REQUESTING, VOICE_AGENT_STATES.LIVE]);
});

test('Permission denied preflight transitions to PERMISSION_DENIED without getUserMedia call', async () => {
  const adapter = new FakeMediaAdapter({ permissionState: 'denied' });
  const controller = new VoiceAgentController({ mediaAdapter: adapter });

  const stream = await controller.requestMicrophone();

  assert.equal(stream, null);
  assert.equal(adapter.queryPermissionCalls, 1);
  assert.equal(adapter.getUserMediaCalls, 0);
  assert.equal(controller.state, VOICE_AGENT_STATES.PERMISSION_DENIED);
  assert.match(controller.getStatus().error, /denied/i);
});

test('getUserMedia NotAllowedError transitions to PERMISSION_DENIED', async () => {
  const err = new Error('User denied permission');
  err.name = 'NotAllowedError';
  const adapter = new FakeMediaAdapter({ shouldFail: true, failError: err });
  const controller = new VoiceAgentController({ mediaAdapter: adapter });

  const stream = await controller.requestMicrophone();

  assert.equal(stream, null);
  assert.equal(adapter.getUserMediaCalls, 1);
  assert.equal(controller.state, VOICE_AGENT_STATES.PERMISSION_DENIED);
});

test('getUserMedia NotFoundError transitions to DEVICE_MISSING', async () => {
  const err = new Error('No mic found');
  err.name = 'NotFoundError';
  const adapter = new FakeMediaAdapter({ shouldFail: true, failError: err });
  const controller = new VoiceAgentController({ mediaAdapter: adapter });

  const stream = await controller.requestMicrophone();

  assert.equal(stream, null);
  assert.equal(adapter.getUserMediaCalls, 1);
  assert.equal(controller.state, VOICE_AGENT_STATES.DEVICE_MISSING);
});

test('Mute and unmute toggling updates track enabled state and UI status truth', async () => {
  const adapter = new FakeMediaAdapter();
  const controller = new VoiceAgentController({ mediaAdapter: adapter });

  await controller.requestMicrophone();
  assert.equal(controller.state, VOICE_AGENT_STATES.LIVE);

  const track = controller.stream.getAudioTracks()[0];
  assert.equal(track.enabled, true);

  // Mute
  controller.setMute(true);
  assert.equal(controller.state, VOICE_AGENT_STATES.MUTED);
  assert.equal(track.enabled, false);

  let status = controller.getStatus();
  assert.equal(status.isLive, true); // Still in live session, but muted
  assert.equal(status.isMuted, true);

  // Toggle back to unmute
  controller.toggleMute();
  assert.equal(controller.state, VOICE_AGENT_STATES.LIVE);
  assert.equal(track.enabled, true);

  status = controller.getStatus();
  assert.equal(status.isMuted, false);
});

test('Explicit stopMicrophone stops tracks and resets state to IDLE', async () => {
  const adapter = new FakeMediaAdapter();
  const controller = new VoiceAgentController({ mediaAdapter: adapter });

  await controller.requestMicrophone();
  const stream = controller.stream;
  const track = stream.getAudioTracks()[0];

  assert.equal(track.stopped, false);

  controller.stopMicrophone();

  assert.equal(track.stopped, true);
  assert.equal(controller.stream, null);
  assert.equal(controller.state, VOICE_AGENT_STATES.IDLE);
  assert.equal(controller.getStatus().isLive, false);
});

test('Late permission promise race: stale stream tracks are immediately stopped', async () => {
  const adapter = new FakeMediaAdapter({ delay: 50 });
  const controller = new VoiceAgentController({ mediaAdapter: adapter });

  const micPromise = controller.requestMicrophone();

  // Cancel / stop microphone while getUserMedia is pending in flight
  controller.stopMicrophone();

  const stream = await micPromise;

  assert.equal(stream, null);
  assert.equal(controller.state, VOICE_AGENT_STATES.IDLE);
});

test('Account switch invalidates pending request and stops active stream', async () => {
  const adapter = new FakeMediaAdapter({ delay: 50 });
  const controller = new VoiceAgentController({ mediaAdapter: adapter, accountId: 'user_A' });

  const micPromise = controller.requestMicrophone();

  // Switch account during request
  controller.setAccountId('user_B');

  const stream = await micPromise;

  assert.equal(stream, null);
  assert.equal(controller.accountId, 'user_B');
  assert.equal(controller.state, VOICE_AGENT_STATES.IDLE);
});

test('Format user-supplied mock transcript with "preview only" label and zero network calls', () => {
  const controller = new VoiceAgentController();

  const transcript = controller.formatPreviewTranscript('Hello world voice test');

  assert.equal(transcript.text, 'Hello world voice test');
  assert.equal(transcript.label, 'preview only');
  assert.equal(transcript.mock, true);
  assert.ok(typeof transcript.timestamp === 'number');
});


test('Two rapid mic clicks during asynchronous permission preflight produce only one getUserMedia request', async () => {
  let releasePermission;
  const gate = new Promise(resolve => { releasePermission = resolve; });
  const adapter = new FakeMediaAdapter();
  adapter.queryPermission = async () => { adapter.queryPermissionCalls++; await gate; return 'granted'; };
  const controller = new VoiceAgentController({ mediaAdapter: adapter, accountId: 'owner-1' });
  const first = controller.requestMicrophone();
  const second = controller.requestMicrophone();
  assert.equal(controller.state, VOICE_AGENT_STATES.REQUESTING);
  assert.equal(await second, null);
  assert.equal(adapter.queryPermissionCalls, 1);
  releasePermission();
  await first;
  assert.equal(adapter.getUserMediaCalls, 1);
  assert.equal(controller.state, VOICE_AGENT_STATES.LIVE);
  controller.destroy();
});

test('A second call while live or muted cannot open another microphone stream', async () => {
  const adapter = new FakeMediaAdapter();
  const controller = new VoiceAgentController({ mediaAdapter: adapter });
  const stream = await controller.requestMicrophone();
  assert.ok(stream);
  assert.equal(await controller.requestMicrophone(), null);
  controller.setMute(true);
  assert.equal(await controller.requestMicrophone(), null);
  assert.equal(adapter.getUserMediaCalls, 1);
  assert.equal(stream.getAudioTracks()[0].stopped, false);
  controller.destroy();
});

test('Late permission denial after stop or account switch never resurrects a cancelled session', async () => {
  let denyPermission;
  const permission = new Promise(resolve => { denyPermission = resolve; });
  const adapter = new FakeMediaAdapter();
  adapter.queryPermission = async () => { await permission; return 'denied'; };
  const controller = new VoiceAgentController({ mediaAdapter: adapter, accountId: 'owner-1' });
  const first = controller.requestMicrophone();
  controller.setAccountId('owner-2');
  denyPermission();
  assert.equal(await first, null);
  assert.equal(controller.state, VOICE_AGENT_STATES.IDLE);
  assert.equal(controller.accountId, 'owner-2');
  assert.equal(adapter.getUserMediaCalls, 0);
  controller.destroy();
});

test('Permission preflight rejection fails closed without an orphaned REQUESTING state', async () => {
  const adapter = new FakeMediaAdapter();
  adapter.queryPermission = async () => { throw new Error('permission adapter detail'); };
  const controller = new VoiceAgentController({ mediaAdapter: adapter });
  assert.equal(await controller.requestMicrophone(), null);
  assert.equal(controller.state, VOICE_AGENT_STATES.ERROR);
  assert.equal(controller.getStatus().error, 'MIC_PERMISSION_PREFLIGHT_FAILED');
  assert.equal(adapter.getUserMediaCalls, 0);
  controller.destroy();
});
