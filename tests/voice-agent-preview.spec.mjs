import { test, expect } from '@playwright/test';

function installFakeMediaAdapter(page, options = {}) {
  return page.addInitScript(opts => {
    const state = {
      getUserMediaCalls: 0,
      queryPermissionCalls: 0,
      stoppedTracks: 0,
      permissionState: opts.permissionState || 'prompt',
      failMode: opts.failMode || null,
      delayMs: opts.delayMs || 0
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
          stop() {
            state.stoppedTracks++;
          }
        };
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
