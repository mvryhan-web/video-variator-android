import test from 'node:test';
import assert from 'node:assert/strict';
import {AI_MIGRATION_FILES,loadAiMigrationManifest,migrationChecksum} from '../server/ai-migrations.js';

test('AI migration manifest is ordered, unique and checksum-stable',async()=>{
 assert.deepEqual(AI_MIGRATION_FILES,[...AI_MIGRATION_FILES].sort());
 assert.equal(new Set(AI_MIGRATION_FILES).size,AI_MIGRATION_FILES.length);
 const manifest=await loadAiMigrationManifest();assert.equal(manifest.length,AI_MIGRATION_FILES.length);
 for(const m of manifest){assert.ok(m.sql.length>50);assert.match(m.checksum,/^[a-f0-9]{64}$/);assert.equal(m.checksum,migrationChecksum(m.sql));}
});
