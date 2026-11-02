import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {recordAdminAudit} from './admin-audit.js';

const TYPES=new Set(['image','video','avatar','audio']);
const STUDIO_PROMPT_LIMIT=2000;
const NAME_TOKEN=/\{\{\s*product_name\s*\}\}/i;
const INPUTS=new Set(['image','video','audio','logo','product_name','text']);
const initByPool=new WeakMap();
const RIGHTS=new Set(['owned','licensed']);
function featureEnabled(env){const value=env.AI_APPS_ENABLED;return value==='true'||(env.NODE_ENV!=='production'&&value!=='false');}

function owner(user,env){return !!(user&&env.ADMIN_EMAIL&&user.provider==='google'&&String(user.email||'').trim().toLowerCase()===String(env.ADMIN_EMAIL).trim().toLowerCase());}
function text(v,max,{required=false}={}){const s=String(v??'').trim();if((required&&!s)||s.length>max)throw Error('INVALID_TEMPLATE');return s;}
function slug(v){const s=String(v??'').trim().toLowerCase();if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)||s.length>100)throw Error('INVALID_TEMPLATE');return s;}
function model(v){if(v==null||v==='')return null;const s=String(v);if(!/^[A-Za-z0-9._:-]{1,120}$/.test(s))throw Error('INVALID_TEMPLATE');return s;}
function thumbnail(v){if(v==null||v==='')return null;const s=String(v).trim();if(s.length>500)throw Error('INVALID_TEMPLATE');if(s.startsWith('/')&&!s.startsWith('//')&&!s.includes('\\'))return s;try{const u=new URL(s);if(u.protocol!=='https:'||u.username||u.password)throw Error();return u.toString();}catch(_){throw Error('INVALID_TEMPLATE');}}
function jsonObject(v,max=5000){if(v==null)return {};if(typeof v!=='object'||Array.isArray(v))throw Error('INVALID_TEMPLATE');const raw=JSON.stringify(v);if(raw.length>max)throw Error('INVALID_TEMPLATE');return v;}
function inputTypes(v){if(v==null)return [];if(!Array.isArray(v)||v.length>10||v.some(x=>!INPUTS.has(x))||new Set(v).size!==v.length)throw Error('INVALID_TEMPLATE');return v;}
function rights(v){if(v==null||v==='')return null;if(!RIGHTS.has(v))throw Error('INVALID_TEMPLATE');return v;}
function bool(v,def=false){if(v==null)return def;if(typeof v!=='boolean')throw Error('INVALID_TEMPLATE');return v;}
function order(v,def=100){if(v==null)return def;if(!Number.isInteger(v)||v<0||v>100000)throw Error('INVALID_TEMPLATE');return v;}

