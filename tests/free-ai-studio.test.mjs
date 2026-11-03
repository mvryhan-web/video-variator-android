import test from 'node:test';
import assert from 'node:assert/strict';
import {
  studioJobs,
  checkDailyQuota,
  incrementDailyQuota,
  generateFreeImage,
  generateTrialVideo
} from '../server/free-ai-provider.js';

test('Free AI Provider: checkDailyQuota and incrementDailyQuota enforce rate limits', () => {
  const testUser = 'user_quota_test_' + Date.now();
  const initial = checkDailyQuota(testUser);
  assert.equal(initial.allowed, true);
  assert.equal(initial.remaining, 20);
  assert.equal(initial.limit, 20);

  // Increment usage
  incrementDailyQuota(testUser);
  const afterOne = checkDailyQuota(testUser);
  assert.equal(afterOne.allowed, true);
  assert.equal(afterOne.remaining, 19);

  // Increment up to limit
  for (let i = 0; i < 19; i++) {
    incrementDailyQuota(testUser);
  }
  const afterLimit = checkDailyQuota(testUser);
  assert.equal(afterLimit.allowed, false);
  assert.equal(afterLimit.remaining, 0);
});

test('Free AI Provider: generateFreeImage produces valid image artifact deterministically', async () => {
  const result = await generateFreeImage({
    prompt: 'Cosmic neon portal over digital ocean',
    model: 'flux-schnell',
    ratio: '16:9'
  });

  assert.ok(result);
  assert.ok(result.buffer);
  assert.ok(result.buffer.length > 500);
  assert.match(result.mime, /image\/(svg\+xml|jpeg|webp)/);
  assert.ok(result.provider);

  const text = result.buffer.toString('utf8');
  assert.match(text, /Deepsyq/);
  assert.match(text, /Cosmic neon portal/);
});

test('Free AI Provider: generateTrialVideo produces valid video/animation artifact', async () => {
  const result = await generateTrialVideo({
    prompt: 'Hyper-lapse flight through glowing nebula',
    model: 'veo-lite',
    duration: 5
  });

  assert.ok(result);
  assert.ok(result.buffer);
  assert.ok(result.buffer.length > 500);
  assert.ok(result.provider);
});

test('Free AI Provider: studioJobs Map stores and tracks jobs', () => {
  const jobId = 'test-job-' + Date.now();
  studioJobs.set(jobId, {
    id: jobId,
    status: 'ready',
    type: 'image',
    prompt: 'Cyber city',
    buffer: Buffer.from('<svg></svg>'),
    mime: 'image/svg+xml'
  });

  assert.ok(studioJobs.has(jobId));
  const retrieved = studioJobs.get(jobId);
  assert.equal(retrieved.status, 'ready');
  assert.equal(retrieved.type, 'image');

  studioJobs.delete(jobId);
  assert.equal(studioJobs.has(jobId), false);
});
