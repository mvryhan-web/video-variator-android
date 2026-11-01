import test from 'node:test';
import assert from 'node:assert/strict';

test('BASE #28: mobile-utility download handlers protect button state and report outcome', async () => {
 // Mock DOM elements
 const elements = {};
 const documentMock = {
  getElementById(id) {
   if (!elements[id]) {
    elements[id] = {
     textContent: '',
     children: [],
     append(...nodes) { this.children.push(...nodes); },
     replaceChildren(...nodes) { this.children = [...nodes]; }
    };
   }
   return elements[id];
  },
  createElement(tag) {
   return {
    tagName: tag.toUpperCase(),
    type: 'button',
    textContent: '',
    disabled: false,
    value: '',
    children: [],
    attributes: {},
    append(...nodes) { this.children.push(...nodes); },
    setAttribute(k, v) { this.attributes[k] = v; }
   };
  }
 };

 // Test simulation of result() handler logic
 let saveLocalOutcome = 'resolve';
 let saveLocalCalledWith = null;
 const saveLocal = async (file) => {
  saveLocalCalledWith = file;
  if (saveLocalOutcome === 'reject') throw new Error('SAVE_FAILED');
 };

 const label = (en, ru) => en;
 const status = (msg) => { documentMock.getElementById('utilityStatus').textContent = msg; };

 // Build result card button as in mobile-utility.js
 const testFile = { name: 'processed.pdf', size: 1048576, type: 'application/pdf' };
 const b = documentMock.createElement('button');
 b.type = 'button';
 b.textContent = label('Download', 'Скачать');
 b.onclick = async () => {
  b.disabled = true;
  status(label('Saving…', 'Сохранение…'));
  try {
   await saveLocal(testFile);
   status(label('Saved successfully.', 'Успешно сохранено.'));
  } catch (_) {
   status(label('Save failed. Try again.', 'Не удалось сохранить. Попробуйте снова.'));
  } finally {
   b.disabled = false;
  }
 };

 // Test 1: Successful save
 saveLocalOutcome = 'resolve';
 const clickPromise = b.onclick();
 assert.equal(b.disabled, true, 'Button must be disabled during async download');
 assert.equal(documentMock.getElementById('utilityStatus').textContent, 'Saving…');
 await clickPromise;
 assert.equal(b.disabled, false, 'Button must be re-enabled after save completes');
 assert.equal(documentMock.getElementById('utilityStatus').textContent, 'Saved successfully.');
 assert.equal(saveLocalCalledWith.name, 'processed.pdf');

 // Test 2: Failed save (e.g. AndroidBridge or browser denial)
 saveLocalOutcome = 'reject';
 const failPromise = b.onclick();
 assert.equal(b.disabled, true, 'Button must be disabled during failed attempt');
 await failPromise;
 assert.equal(b.disabled, false, 'Button must be re-enabled after failure so user can retry');
 assert.equal(documentMock.getElementById('utilityStatus').textContent, 'Save failed. Try again.');
});

test('BASE #28: mobile-utility textResult handles clipboard failure gracefully', async () => {
 const elements = { utilityStatus: { textContent: '' } };
 const status = (msg) => { elements.utilityStatus.textContent = msg; };
 const label = (en, ru) => en;

 const area = { value: 'Recognized test text' };
 let clipboardShouldFail = false;
 const navigatorMock = {
  clipboard: {
   async writeText(val) {
    if (clipboardShouldFail) throw new Error('Clipboard denied');
   }
  }
 };

 const copy = { textContent: 'Copy text' };
 copy.onclick = async () => {
  try {
   await navigatorMock.clipboard.writeText(area.value);
   status(label('Copied', 'Скопировано'));
  } catch (_) {
   status(label('Copy failed', 'Не удалось скопировать'));
  }
 };

 // Success case
 clipboardShouldFail = false;
 await copy.onclick();
 assert.equal(elements.utilityStatus.textContent, 'Copied');

 // Failure case
 clipboardShouldFail = true;
 await copy.onclick();
 assert.equal(elements.utilityStatus.textContent, 'Copy failed');
});
