import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createMontageRequest, prepareMontage, MONTAGE_STATUS} from '../app/src/main/assets/wow-montage/contract.mjs';
import {captureLegacy, coreSource} from './helpers/legacy-video-harness.mjs';

const baseline = JSON.parse(readFileSync(new URL('fixtures/legacy-video-baseline.json', import.meta.url)));
const modes = ['gentle', 'balanced', 'dynamic'];

test('legacy recipe/ranges/filter/encoding functions remain byte-for-byte unchanged', () => {
  const hashes=JSON.parse(readFileSync(new URL('fixtures/legacy-algorithm-hashes.json',import.meta.url)));
  for(const [name,hash] of Object.entries(hashes)){
    const source=coreSource.match(new RegExp('  function '+name+'\\([\\s\\S]*?(?=\\n  (?:async )?function |\\n  window\\.)'))?.[0];
    assert.ok(source,name);assert.equal(createHash('sha256').update(source).digest('hex'),hash,name);
  }
});

test('WOW contract defaults off in every mode; enabling requires measured analysis', () => {
  assert.equal(MONTAGE_STATUS, 'visual-v1');
  for (const mode of modes) {
    const request = createMontageRequest({mode, width: 1280, height: 720});
    assert.equal(request.enabled, false);
    assert.deepEqual(prepareMontage(request).effects, []);
    assert.ok(Object.isFrozen(request) && Object.isFrozen(request.output) && Object.isFrozen(request.invariants));
    assert.equal(prepareMontage(createMontageRequest({...request, width:1280,height:720,enabled:true})).status,'requires-analysis');
  }
});

test('invalid contract flags/modes/geometry cannot activate a partial feature', () => {
  for (const change of [{enabled: 'false'}, {mode: 'wow'}, {width: 0}, {height: 721}, {width: Infinity}]) {
    assert.throws(() => createMontageRequest({width: 1280, height: 720, ...change}), TypeError);
  }
});

test('ES module contract is not imported into Android file pages; classic runtime is separate', () => {
  const assets = new URL('../app/src/main/assets/', import.meta.url);
  for (const file of readdirSync(assets).filter(f => /\.(html|js)$/.test(f))) {
    assert.doesNotMatch(readFileSync(new URL(file, assets), 'utf8'), /wow-montage\/contract|prepareMontage|createMontageRequest/);
  }
});

for (const scenario of baseline.scenarios) {
  test(`legacy command baseline: ${scenario.mode}, ${scenario.duration}s, audio=${scenario.audio}`, async () => {
    const run = await captureLegacy(scenario);
    assert.deepEqual(run.commands, scenario.commands);
    assert.deepEqual(run.sessions, ['begin', 'end']);
    assert.equal(run.core.state.running, false);
    assert.equal(run.result.outputCount, 1);
    assert.equal(run.result.results[0].audio, scenario.audio);
  });
}

test('all existing modes, six resolutions and both export presets retain encoding settings', async () => {
  for (const mode of modes) for (const resolution of ['720x1280','1080x1920','2160x3840','1280x720','1920x1080','3840x2160']) for (const fastExport of [true, false]) {
    const run = await captureLegacy({mode, resolution, fastExport});
    const command = run.commands[0], [width, height] = resolution.split('x').map(Number);
    const value = key => command[command.indexOf(key) + 1];
    assert.match(value('-vf'), new RegExp(`crop=${width}:${height}:`));
    assert.equal(value('-preset'), width >= 1080 || fastExport ? 'ultrafast' : 'veryfast');
    assert.equal(value('-crf'), width >= 2160 ? '24' : width >= 1080 ? '22' : '21');
    assert.equal(value('-c:a'), 'aac'); assert.equal(value('-b:a'), '160k');
    assert.equal(value('-c:v'), 'libx264'); assert.equal(value('-pix_fmt'), 'yuv420p');
  }
});

test('five variants reuse a single source and retain output callbacks and cleanup', async () => {
  for (const mode of modes) {
    const run = await captureLegacy({mode, variants: 5});
    assert.deepEqual(run.writes, ['source_0.mp4']);
    assert.equal(run.callbacks.length, 5); assert.equal(run.result.outputCount, 5);
    assert.equal(run.result.creditSeconds, 65);
    assert.equal(run.deletes.filter(name => name === 'source_0.mp4').length, 1);
    assert.deepEqual(run.sessions, ['begin', 'end']);
  }
});