export async function initTemplates(pool,env=process.env){
 if(!pool)throw Error('DATABASE_NOT_CONFIGURED');
 let pending=initByPool.get(pool);
 if(!pending){
  pending=(async()=>{
   if(env.NODE_ENV==='production'){
    // Do not run database migrations from production page/API requests.
    const {rows}=await pool.query("SELECT COUNT(*)::integer AS present FROM information_schema.columns WHERE table_schema='public' AND table_name='vv_ai_template' AND column_name IN ('rights_basis','rights_note')");
    if(Number(rows?.[0]?.present)!==2)throw Error('TEMPLATE_RIGHTS_MIGRATION_REQUIRED');
   }else{
    const create=await readFile(new URL('./migrations/20261015-ai-templates.sql',import.meta.url),'utf8');
    const rights=await readFile(new URL('./migrations/20261016-ai-template-rights.sql',import.meta.url),'utf8');
    await pool.query(create);await pool.query(rights);
   }
  })().catch(e=>{initByPool.delete(pool);throw e;});
  initByPool.set(pool,pending);
 }
 await pending;
}
export function validateTemplate(value,current={}){
 const type=value.generationType??current.generationType;if(!TYPES.has(type))throw Error('INVALID_TEMPLATE');
 const active=bool(value.active,current.active??false),featured=bool(value.featured,current.featured??false);
 const rightsBasis=rights(value.rightsBasis===undefined?current.rightsBasis:value.rightsBasis);
 const rightsNote=text(value.rightsNote===undefined?current.rightsNote:value.rightsNote,300);
 const requiredInputs=inputTypes(value.requiredInputTypes===undefined?current.requiredInputTypes:value.requiredInputTypes);
 const promptValue=value.promptTemplate??current.promptTemplate;
 // A published prompt is authored text, never implicit JSON object/array/number coercion.
 if(typeof promptValue!=='string')throw Error('INVALID_TEMPLATE');
 const prompt=text(promptValue,4000,{required:true});
 // Keep published Product Name templates usable through the real AI Apps handoff.
 if(active&&requiredInputs.includes('product_name')&&!/\{\{\s*product_name\s*\}\}/i.test(prompt))throw Error('TEMPLATE_PRODUCT_NAME_PLACEHOLDER_REQUIRED');
 // Unpublished drafts may exceed the handoff limit; never activate a prompt that Studio would truncate.
 // Placeholder substitution must fit Studio even for the shortest valid one-character name.
 if(active&&(NAME_TOKEN.test(prompt)?prompt.replace(/\{\{\s*product_name\s*\}\}/gi,'X').length:prompt.length)>STUDIO_PROMPT_LIMIT)throw Error('TEMPLATE_STUDIO_PROMPT_TOO_LONG');
 if(active&&(!rightsBasis||rightsNote.length<3))throw Error('TEMPLATE_RIGHTS_REQUIRED');
 if(featured&&!active)throw Error('INVALID_TEMPLATE');
 return {
  title:text(value.title??current.title,120,{required:true}),
  slug:slug(value.slug??current.slug),
  category:text(value.category??current.category,80,{required:true}),
  description:text(value.description??current.description??'',600),
  thumbnail:thumbnail(value.thumbnail===undefined?current.thumbnail:value.thumbnail),
  generationType:type,
  promptTemplate:prompt,
  defaultModel:model(value.defaultModel===undefined?current.defaultModel:value.defaultModel),
  requiredInputTypes:requiredInputs,
  defaultSettings:jsonObject(value.defaultSettings===undefined?current.defaultSettings:value.defaultSettings),
  active,featured,rightsBasis,rightsNote,
  sortOrder:order(value.sortOrder,current.sortOrder??100)
 };
}
function row(r,{ownerView=false}={}){
 const item={id:r.id,title:r.title,slug:r.slug,category:r.category,description:r.description||'',thumbnail:r.thumbnail||null,generationType:r.generation_type,promptTemplate:r.prompt_template,defaultModel:r.default_model||null,requiredInputTypes:r.required_input_types||[],defaultSettings:r.default_settings||{},active:!!r.active,featured:!!r.featured,sortOrder:Number(r.sort_order||0),createdAt:r.created_at,updatedAt:r.updated_at};
 if(ownerView){item.rightsBasis=r.rights_basis||null;item.rightsNote=r.rights_note||'';}
 return item;
}

