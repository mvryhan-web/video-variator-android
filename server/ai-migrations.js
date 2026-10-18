import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';

export const AI_MIGRATION_FILES=Object.freeze([
 '20261015-admin-audit.sql',
 '20261015-ai-inspiration.sql',
 '20261015-ai-onboarding.sql',
 '20261015-ai-templates.sql',
 '20261015-generation-jobs.sql',
 '20261015-generation-reference-assets.sql',
 '20261016-ai-template-rights.sql',
 '20261017-provider-task-id-legacy.sql',
 '20261017-purchased-dispatch-claim.sql'
]);
export const migrationChecksum=sql=>createHash('sha256').update(String(sql)).digest('hex');

export async function loadAiMigrationManifest(){
 const items=[];for(const name of AI_MIGRATION_FILES){const sql=await readFile(new URL('./migrations/'+name,import.meta.url),'utf8');items.push({name,sql,checksum:migrationChecksum(sql)});}return items;
}
async function ensureLedger(db){
 await db.query(`CREATE TABLE IF NOT EXISTS vv_schema_migration(
  name TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 )`);
}
export async function aiMigrationStatus(pool){
 if(!pool)throw Error('DATABASE_NOT_CONFIGURED');const manifest=await loadAiMigrationManifest();
 const exists=await pool.query("SELECT to_regclass('vv_schema_migration') AS reg");if(!exists.rows[0]?.reg)return manifest.map(m=>({name:m.name,checksum:m.checksum,applied:false,checksumMatches:true,appliedAt:null}));
 const {rows}=await pool.query('SELECT name,checksum,applied_at FROM vv_schema_migration ORDER BY name'),applied=new Map(rows.map(r=>[r.name,r]));
 const known=new Set(manifest.map(m=>m.name));
 const status=manifest.map(m=>{const row=applied.get(m.name);return {name:m.name,checksum:m.checksum,applied:!!row,checksumMatches:!row||row.checksum===m.checksum,appliedAt:row?.applied_at||null};});
 // Fail closed if this DB has schema history not known to the current application.
 // Older/foreign migrations must not silently disappear from readiness checks.
 for(const row of rows)if(!known.has(row.name))status.push({
  name:row.name,checksum:row.checksum,applied:true,
  checksumMatches:false,unknown:true,appliedAt:row.applied_at||null
 });
 return status;
}
// Unique, application-owned advisory lock key. This protects the migration
// manifest+ledger across parallel deploy/startup processes on the same DB.
const AI_MIGRATION_LOCK='SELECT pg_advisory_lock(271828,20261016)';
const AI_MIGRATION_UNLOCK='SELECT pg_advisory_unlock(271828,20261016)';

export async function runAiMigrations(pool,{checkOnly=false}={}){
 if(!pool)throw Error('DATABASE_NOT_CONFIGURED');
 // A dry run is strictly SELECT-only and never acquires a session lock.
 if(checkOnly){
  const status=await aiMigrationStatus(pool);
  const drift=status.find(x=>x.applied&&!x.checksumMatches);
  if(drift)throw Error('MIGRATION_CHECKSUM_MISMATCH:'+drift.name);
  return {applied:[],pending:status.filter(x=>!x.applied).map(x=>x.name),status};
 }
 // Hold one dedicated connection while applying the entire manifest. Every
 // cooperating runner re-reads status *after* the lock has been acquired.
 const c=await pool.connect();let locked=false,lockAttempted=false;
 try{
  lockAttempted=true;
  await c.query(AI_MIGRATION_LOCK);locked=true;
  await ensureLedger(c);
  const manifest=await loadAiMigrationManifest(),status=await aiMigrationStatus(c);
  const drift=status.find(x=>x.applied&&!x.checksumMatches);
  if(drift)throw Error('MIGRATION_CHECKSUM_MISMATCH:'+drift.name);
  const applied=[];
  for(const m of manifest){
   if(status.find(x=>x.name===m.name)?.applied)continue;
   try{
    await c.query('BEGIN');
    await c.query(m.sql);
    await c.query('INSERT INTO vv_schema_migration(name,checksum) VALUES($1,$2)',[m.name,m.checksum]);
    await c.query('COMMIT');
    applied.push(m.name);
   }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}
  }
  return {applied,pending:[],status:await aiMigrationStatus(c)};
 }finally{
  // A failed unlock cannot return a potentially locked session to the pool.
  // node-postgres release(true) destroys the client, releasing session locks.
  // A rejected lock query may have reached PostgreSQL and acquired the lock.
  // Discard any uncertain session rather than reuse it in the shared pool.
  let destroy=lockAttempted&&!locked;
  if(locked){
   try{
    const result=await c.query(AI_MIGRATION_UNLOCK);
    if(result.rows?.[0]?.pg_advisory_unlock!==true)destroy=true;
   }catch(_){destroy=true;}
  }
  c.release(destroy);
 }
}
