import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALLOWED_STATUSES,
  WorkspacePolicyError,
  sanitizeText,
  sanitizeTitle,
  sanitizeMetadata,
  validateOwnership,
  validateStatus,
  validateProjectRecord,
  createProjectRecord,
  renameProjectRecord,
  duplicateProjectRecord,
  archiveProjectRecord,
  restoreProjectRecord,
  toggleFavoriteProjectRecord,
  linkStudioJobRecord,
  deletePreflightProjectRecord
} from '../server/workspace-project-policy.js';

const mockDi = (id = 'proj_123', timestamp = '2026-10-18T12:00:00.000Z') => ({
  idGenerator: () => id,
  now: () => timestamp
});

test('ALLOWED_STATUSES contains strictly draft, ready, archived', () => {
  assert.deepEqual(ALLOWED_STATUSES, ['draft', 'ready', 'archived']);
  assert.ok(Object.isFrozen(ALLOWED_STATUSES));
});

test('text sanitization strips HTML markup, trims, bounds length, and handles fallbacks', () => {
  assert.equal(sanitizeText('  <script>alert(1)</script>  Hello <b>World</b>  '), 'alert(1)  Hello World');
  assert.equal(sanitizeText('', 100, 'Fallback'), 'Fallback');
  assert.equal(sanitizeText('A'.repeat(300), 10), 'AAAAAAAAAA');
  assert.equal(sanitizeTitle('   <p>My Project Title</p>   '), 'My Project Title');
  assert.equal(sanitizeTitle('   '), 'Untitled Project');
});

test('metadata sanitization strips sensitive tokens, URL credentials, and billing details without mutating source', () => {
  const sensitiveMeta = {
    safeSetting: 'dark-mode',
    aspectRatio: '16:9',
    tags: ['promo', 'ugc'],
    apiKey: 'sk-live-secret-key-12345',
    stripeCustomerId: 'cus_99999',
    userToken: 'tok_abc123',
    billingPlan: 'pro_monthly',
    providerCost: 0.05,
    customUrl: 'https://user:password123@api.example.com/v1/webhook',
    nestedConfig: {
      password: 'super-secret-pass',
      bearerToken: 'bearer-xyz',
      safeSubKey: 'value'
    }
  };

  const clean = sanitizeMetadata(sensitiveMeta);

  assert.equal(clean.safeSetting, 'dark-mode');
  assert.equal(clean.aspectRatio, '16:9');
  assert.deepEqual(clean.tags, ['promo', 'ugc']);
  assert.equal(clean.apiKey, undefined);
  assert.equal(clean.stripeCustomerId, undefined);
  assert.equal(clean.userToken, undefined);
  assert.equal(clean.billingPlan, undefined);
  assert.equal(clean.providerCost, undefined);
  assert.equal(clean.customUrl, 'https://api.example.com/v1/webhook');
  assert.deepEqual(clean.nestedConfig, { safeSubKey: 'value' });

  // Source object must remain completely untouched
  assert.equal(sensitiveMeta.apiKey, 'sk-live-secret-key-12345');
  assert.equal(sensitiveMeta.stripeCustomerId, 'cus_99999');
});

test('ownership validation enforces matching non-empty user IDs and fails closed', () => {
  assert.throws(() => validateOwnership('', 'user_123'), (err) => err.code === 'MISSING_USER_ID');
  assert.throws(() => validateOwnership('user_123', ''), (err) => err.code === 'INVALID_PROJECT_OWNER');
  assert.throws(() => validateOwnership('user_123', 'user_456'), (err) => err.code === 'UNAUTHORIZED_OWNER');
  assert.ok(validateOwnership('user_123', 'user_123'));
});

test('status validation rejects invalid status values', () => {
  assert.throws(() => validateStatus('published'), (err) => err.code === 'INVALID_STATUS');
  assert.throws(() => validateStatus('deleted'), (err) => err.code === 'INVALID_STATUS');
  assert.throws(() => validateStatus(''), (err) => err.code === 'INVALID_STATUS');
  assert.ok(validateStatus('draft'));
  assert.ok(validateStatus('ready'));
  assert.ok(validateStatus('archived'));
});

