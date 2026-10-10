import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {captureLegacy} from './helpers/legacy-video-harness.mjs';

// Real native FFmpeg smoke tests of commands emitted by the unchanged JS engine.
// These do NOT substitute for the later real WASM/Android/iPhone matrix.
for (const mode of ['gentle', 'balanced', 'dynamic']) for (const scenario of [
  {duration: .8, audio: true, resolution: '1280x720'},
  {duration: .8, audio: false, resolution: '720x1280'},
  {duration: 13, audio: true, resolution: '1280x720'},
]) {
  test(`native media baseline: ${mode}, ${scenario.duration}s, audio=${scenario.audio}, ${scenario.resolution}`, async () => {
    const folder = mkdtempSync(join(tmpdir(), 'vu-legacy-'));
    try {
      const [width, height] = scenario.resolution.split('x').map(Number);
      const source = join(folder, 'source.mp4'), output = join(folder, 'output.mp4');
      const inputSize = width > height ? '320x180' : '180x320';
      const fixture = ['-v','error','-f','lavfi','-i',`testsrc2=size=${inputSize}:rate=30`];
      if (scenario.audio) fixture.push('-f','lavfi','-i','sine=frequency=440:sample_rate=48000');
      fixture.push('-t',String(scenario.duration),'-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p');
      if (scenario.audio) fixture.push('-c:a','aac');
      execFileSync('ffmpeg', [...fixture, '-y', source], {timeout: 30000, stdio: 'pipe'});
      const captured = await captureLegacy({mode, ...scenario});
      const command = [...captured.commands.at(-1)];
      command[command.indexOf('-i') + 1] = source; command[command.length - 1] = output;
      execFileSync('ffmpeg', command, {timeout: 60000, stdio: 'pipe'});
      const probe = JSON.parse(execFileSync('ffprobe', ['-v','error','-show_streams','-show_format','-of','json',output], {encoding:'utf8'}));
      const video = probe.streams.find(s => s.codec_type === 'video');
      const audio = probe.streams.find(s => s.codec_type === 'audio');
      assert.equal(video.width, width); assert.equal(video.height, height);
      assert.equal(video.sample_aspect_ratio, '1:1'); assert.equal(video.pix_fmt, 'yuv420p');
      assert.equal(Boolean(audio), scenario.audio);
      if (audio) assert.equal(audio.sample_rate, '48000');
      const vf = command[command.indexOf('-vf') + 1];
      const speed = Number(vf.match(/setpts=PTS\/([\d.]+)/)[1]);
      const cut = vf.match(/between\(t\\,([\d.]+)\\,([\d.]+)\)/);
      const cutDuration = cut ? Number(cut[2]) - Number(cut[1]) : 0;
      const expected = (Number(command[command.indexOf('-t') + 1]) - cutDuration) / speed;
      assert.ok(Math.abs(Number(video.duration) - expected) < .12, `timeline: ${video.duration} vs ${expected}`);
      // Decode the entire result, not just the container metadata.
      execFileSync('ffmpeg', ['-v','error','-xerror','-i',output,'-f','null','-'], {timeout:60000, stdio:'pipe'});
      if (audio) {
        const bytes = execFileSync('ffmpeg', ['-v','error','-i',output,'-vn','-t','0.2','-f','f32le','-'], {maxBuffer:1024*1024});
        let peak = 0;
        for (let i = 0; i < bytes.length; i += 4) {const sample = bytes.readFloatLE(i); assert.ok(Number.isFinite(sample)); peak = Math.max(peak, Math.abs(sample));}
        assert.ok(peak > .01, 'decoded audio is not silent');
      }
    } finally {rmSync(folder, {recursive:true, force:true});}
  });
}
