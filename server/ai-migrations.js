import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';

export const AI_MIGRATION_FILES=Object.freeze([
 '20261015-admin-audit.sql',
 '20261015-ai-onboarding.sql',
 '20261015-ai-templates.sql',
 '20261015-generation-jobs.sql'
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
 const exists=await pool.query("SELECT to_regclass('public.vv_schema_migration') AS reg");if(!exists.rows[0]?.reg)return manifest.map(m=>({name:m.name,checksum:m.checksum,applied:false,checksumMatches:true,appliedAt:null}));
 const {rows}=await pool.query('SELECT name,checksum,applied_at FROM vv_schema_migration ORDER BY name'),applied=new Map(rows.map(r=>[r.name,r]));
 return manifest.map(m=>{const row=applied.get(m.name);return {name:m.name,checksum:m.checksum,applied:!!row,checksumMatches:!row||row.checksum===m.checksum,appliedAt:row?.applied_at||null};});
}
export async function runAiMigrations(pool,{checkOnly=false}={}){
 if(!pool)throw Error('DATABASE_NOT_CONFIGURED');await ensureLedger(pool);const manifest=await loadAiMigrationManifest(),status=await aiMigrationStatus(pool);
 const drift=status.find(x=>x.applied&&!x.checksumMatches);if(drift)throw Error('MIGRATION_CHECKSUM_MISMATCH:'+drift.name);
 if(checkOnly)return {applied:[],pending:status.filter(x=>!x.applied).map(x=>x.name),status};
 const applied=[];
 for(const m of manifest){
  const current=status.find(x=>x.name===m.name);if(current?.applied)continue;
  const c=await pool.connect();try{await c.query('BEGIN');await c.query(m.sql);await c.query('INSERT INTO vv_schema_migration(name,checksum) VALUES($1,$2)',[m.name,m.checksum]);await c.query('COMMIT');applied.push(m.name);}catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}
 }
 return {applied,pending:[],status:await aiMigrationStatus(pool)};
}