export function installGenerationTemplates(app,{auth,pool,env=process.env}){
 app.get('/api/templates',async(req,res)=>{if(!featureEnabled(env))return res.status(503).json({error:'AI_APPS_NOT_ENABLED'});try{
  await initTemplates(pool,env);const where=["active=true","generation_type!='product_video'","rights_basis IN ('owned','licensed')","length(trim(rights_note))>=3"],args=[];
  if(req.query.category){args.push(String(req.query.category).slice(0,80));where.push(`category=$${args.length}`);}
  if(req.query.type){args.push(String(req.query.type).slice(0,40));where.push(`generation_type=$${args.length}`);}
  if(req.query.featured==='true')where.push('featured=true');
  const {rows}=await pool.query(`SELECT * FROM vv_ai_template WHERE ${where.join(' AND ')} ORDER BY featured DESC,sort_order ASC,title ASC LIMIT 100`,args);
  res.json({items:rows.map(row)});
 }catch(_){res.status(503).json({error:'TEMPLATES_UNAVAILABLE'});}});
 app.get('/api/templates/:slug',async(req,res)=>{if(!featureEnabled(env))return res.status(503).json({error:'AI_APPS_NOT_ENABLED'});try{await initTemplates(pool,env);const {rows}=await pool.query("SELECT * FROM vv_ai_template WHERE slug=$1 AND active=true AND generation_type!='product_video' AND rights_basis IN ('owned','licensed') AND length(trim(rights_note))>=3",[req.params.slug]);if(!rows.length)return res.status(404).json({error:'TEMPLATE_NOT_FOUND'});res.json({template:row(rows[0])});}catch(_){res.status(503).json({error:'TEMPLATES_UNAVAILABLE'});}});
 const onlyOwner=(req,res,next)=>owner(req.user,env)?next():res.status(403).json({error:'OWNER_ONLY'});
 app.get('/api/studio/admin/templates',auth,onlyOwner,async(_req,res)=>{try{await initTemplates(pool,env);const {rows}=await pool.query("SELECT * FROM vv_ai_template WHERE generation_type!='product_video' ORDER BY sort_order ASC,title ASC");res.json({items:rows.map(r=>row(r,{ownerView:true}))});}catch(_){res.status(503).json({error:'TEMPLATES_UNAVAILABLE'});}});
 app.post('/api/studio/admin/templates',auth,onlyOwner,async(req,res)=>{try{
  await initTemplates(pool,env);const t=validateTemplate(req.body),id=randomUUID();
  const {rows}=await pool.query(`INSERT INTO vv_ai_template(id,title,slug,category,description,thumbnail,generation_type,prompt_template,default_model,required_input_types,default_settings,active,featured,sort_order,created_by,rights_basis,rights_note)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12,$13,$14,$15,$16,$17) RETURNING *`,
   [id,t.title,t.slug,t.category,t.description,t.thumbnail,t.generationType,t.promptTemplate,t.defaultModel,JSON.stringify(t.requiredInputTypes),JSON.stringify(t.defaultSettings),t.active,t.featured,t.sortOrder,req.user.id,t.rightsBasis,t.rightsNote]);
  const created=row(rows[0],{ownerView:true});await recordAdminAudit(pool,{actorUserId:req.user.id,action:'template.create',targetType:'template',targetId:id,details:{slug:created.slug,category:created.category,generationType:created.generationType,active:created.active,featured:created.featured,sortOrder:created.sortOrder}});res.status(201).json({template:created});
 }catch(e){res.status(e?.code==='23505'?409:(e.message==='INVALID_TEMPLATE'||e.message==='TEMPLATE_RIGHTS_REQUIRED'||(e.message==='TEMPLATE_PRODUCT_NAME_PLACEHOLDER_REQUIRED'||e.message==='TEMPLATE_STUDIO_PROMPT_TOO_LONG'))?400:503).json({error:e?.code==='23505'?'TEMPLATE_SLUG_EXISTS':e.message==='INVALID_TEMPLATE'?'INVALID_TEMPLATE':e.message==='TEMPLATE_RIGHTS_REQUIRED'?'TEMPLATE_RIGHTS_REQUIRED':e.message==='TEMPLATE_PRODUCT_NAME_PLACEHOLDER_REQUIRED'?'TEMPLATE_PRODUCT_NAME_PLACEHOLDER_REQUIRED':e.message==='TEMPLATE_STUDIO_PROMPT_TOO_LONG'?'TEMPLATE_STUDIO_PROMPT_TOO_LONG':'TEMPLATES_UNAVAILABLE'});}});
 app.patch('/api/studio/admin/templates/:id',auth,onlyOwner,async(req,res)=>{try{
  await initTemplates(pool,env);const current=await pool.query('SELECT * FROM vv_ai_template WHERE id=$1',[req.params.id]);if(!current.rows.length)return res.status(404).json({error:'TEMPLATE_NOT_FOUND'});
  const t=validateTemplate(req.body,row(current.rows[0],{ownerView:true}));
  const {rows}=await pool.query(`UPDATE vv_ai_template SET title=$2,slug=$3,category=$4,description=$5,thumbnail=$6,generation_type=$7,prompt_template=$8,default_model=$9,required_input_types=$10::jsonb,default_settings=$11::jsonb,active=$12,featured=$13,sort_order=$14,rights_basis=$15,rights_note=$16,updated_at=NOW() WHERE id=$1 RETURNING *`,
   [req.params.id,t.title,t.slug,t.category,t.description,t.thumbnail,t.generationType,t.promptTemplate,t.defaultModel,JSON.stringify(t.requiredInputTypes),JSON.stringify(t.defaultSettings),t.active,t.featured,t.sortOrder,t.rightsBasis,t.rightsNote]);
  const updated=row(rows[0],{ownerView:true});await recordAdminAudit(pool,{actorUserId:req.user.id,action:'template.update',targetType:'template',targetId:req.params.id,details:{slug:updated.slug,category:updated.category,generationType:updated.generationType,active:updated.active,featured:updated.featured,sortOrder:updated.sortOrder}});res.json({template:updated});
 }catch(e){res.status(e?.code==='23505'?409:(e.message==='INVALID_TEMPLATE'||e.message==='TEMPLATE_RIGHTS_REQUIRED'||(e.message==='TEMPLATE_PRODUCT_NAME_PLACEHOLDER_REQUIRED'||e.message==='TEMPLATE_STUDIO_PROMPT_TOO_LONG'))?400:503).json({error:e?.code==='23505'?'TEMPLATE_SLUG_EXISTS':e.message==='INVALID_TEMPLATE'?'INVALID_TEMPLATE':e.message==='TEMPLATE_RIGHTS_REQUIRED'?'TEMPLATE_RIGHTS_REQUIRED':e.message==='TEMPLATE_PRODUCT_NAME_PLACEHOLDER_REQUIRED'?'TEMPLATE_PRODUCT_NAME_PLACEHOLDER_REQUIRED':e.message==='TEMPLATE_STUDIO_PROMPT_TOO_LONG'?'TEMPLATE_STUDIO_PROMPT_TOO_LONG':'TEMPLATES_UNAVAILABLE'});}});
}
