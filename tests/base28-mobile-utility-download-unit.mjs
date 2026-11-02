import test from 'node:test';
import assert from 'node:assert/strict';
import { bindDownloadHandler, bindCopyHandler } from '../app/src/main/assets/mobile-utility.js';

function mockButton() {
 return {
  type: 'button',
  disabled: false,
  onclick: null
 };
}

test('BASE #28: bindDownloadHandler initiates download without falsely claiming verified save in browser', async () => {
 const button = mockButton();
 let statusMsg = '';
 const status = msg => { statusMsg = msg; };
 const label = (en, ru) => en;

 let saveCalls = 0;
 let resolveSave;
 const saveLocal = async () => {
  saveCalls++;
  return new Promise(resolve => { resolveSave = resolve; });
 };

 const file = { name: 'document.pdf', size: 1024, type: 'application/pdf' };
 bindDownloadHandler(button, file, {
  saveLocal,
  status,
  label,
  isAndroidBridge: () => false // standard browser environment
 });

 // Trigger first click
 const clickPromise = button.onclick();

 // During operation
 assert.equal(button.disabled, true, 'Button must be disabled during active save');
 assert.equal(statusMsg, 'Downloading…', 'Must show downloading status during transfer');

 // Complete save
 resolveSave();
 await clickPromise;

 // In browser, download is initiated but local file persistence cannot be verified by JS
 assert.equal(button.disabled, false, 'Button must be re-enabled after save completes');
 assert.equal(statusMsg, 'Download started.', 'Must not claim verified save in browser');
 assert.equal(saveCalls, 1, 'saveLocal must be called once');
});

test('BASE #28: bindDownloadHandler confirms device persistence when confirmed by AndroidBridge', async () => {
 const button = mockButton();
 let statusMsg = '';
 const status = msg => { statusMsg = msg; };
 const label = (en, ru) => en;

 const saveLocal = async () => {};
 const file = { name: 'document.pdf', size: 1024, type: 'application/pdf' };

 bindDownloadHandler(button, file, {
  saveLocal,
  status,
  label,
  isAndroidBridge: () => true // native AndroidBridge present
 });

 await button.onclick();

 assert.equal(button.disabled, false);
 assert.equal(statusMsg, 'Saved to device.', 'Must show verified device save status on AndroidBridge');
});

test('BASE #28: bindDownloadHandler handles save failure and restores button for retry', async () => {
 const button = mockButton();
 let statusMsg = '';
 const status = msg => { statusMsg = msg; };
 const label = (en, ru) => en;

 const saveLocal = async () => {
  throw new Error('SAVE_FAILED');
 };

 const file = { name: 'error.pdf', size: 1024, type: 'application/pdf' };
 bindDownloadHandler(button, file, {
  saveLocal,
  status,
  label
 });

 await button.onclick();

 assert.equal(button.disabled, false, 'Button must be re-enabled to allow retry');
 assert.equal(statusMsg, 'Download failed. Try again.', 'Must provide clear retryable error message');
});

test('BASE #28: bindDownloadHandler prevents duplicate / concurrent execution on rapid clicks', async () => {
 const button = mockButton();
 let statusMsg = '';
 const status = msg => { statusMsg = msg; };
 const label = (en, ru) => en;

 let saveCalls = 0;
 let finishSave;
 const saveLocal = async () => {
  saveCalls++;
  return new Promise(r => { finishSave = r; });
 };

 const file = { name: 'rapid.pdf', size: 1024, type: 'application/pdf' };
 bindDownloadHandler(button, file, {
  saveLocal,
  status,
  label
 });

 // Start first click
 const first = button.onclick();
 assert.equal(saveCalls, 1);
 assert.equal(button.disabled, true);

 // Simulate rapid second click while first is in-flight
 const second = button.onclick();
 assert.equal(saveCalls, 1, 'Concurrent click must be dropped while saving');

 finishSave();
 await first;
 await second;

 assert.equal(saveCalls, 1, 'Total calls must remain exactly 1');
 assert.equal(button.disabled, false);
});

test('BASE #28: bindCopyHandler copies text and safely recovers from Clipboard API errors', async () => {
 const button = mockButton();
 let statusMsg = '';
 const status = msg => { statusMsg = msg; };
 const label = (en, ru) => en;

 // 1. Successful copy
 let copiedText = '';
 const successClipboard = () => ({
  writeText: async text => { copiedText = text; }
 });

 bindCopyHandler(button, () => 'Extracted OCR text', {
  status,
  label,
  clipboard: successClipboard
 });

 await button.onclick();
 assert.equal(copiedText, 'Extracted OCR text');
 assert.equal(statusMsg, 'Copied');

 // 2. Clipboard API throws (e.g. permission denied)
 const failingClipboard = () => ({
  writeText: async () => { throw new Error('NotAllowedError'); }
 });

 bindCopyHandler(button, () => 'Secret', {
  status,
  label,
  clipboard: failingClipboard
 });

 await button.onclick();
 assert.equal(statusMsg, 'Copy failed', 'Must report copy failure on rejection');

 // 3. Clipboard API is entirely unavailable in WebView
 const missingClipboard = () => null;

 bindCopyHandler(button, () => 'Text', {
  status,
  label,
  clipboard: missingClipboard
 });

 await button.onclick();
 assert.equal(statusMsg, 'Copy failed', 'Must handle missing clipboard object gracefully');
});

test('BASE #28: download and copy actions trigger zero paid API requests', async () => {
 let networkCalls = 0;
 const originalFetch = globalThis.fetch;
 globalThis.fetch = async (...args) => {
  networkCalls++;
  return originalFetch ? originalFetch(...args) : null;
 };

 try {
  const btn = mockButton();
  let statusMsg = '';
  bindDownloadHandler(btn, { name: 'local.pdf', size: 512, type: 'application/pdf' }, {
   saveLocal: async () => {},
   status: s => { statusMsg = s; },
   label: (en, ru) => en
  });
  await btn.onclick();

  const copyBtn = mockButton();
  bindCopyHandler(copyBtn, 'hello', {
   status: s => { statusMsg = s; },
   label: (en, ru) => en,
   clipboard: () => ({ writeText: async () => {} })
  });
  await copyBtn.onclick();

  assert.equal(networkCalls, 0, 'Zero network or paid API calls must occur');
 } finally {
  globalThis.fetch = originalFetch;
 }
});
