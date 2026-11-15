import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const asset = name => fs.readFileSync(new URL('../app/src/main/assets/' + name, import.meta.url), 'utf8');

test('Video Uniquifier keeps each selected resolution through administrator refresh', async () => {
  const quality = {
    value: '720',
    disabled: true,
    options: ['720', '1080', '2160'].map(value => ({value, disabled: true}))
  };
  let load, refresh;
  const context = vm.createContext({
    document: {getElementById: id => id === 'quality' ? quality : null, addEventListener() {}},
    window: {addEventListener: (_, callback) => {load = callback;}},
    location: {protocol: 'https:', origin: 'https://test.example'},
    localStorage: {getItem: () => 'fixture-token'},
    fetch: async () => ({ok: true, json: async () => ({user: {isAdmin: true}})}),
    setInterval: callback => {refresh = callback;}
  });
  vm.runInContext(asset('admin-access.js'), context);
  load();
  for (const resolution of ['720', '1080', '2160', '720']) {
    quality.value = resolution;
    refresh();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(quality.value, resolution);
    assert.equal(quality.disabled, false);
    assert.ok(quality.options.every(option => !option.disabled));
  }
});

test('Trial quality observer settles without rewriting its own attributes', () => {
  let writes = 0;
  const control = () => {
    let disabled = true;
    return {get disabled() {return disabled;}, set disabled(value) {writes++; disabled = value;}};
  };
  const quality = Object.assign(control(), {value: '1080', options: [control(), control(), control()]});
  const mode = Object.assign(control(), {options: [control()]});
  const nodes = {quality, mode, currentPlan: {textContent: 'Free trial'}};
  const observers = [];
  vm.runInNewContext(asset('trial-quality.js'), {
    document: {readyState: 'complete', getElementById: id => nodes[id], addEventListener() {}},
    window: {addEventListener() {}},
    MutationObserver: class {
      constructor(callback) {this.callback = callback;}
      observe() {observers.push(this.callback);}
    }
  });
  const firstWrites = writes;
  assert.ok(firstWrites > 0);
  for (const callback of observers) callback();
  assert.equal(writes, firstWrites);
  assert.equal(quality.value, '1080');
  assert.ok(quality.options.every(option => !option.disabled));
});

test('production page loads the protected quality scripts with a revision', () => {
  const html = asset('video-uniquifier.html');
  for (const name of ['admin-access', 'trial-quality']) {
    assert.match(html, new RegExp('src="' + name + '\\.js\\?v=quality-'));
  }
});
