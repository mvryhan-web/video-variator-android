import 'dotenv/config';
import pg from 'pg';
import {generationReadiness} from './generation-readiness.js';
import {aiMigrationStatus} from './ai-migrations.js';
import {safeAiPreflightError} from './ai-preflight-errors.js';

const env=process.env,base=generationReadiness(env),report={launchReady:false,configBlockers:[...base.blockers],migrationReady:false,migrations:[],billing:base.billing,providers:base.providers,storage:base.storage,entitlements:base.entitlements};
let pool=null;
try{
 if(env.DATABASE_URL){
  const {Pool}=pg;pool=new Pool({connectionString:env.DATABASE_URL,ssl:env.DATABASE_SSL==='false'?false:{rejectUnauthorized:false}});
  report.migrations=await aiMigrationStatus(pool);report.migrationReady=report.migrations.every(x=>x.applied&&x.checksumMatches);
 }else report.migrations=[];
 report.launchReady=base.launchReady&&report.migrationReady;
 console.log(JSON.stringify(report,null,2));
 if(!report.launchReady)process.exitCode=2;
}catch(e){
 console.error(JSON.stringify({launchReady:false,error:safeAiPreflightError(e)},null,2));process.exitCode=3;
}finally{await pool?.end().catch(()=>{});}
