import { test, expect } from '@playwright/test';

function installFakeMediaAdapter(page, options = {}) {
  return page.addInitScript(opts => {
    const state = {
      getUserMediaCalls: 0,
      queryPermissionCalls: 0,
      stoppedTracks: 0,
      permissionState: opts.permissionState || 'prompt',
      failMode: opts.failMode || null,
      delayMs: opts.delayMs || 0,
      endedTracks: 0,
      currentTrack: null,
      endCurrentTrack() {
        const track = state.currentTrack;
        if (!track || track.readyState === 'ended') return;
        track.readyState = 'ended';
        state.endedTracks++;
        for (const fn of [...track.endedListeners]) fn();
      }
    };
    window.__VOICE_TEST_STATE__ = state;
    window.__VOICE_PREVIEW_MEDIA_ADAPTER__ = {
      async queryPermission() {
        state.queryPermissionCalls++;
        return state.permissionState;
      },
      async getUserMedia() {
        state.getUserMediaCalls++;
        if (state.delayMs > 0) {
          await new Promise(r => setTimeout(r, state.delayMs));
        }
        if (state.failMode === 'denied') {
          const e = new Error('Permission denied');
          e.name = 'NotAllowedError';
          throw e;
        }
        if (state.failMode === 'missing') {
          const e = new Error('No microphone found');
          e.name = 'NotFoundError';
          throw e;
        }
        const track = {
          kind: 'audio',
          enabled: true,
          readyState: 'live',
          endedListeners: new Set(),
          addEventListener(type, fn) { if (type === 'ended') this.endedListeners.add(fn); },
          removeEventListener(type, fn) { if (type === 'ended') this.endedListeners.delete(fn); },
          stop() {
            state.stoppedTracks++;
            this.readyState = 'ended';
          }
        };
        state.currentTrack = track;
        return {
          getAudioTracks() {
            return [track];
          },
          getTracks() {
            return [track];
          }
        };
      }
    };
  }, options);
}

test('V6.2: zero getUserMedia on load, explicit click transitions IDLE -> LIVE -> MUTED -> IDLE, and no paid/API calls', async ({ page }) => {
  const apiCalls = [];
  page.on('request', req => {
    if (req.url().includes('/api/')) apiCalls.push(req.url());
  });

  await installFakeMediaAdapter(page);
  await page.goto('/voice-agent-preview.html');

  await expect(page.locator('#previewOnlyBadge')).toContainText('Preview Only');
  await expect(page.locator('#voiceStateBadge')).toHaveText('IDLE');
  await expect(page.locator('#enableMicBtn')).toBeEnabled();
  await expect(page.locator('#muteMicBtn')).toBeDisabled();
  await expect(page.locator('#stopMicBtn')).toBeDisabled();

  const initialCalls = await page.evaluate(() => window.__VOICE_TEST_STATE__);
  expect(initialCalls.getUserMediaCalls).toBe(0);
  expect(initialCalls.queryPermissionCalls).toBe(0);

  await page.click('#enableMicBtn');
  await expect(page.locator('#voiceStateBadge')).toHaveText('LIVE');
  await expect(page.locator('#enableMicBtn')).toBeDisabled();
  await expect(page.locator('#muteMicBtn')).toBeEnabled();
  await expect(page.locator('#stopMicBtn')).toBeEnabled();

  await page.click('#muteMicBtn');
  await expect(page.locator('#voiceStateBadge')).toHaveText('MUTED');
  await expect(page.locator('#muteMicBtn')).toHaveText('Unmute');

  await page.click('#muteMicBtn');
  await expect(page.locator('#voiceStateBadge')).toHaveText('LIVE');
  await expect(page.locator('#muteMicBtn')).toHaveText('Mute');

  await page.click('#stopMicBtn');
  await expect(page.locator('#voiceStateBadge')).toHaveText('IDLE');
  await expect(page.locator('#enableMicBtn')).toBeEnabled();

  const finalCalls = await page.evaluate(() => window.__VOICE_TEST_STATE__);
  expect(finalCalls.getUserMediaCalls).toBe(1);
  expect(finalCalls.stoppedTracks).toBe(1);
  expect(apiCalls).toEqual([]);
});