test('createProjectRecord produces frozen deterministic project record with DI', () => {
  const di = mockDi('proj_001', '2026-10-18T10:00:00.000Z');
  const project = createProjectRecord({
    userId: 'user_alice',
    title: '<b>Alice Project</b>',
    description: 'Project description',
    status: 'ready',
    metadata: { aspectRatio: '9:16', apiKey: 'secret' },
    studioJobId: 'job_999',
    isFavorite: true
  }, di);

  assert.equal(project.id, 'proj_001');
  assert.equal(project.ownerUserId, 'user_alice');
  assert.equal(project.title, 'Alice Project');
  assert.equal(project.description, 'Project description');
  assert.equal(project.status, 'ready');
  assert.equal(project.isFavorite, true);
  assert.equal(project.studioJobId, 'job_999');
  assert.deepEqual(project.metadata, { aspectRatio: '9:16' });
  assert.equal(project.createdAt, '2026-10-18T10:00:00.000Z');
  assert.equal(project.updatedAt, '2026-10-18T10:00:00.000Z');
  assert.ok(Object.isFrozen(project));
});

test('createProjectRecord fails closed if userId or DI generator is missing', () => {
  assert.throws(() => createProjectRecord({ userId: '' }, mockDi()), (err) => err.code === 'MISSING_USER_ID');
  assert.throws(() => createProjectRecord({ userId: 'user_123' }, {}), (err) => err.code === 'MISSING_ID_GENERATOR');
});

test('two-account isolation: foreign user cannot rename, archive, restore, favorite, link job, or delete project', () => {
  const diInitial = mockDi('proj_alice', '2026-10-18T10:00:00.000Z');
  const aliceProject = createProjectRecord({
    userId: 'user_alice',
    title: 'Alice Confidential'
  }, diInitial);

  const eveParams = { userId: 'user_eve_attacker' };
  const diUpdate = mockDi('proj_alice', '2026-10-18T11:00:00.000Z');

  assert.throws(
    () => renameProjectRecord(aliceProject, { ...eveParams, title: 'Hacked Title' }, diUpdate),
    (err) => err.code === 'UNAUTHORIZED_OWNER'
  );

  assert.throws(
    () => archiveProjectRecord(aliceProject, eveParams, diUpdate),
    (err) => err.code === 'UNAUTHORIZED_OWNER'
  );

  const archivedAliceProject = archiveProjectRecord(aliceProject, { userId: 'user_alice' }, diUpdate);

  assert.throws(
    () => restoreProjectRecord(archivedAliceProject, eveParams, diUpdate),
    (err) => err.code === 'UNAUTHORIZED_OWNER'
  );

  assert.throws(
    () => toggleFavoriteProjectRecord(aliceProject, eveParams, diUpdate),
    (err) => err.code === 'UNAUTHORIZED_OWNER'
  );

  assert.throws(
    () => linkStudioJobRecord(aliceProject, { ...eveParams, studioJobId: 'job_123', jobOwnerUserId: 'user_eve_attacker' }, diUpdate),
    (err) => err.code === 'UNAUTHORIZED_OWNER'
  );

  assert.throws(
    () => deletePreflightProjectRecord(aliceProject, { ...eveParams, confirmProjectId: aliceProject.id, confirmed: true }),
    (err) => err.code === 'UNAUTHORIZED_OWNER'
  );
});

test('deletePreflightProjectRecord requires exact project ID and explicit confirmation, with zero write side-effects', () => {
  const project = createProjectRecord({
    userId: 'user_alice',
    title: 'ToDelete'
  }, mockDi('proj_del'));

  // Missing confirmation
  assert.throws(
    () => deletePreflightProjectRecord(project, { userId: 'user_alice', confirmProjectId: 'proj_del', confirmed: false }),
    (err) => err.code === 'CONFIRMATION_REQUIRED'
  );

  // Mismatched project ID
  assert.throws(
    () => deletePreflightProjectRecord(project, { userId: 'user_alice', confirmProjectId: 'proj_WRONG', confirmed: true }),
    (err) => err.code === 'PROJECT_ID_MISMATCH'
  );

  // Valid preflight
  const preflight = deletePreflightProjectRecord(project, {
    userId: 'user_alice',
    confirmProjectId: 'proj_del',
    confirmed: true
  });

  assert.equal(preflight.allowed, true);
  assert.equal(preflight.action, 'DELETE_PREFLIGHT_APPROVED');
  assert.equal(preflight.projectId, 'proj_del');
  assert.equal(preflight.ownerUserId, 'user_alice');

  // Verify project record is unmodified and intact
  assert.equal(project.id, 'proj_del');
  assert.equal(project.title, 'ToDelete');
});

