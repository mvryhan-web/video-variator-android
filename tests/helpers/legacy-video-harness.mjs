import {readFileSync} from 'node:fs';
import vm from 'node:vm';

export const coreSource = readFileSync(new URL('../../app/src/main/assets/video-core.js', import.meta.url), 'utf8');

// Run the public process API without modifying/exposing its private algorithms.
// FFmpeg is mocked only to capture commands, not to claim a media render passed.
export async function captureLegacy({mode, resolution = '1280x720', duration = 13, audio = true, fastExport = true, variants = 1, wowMontage=false, wowRuntime, sampleBytes, execOverride}) {
  const commands = [], writes = [], deletes = [], sessions = [], callbacks = [];
  const math = Object.create(Math); math.random = () => .25;
  let core;
  const ffmpeg = {
    async exec(args) {commands.push(Array.from(args)); if(execOverride)return execOverride(args,core);return !audio && args.includes('-af') ? 1 : 0;},
    async writeFile(name) {writes.push(name);},
    async deleteFile(name) {deletes.push(name);},
    async readFile(name) {return name==='wow_samples.gray'?(sampleBytes||new Uint8Array()):new Uint8Array([1, 2, 3]);},
  };
  class StableDate extends Date {constructor(...args) {super(...(args.length ? args : [1700000000000]));} static now() {return 1700000000000;}}
  class LocalURL extends URL {static createObjectURL() {return 'blob:local-fixture';} static revokeObjectURL() {}}
  const window = {VUProcessingSession: {begin() {sessions.push('begin'); return 1;}, end() {sessions.push('end');}}};
  if(wowRuntime)window.VUWowMontage=wowRuntime;
  const context = {
    window, location: {protocol: 'https:', origin: 'https://fixture.invalid', href: 'https://fixture.invalid/index.html'},
    navigator: {language: 'en-US'}, Math: math, Date: StableDate, URL: LocalURL, Blob,
    setInterval: () => 1, clearInterval() {},
    document: {createElement(tag) {
      if (tag !== 'video') throw Error('Unexpected DOM dependency: ' + tag);
      return {duration, set src(value) {queueMicrotask(() => this.onloadedmetadata());}};
    }},
    fetch() {throw Error('Source upload/network access forbidden in this harness');},
  };
  vm.runInNewContext(coreSource, context, {filename: 'video-core.js'});
  core = window.VideoVariatorCore;
  core.state.loaded = true; core.state.ffmpeg = ffmpeg;
  core.setFiles([{name: 'fixture.mp4', type: 'video/mp4', async arrayBuffer() {return new ArrayBuffer(4);}}]);
  const result = await core.process({mode, resolution, variants, fastExport,...(wowMontage?{wowMontage:true}:{}), onResult(r) {callbacks.push(r);}});
  return {commands, writes, deletes, sessions, callbacks, result, core};
}