test('V6.2: handles PERMISSION_DENIED, DEVICE_MISSING, double-click race, and pagehide cleanup on mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installFakeMediaAdapter(page, { delayMs: 80 });
  await page.goto('/voice-agent-preview.html');

  // Rapid double-click must trigger only one getUserMedia call
  await page.evaluate(() => {
    const btn = document.getElementById('enableMicBtn');
    btn.click();
    btn.click();
  });
  await expect(page.locator('#voiceStateBadge')).toHaveText('LIVE');
  const afterRace = await page.evaluate(() => window.__VOICE_TEST_STATE__);
  expect(afterRace.getUserMediaCalls).toBe(1);

  // Pagehide stops active microphone stream
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await expect(page.locator('#voiceStateBadge')).toHaveText('IDLE');
  const afterHide = await page.evaluate(() => window.__VOICE_TEST_STATE__);
  expect(afterHide.stoppedTracks).toBeGreaterThanOrEqual(1);

  // Switch to denied mode and retry
  await page.evaluate(() => {
    window.__VOICE_TEST_STATE__.failMode = 'denied';
  });
  await page.click('#enableMicBtn');
  await expect(page.locator('#voiceStateBadge')).toHaveText('PERMISSION_DENIED');

  // Switch to missing device mode and retry
  await page.evaluate(() => {
    window.__VOICE_TEST_STATE__.failMode = 'missing';
  });
  await page.click('#enableMicBtn');
  await expect(page.locator('#voiceStateBadge')).toHaveText('DEVICE_MISSING');
});


function installFakeAudioContext(page) {
  return page.addInitScript(() => {
    const audio = {
      constructed: 0, closed: 0, sourceConnects: 0, sourceDisconnects: 0,
      analyserDisconnects: 0, destinationConnects: 0, amplitude: 0.55,
      reads: 0
    };
    window.__VOICE_AUDIO_TEST__ = audio;
    class FakeAudioContext {
      constructor() {
        audio.constructed++;
        this.state = 'running';
        this.destination = { isOutput: true };
      }
      createMediaStreamSource(stream) {
        if (!stream?.getAudioTracks?.().length) throw Error('NO_TRACK');
        return {
          connect(node) {
            if (node?.isOutput) audio.destinationConnects++;
            else audio.sourceConnects++;
          },
          disconnect() { audio.sourceDisconnects++; }
        };
      }
      createAnalyser() {
        return {
          fftSize: 1024,
          getByteTimeDomainData(buffer) {
            audio.reads++;
            for (let i = 0; i < buffer.length; i++) {
              buffer[i] = Math.max(0, Math.min(255, Math.round(128 + Math.sin(i * 0.18) * audio.amplitude * 127)));
            }
          },
          disconnect() { audio.analyserDisconnects++; }
        };
      }
      close() {
        if (this.state !== 'closed') {
          this.state = 'closed';
          audio.closed++;
        }
        return Promise.resolve();
      }
      resume() { return Promise.resolve(); }
    }
    window.AudioContext = FakeAudioContext;
    window.webkitAudioContext = FakeAudioContext;
  });
}

test('V6.3: real local RMS responds only while LIVE, mute zeroes, stop closes graph and never outputs audio', async ({ page }) => {
  const requests = [];
  page.on('request', request => {
    if (request.url().includes('/api/')) requests.push(request.url());
  });
  await installFakeMediaAdapter(page);
  await installFakeAudioContext(page);
  await page.goto('/voice-agent-preview.html');
  const meter = page.locator('#micMeter');
  await expect(meter).toHaveAttribute('aria-valuenow', '0');
  expect(await page.evaluate(() => window.__VOICE_AUDIO_TEST__.constructed)).toBe(0);
  await page.click('#enableMicBtn');
  await expect(page.locator('#voiceStateBadge')).toHaveText('LIVE');
  await expect(meter).toHaveAttribute('aria-valuenow', /^[1-9]\d*$/);
  const firstValue = await meter.getAttribute('aria-valuenow');
  expect(Number(firstValue)).toBeGreaterThan(10);
  const reads = await page.evaluate(() => window.__VOICE_AUDIO_TEST__.reads);
  expect(reads).toBeGreaterThan(0);
  await page.click('#muteMicBtn');
  await expect(page.locator('#voiceStateBadge')).toHaveText('MUTED');
  await expect(meter).toHaveAttribute('aria-valuenow', '0');
  const mutedReads = await page.evaluate(() => window.__VOICE_AUDIO_TEST__.reads);
  await page.waitForTimeout(60);
  expect(await page.evaluate(() => window.__VOICE_AUDIO_TEST__.reads)).toBe(mutedReads);
  await page.click('#muteMicBtn');
  await expect(page.locator('#voiceStateBadge')).toHaveText('LIVE');
  await expect(meter).toHaveAttribute('aria-valuenow', /^[1-9]\d*$/);
  await page.click('#stopMicBtn');
  await expect(page.locator('#voiceStateBadge')).toHaveText('IDLE');
  await expect(meter).toHaveAttribute('aria-valuenow', '0');
  await expect(meter).toHaveAttribute('aria-valuetext', '0 percent');
  const state = await page.evaluate(() => window.__VOICE_AUDIO_TEST__);
  expect(state.constructed).toBe(2);
  expect(state.closed).toBe(2);
  expect(state.sourceConnects).toBe(2);
  expect(state.sourceDisconnects).toBe(2);
  expect(state.destinationConnects).toBe(0);
  expect(requests).toEqual([]);
});

