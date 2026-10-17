/**
 * Read-only design preview for Deepsyq. Serves the exact existing frontend assets
 * without importing production auth, billing, database or AI provider modules.
 * Run as a SEPARATE Render service, never instead of the production entrypoint.
 */
import express from 'express';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {MODEL_CATALOG} from '../app/src/main/assets/generate-models.js';

const app=express();
const port=Number(process.env.PORT||31990);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const assets=path.join(root,'app','src','main','assets');
const disabled={error:'PREVIEW_ONLY',message:'This is a design preview. Accounts, payments and paid AI generation are disabled.'};

app.disable('x-powered-by');
app.use((_req,res,next)=>{
 res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 next();
});
app.get('/robots.txt',(_req,res)=>res.type('text/plain').send('User-agent: *\nDisallow: /\n'));
app.get('/api/health',(_req,res)=>res.json({ok:true,service:'deepsyq-design-preview',paymentsEnabled:false,aiGenerationEnabled:false}));
app.get('/api/config',(_req,res)=>res.json({
 googleClientId:'',appleClientId:'',emailAuth:false,billingConfigured:false,trialLimit:0,
 features:{aiApps:true,productVideo:true,onboarding:false},
 plans:{
  basic:{price:9,limit:750},pro:{price:24,limit:2250},
  business:{price:99,limit:15000},lifetime:{price:2999,currency:'eur'}
 }
}));
app.get('/api/studio/config',(_req,res)=>res.json({
 enabled:false,ownerOnly:true,publicGenerationEnabled:false,pricingConfigured:false,
 models:[],catalog:MODEL_CATALOG.map(m=>({...m,enabled:false})),translation:{enabled:false,reason:'PREVIEW_ONLY'}
}));
app.get('/api/templates',(_req,res)=>res.json({items:[]}));
app.get('/api/auth/email/status',(_req,res)=>res.json({configured:false}));
app.use('/api',(_req,res)=>res.status(503).json(disabled));
const banner='<div role="status" style="position:relative;z-index:90;padding:12px 20px;text-align:center;background:#3d3320;color:#f6e9cb;font:600 13px system-ui">Deepsyq design preview · Work in progress · Sign-in, payments and paid AI generation are disabled.</div>';
async function homepage(_req,res){
 try{
  const html=await readFile(path.join(assets,'deepsyq.html'),'utf8');
  res.type('html').send(html.replace('<body>','<body>'+banner));
 }catch(_){res.status(503).type('text/plain').send('Preview assets are unavailable');}
}
app.get(['/','/dashboard','/deepsyq.html'],homepage);
app.use(express.static(assets,{extensions:['html'],index:false,fallthrough:true}));
app.use((req,res)=>{
 if(req.method!=='GET'&&req.method!=='HEAD')return res.status(405).type('text/plain').send('PREVIEW_READ_ONLY');
 res.status(404).type('text/plain').send('Not found');
});
app.listen(port,()=>console.log('Deepsyq design preview running on port '+port));
