// Offline migration-contract checks. These do NOT execute SQL against production.
// The D owner must additionally run the migration twice against a disposable PostgreSQL
// database containing an existing vv_generation_jobs table without provider_task_id.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(new URL('../server/migrations/20261015-generation-jobs.sql', import.meta.url), 'utf8');
const legacyOperation = 'ALTER TABLE vv_generation_jobs ADD COLUMN IF NOT EXISTS operation TEXT;';
const legacyGenerated = /ALTER TABLE vv_generation_jobs ADD COLUMN IF NOT EXISTS provider_task_id TEXT GENERATED ALWAYS AS \(\s*CASE\s+WHEN operation LIKE 'byteplus:%' THEN substring\(operation FROM 10\)\s+ELSE operation\s+END\s*\) STORED;/g;
const index = 'CREATE INDEX IF NOT EXISTS vv_generation_jobs_provider_task_idx';

test('new installs retain generated provider task ID', () => {
  assert.match(sql, /provider_task_id TEXT GENERATED ALWAYS AS \(\s*CASE\s+WHEN operation LIKE 'byteplus:%' THEN substring\(operation FROM 10\)\s+ELSE operation\s+END\s*\) STORED,/);
});

test('legacy upgrades add generated column after operation and before index', () => {
  assert.ok(sql.includes(legacyOperation));
  assert.equal([...sql.matchAll(legacyGenerated)].length, 1, 'exactly one idempotent legacy add-column operation');
  const addOperation = sql.indexOf(legacyOperation);
  const addGenerated = sql.indexOf('ALTER TABLE vv_generation_jobs ADD COLUMN IF NOT EXISTS provider_task_id');
  const buildIndex = sql.indexOf(index);
  assert.ok(addOperation >= 0 && addOperation < addGenerated && addGenerated < buildIndex);
});

test('existing table migration is repeat-safe, does not backfill or overwrite task IDs', () => {
  assert.match(sql, /ADD COLUMN IF NOT EXISTS provider_task_id TEXT GENERATED ALWAYS AS/);
  assert.doesNotMatch(sql, /UPDATE vv_generation_jobs\s+SET provider_task_id/i);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS vv_generation_jobs_provider_task_idx\s+ON vv_generation_jobs\(provider,provider_task_id\)/);
});