test('duplicateProjectRecord isolates master template, forces draft status, strips secrets, and leaves source unmutated', () => {
  const masterTemplate = Object.freeze({
    id: 'template_product_ad',
    ownerUserId: 'system_admin',
    title: 'Master Product Ad Template',
    description: 'High converting UGC template',
    status: 'ready',
    isFavorite: true,
    studioJobId: 'system_job_001',
    metadata: {
      category: 'Product Ad',
      aspectRatio: '9:16',
      apiKey: 'secret_template_key',
      stripeCustomerId: 'cus_admin_billing'
    }
  });

  const diDup = mockDi('proj_bob_copy', '2026-10-18T14:00:00.000Z');

  const bobCopy = duplicateProjectRecord(masterTemplate, {
    userId: 'user_bob'
  }, diDup);

  assert.equal(bobCopy.id, 'proj_bob_copy');
  assert.equal(bobCopy.ownerUserId, 'user_bob');
  assert.equal(bobCopy.title, 'Copy of Master Product Ad Template');
  assert.equal(bobCopy.status, 'draft'); // Forced to draft
  assert.equal(bobCopy.isFavorite, false); // Favorite reset
  assert.equal(bobCopy.studioJobId, null); // Stripped foreign studioJobId
  assert.deepEqual(bobCopy.metadata, {
    category: 'Product Ad',
    aspectRatio: '9:16'
  }); // Secrets stripped!

  // Source template is completely untouched
  assert.equal(masterTemplate.status, 'ready');
  assert.equal(masterTemplate.metadata.apiKey, 'secret_template_key');
});

test('archive and restore flow transitions status correctly', () => {
  const di1 = mockDi('proj_flow', '2026-10-18T10:00:00.000Z');
  const project = createProjectRecord({ userId: 'user_alice', title: 'Flow Test', status: 'ready' }, di1);

  const di2 = mockDi('proj_flow', '2026-10-18T11:00:00.000Z');
  const archived = archiveProjectRecord(project, { userId: 'user_alice' }, di2);

  assert.equal(archived.status, 'archived');
  assert.equal(archived.updatedAt, '2026-10-18T11:00:00.000Z');

  const di3 = mockDi('proj_flow', '2026-10-18T12:00:00.000Z');
  const restored = restoreProjectRecord(archived, { userId: 'user_alice', targetStatus: 'ready' }, di3);

  assert.equal(restored.status, 'ready');
  assert.equal(restored.updatedAt, '2026-10-18T12:00:00.000Z');

  assert.throws(
    () => restoreProjectRecord(archived, { userId: 'user_alice', targetStatus: 'archived' }),
    (err) => err.code === 'INVALID_RESTORE_TARGET'
  );
});

test('linkStudioJobRecord enforces same authenticated user ownership for job and project', () => {
  const project = createProjectRecord({ userId: 'user_alice', title: 'Studio Project' }, mockDi('proj_studio'));

  // Foreign job owner fails closed
  assert.throws(
    () => linkStudioJobRecord(project, { userId: 'user_alice', studioJobId: 'job_456', jobOwnerUserId: 'user_bob' }),
    (err) => err.code === 'JOB_OWNER_MISMATCH'
  );

  // Authentic owner succeeds
  const linked = linkStudioJobRecord(project, { userId: 'user_alice', studioJobId: 'job_456', jobOwnerUserId: 'user_alice' }, mockDi('proj_studio', '2026-10-18T15:00:00.000Z'));

  assert.equal(linked.studioJobId, 'job_456');
  assert.equal(linked.updatedAt, '2026-10-18T15:00:00.000Z');
});