test('V6.3: no meter or context on permission denial/device absence; pending Stop invalidates stream', async ({ page }) => {
  await installFakeMediaAdapter(page, { failMode: 'denied', delayMs: 300 });
  await installFakeAudioContext(page);
  await page.goto('/voice-agent-preview.html');
  await page.click('#enableMicBtn');
  await expect(page.locator('#voiceStateBadge')).toHaveText('PERMISSION_DENIED');
  await expect(page.locator('#micMeter')).toHaveAttribute('aria-valuenow', '0');
  await page.evaluate(() => { window.__VOICE_TEST_STATE__.failMode = 'missing'; });
  await page.click('#enableMicBtn');
  await expect(page.locator('#voiceStateBadge')).toHaveText('DEVICE_MISSING');
  await page.evaluate(() => { window.__VOICE_TEST_STATE__.failMode = null; });
  await page.click('#enableMicBtn');
  await expect.poll(() => page.evaluate(() => window.__VOICE_TEST_STATE__.getUserMediaCalls)).toBe(3);
  await page.click('#stopMicBtn');
  await expect(page.locator('#voiceStateBadge')).toHaveText('IDLE');
  await page.waitForTimeout(450);
  await expect(page.locator('#micMeter')).toHaveAttribute('aria-valuenow', '0');
  const state = await page.evaluate(() => ({
    media: window.__VOICE_TEST_STATE__, audio: window.__VOICE_AUDIO_TEST__
  }));
  expect(state.media.stoppedTracks).toBe(1);
  expect(state.audio.constructed).toBe(0);
});

test('V6.3: track ended, pagehide, visibility hidden and account-switch all release Web Audio', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installFakeMediaAdapter(page);
  await installFakeAudioContext(page);
  await page.goto('/voice-agent-preview.html');
  const meter = page.locator('#micMeter');
  async function start() {
    await page.click('#enableMicBtn');
    await expect(page.locator('#voiceStateBadge')).toHaveText('LIVE');
    await expect(meter).toHaveAttribute('aria-valuenow', /^[1-9]\d*$/);
  }
  await start();
  await page.evaluate(() => window.__VOICE_TEST_STATE__.endCurrentTrack());
  await expect(page.locator('#voiceStateBadge')).toHaveText('IDLE');
  await expect(meter).toHaveAttribute('aria-valuenow', '0');
  await start();
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await expect(page.locator('#voiceStateBadge')).toHaveText('IDLE');
  await expect(meter).toHaveAttribute('aria-valuenow', '0');
  await start();
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('#voiceStateBadge')).toHaveText('IDLE');
  await expect(meter).toHaveAttribute('aria-valuenow', '0');
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
  });
  await start();
  await page.evaluate(() => window.dispatchEvent(new StorageEvent('storage', {
    key: 'vv_token', newValue: 'other-user-context'
  })));
  await expect(page.locator('#voiceStateBadge')).toHaveText('IDLE');
  await expect(meter).toHaveAttribute('aria-valuenow', '0');
  const state = await page.evaluate(() => window.__VOICE_AUDIO_TEST__);
  expect(state.constructed).toBe(4);
  expect(state.closed).toBe(4);
  expect(state.destinationConnects).toBe(0);
});
