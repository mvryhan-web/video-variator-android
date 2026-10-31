import 'dotenv/config';
import pg from 'pg';
import {runAiMigrations} from './ai-migrations.js';
import {safeAiPreflightError} from './ai-preflight-errors.js';
const {Pool}=pg,url=process.env.DATABASE_URL;
if(!url){console.error('DATABASE_URL is required');process.exit(1);}
const checkOnly=process.argv.includes('--check');let pool;
try{
 pool=new Pool({connectionString:url,ssl:process.env.DATABASE_SSL==='false'?false:{rejectUnauthorized:false}});
 const result=await runAiMigrations(pool,{checkOnly});
 console.log(JSON.stringify({mode:checkOnly?'check':'apply',applied:result.applied,pending:result.pending,status:result.status.map(x=>({name:x.name,applied:x.applied,checksumMatches:x.checksumMatches}))},null,2));
 if(checkOnly&&result.pending.length)process.exitCode=2;
}catch(e){
 // Do not let pg/URI parser errors with DSNs/passwords escape as Node stacks.
 console.error(JSON.stringify({mode:checkOnly?'check':'apply',error:safeAiPreflightError(e)},null,2));
 process.exitCode=3;
}finally{await pool?.end().catch(()=>{});}
