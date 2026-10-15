import 'dotenv/config';
import pg from 'pg';
import {pathToFileURL} from 'node:url';
import {generationReadiness} from './generation-readiness.js';
import {aiMigrationStatus} from './ai-migrations.js';

// Configuration/schema inspection only: never calls a provider or applies migrations.
export async function runAiPreflight(env=process.env,{
 createPool=options=>new pg.Pool(options),migrationStatus=aiMigrationStatus,
 readiness=generationReadiness
}={}){
 let pool=null;
 const report={launchReady:false,verificationScope:'configuration-and-migration-ledger',
  externalVerificationRequired:['provider-generation','storage-roundtrip','worker-runtime','stripe-purchase-refund','device-acceptance']};
 let exitCode=2;
 try{
  const base=readiness(env);
  Object.assign(report,{configBlockers:[...base.blockers],migrationReady:false,migrations:[],
   billing:base.billing,providers:base.providers,storage:base.storage,entitlements:base.entitlements});
  if(env.DATABASE_URL){
   pool=createPool({connectionString:env.DATABASE_URL,
    ssl:env.DATABASE_SSL==='false'?false:{rejectUnauthorized:false},
    connectionTimeoutMillis:10000,statement_timeout:10000,query_timeout:12000});
   report.migrations=await migrationStatus(pool);
   report.migrationReady=report.migrations.length>0&&report.migrations.every(x=>x.applied&&x.checksumMatches);
  }
  report.launchReady=base.launchReady&&report.migrationReady;
  exitCode=report.launchReady?0:2;
 }catch{
  // Driver/provider messages can contain credentials, connection strings or SQL.
  // Never echo upstream messages, codes or stack traces in the CLI report.
  report.launchReady=false;report.error='PREFLIGHT_CHECK_FAILED';exitCode=3;
 }finally{
  if(pool){try{await pool.end();}catch{report.launchReady=false;report.error='PREFLIGHT_CLEANUP_FAILED';exitCode=3;}}
 }
 return {report,exitCode};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const {report,exitCode}=await runAiPreflight();
 console.log(JSON.stringify(report,null,2));process.exitCode=exitCode;
}
