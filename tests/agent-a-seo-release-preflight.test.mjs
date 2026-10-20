// Agent A / SEO #156: read-only, offline, $0 release diagnostics.
// Default CI checks preview safety and prints *launch blockers* without enabling indexing.
// Explicit SEO_RELEASE_STRICT=1 is a future-release gate, never a production deploy.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access,appendFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const assets=resolve(root,'app/src/main/assets');
const pages=['deepsyq.html','ai-apps.html','free-tools.html','ai-pricing.html','deepsyq-vs-deepseek.html'];
const read=path=>readFile(resolve(root,path),'utf8');
const page=name=>readFile(resolve(assets,name),'utf8');
const fields=tag=>Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)].map(m=>[m[1].toLowerCase(),m[3]]));
const elements=(html,tag)=>[...html.matchAll(new RegExp('<'+tag+'\\b[^>]*>','gi'))].map(m=>fields(m[0]));
const metas=html=>elements(html,'meta');
const meta=(html,name)=>metas(html).find(m=>m.name?.toLowerCase()===name)?.content||'';
const links=html=>elements(html,'link');
const canonical=html=>links(html).find(l=>l.rel?.toLowerCase()==='canonical')?.href||'';
const robots=html=>meta(html,'robots').toLowerCase();
const isNoindex=html=>/(^|[\s,])noindex([\s,]|$)/.test(robots(html));
const locations=xml=>[...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map(m=>m[1].trim());
const unique=values=>[...new Set(values)];
const findings=[];

function note(code,detail) {
 findings.push({code,detail});
}
function localLinks(html) {
 const out=[];
 for(const a of elements(html,'a')){
  const href=a.href?.trim();
  if(!href||href.startsWith('#')||/^(?:mailto:|tel:|javascript:|data:)/i.test(href))continue;
  let url;
  try{url=new URL(href,'https://deepsyq-local.invalid/');}catch{note('INVALID_LINK','unparseable '+href);continue;}
  if(url.hostname!=='deepsyq-local.invalid')continue;
  const path=decodeURIComponent(url.pathname);
  if(!path.startsWith('/')||path.includes('\0')){note('INVALID_LINK','unsafe '+href);continue;}
  out.push({href,path});
 }
 return out;
}

test('preview source is forcibly noindex, disallowed to all crawlers and retired Product Video routes are 404',async()=>{
 const preview=await read('server/deepsyq-preview.js');
 assert.match(preview,/setHeader\(\s*['"]X-Robots-Tag['"]\s*,\s*['"]noindex,\s*nofollow,\s*noarchive['"]\s*\)/i);
 assert.match(preview,/app\.get\(\s*['"]\/robots\.txt['"]/);
 assert.match(preview,/Disallow:\s*\//);
 assert.match(preview,/app\.get\(\s*\[\s*['"]\/product-video['"]\s*,\s*['"]\/product-video\.html['"]\s*\]/);
 assert.match(preview,/res\.status\(404\)/);
});

test('cancelled Product Video is absent from public sitemap, navigation links and dedicated page',async()=>{
 const xml=await page('sitemap.xml');
 assert.doesNotMatch(xml,/<loc>[^<]*\/product-video(?:\.html)?(?:[?#][^<]*)?<\/loc>/i);
 await assert.rejects(access(resolve(assets,'product-video.html')),err=>err.code==='ENOENT');
 await assert.rejects(access(resolve(assets,'product-video.js')),err=>err.code==='ENOENT');
 for(const name of pages){
  const html=await page(name);
  const retired=localLinks(html).filter(l=>/^\/product-video(?:\.html)?\/?$/i.test(l.path));
  assert.deepEqual(retired,[],name+' must not link to cancelled product');
 }
});

test('sampled public navigation has no missing local HTML targets',async()=>{
 const missing=[];
 for(const name of pages){
  const html=await page(name);
  for(const link of localLinks(html)){
   if(link.path==='/')continue;
   const target=resolve(assets,'.'+link.path);
   if(!target.startsWith(assets+'/')){missing.push(name+': unsafe '+link.href);continue;}
   try{await access(target);}catch{missing.push(name+' -> '+link.href);}
  }
 }
 assert.deepEqual(unique(missing),[],'broken first-party public links');
});

test('report truthful international SEO blockers; explicit strict release check fails until remedied',async()=>{
 const xml=await page('sitemap.xml'),robotsText=await page('robots.txt');
 const sitemap=locations(xml),sitemapSet=new Set(sitemap);
 assert.ok(sitemap.length>0,'sitemap must list actual URLs');
 assert.equal(sitemapSet.size,sitemap.length,'sitemap duplicate entries');
 assert.match(xml,/<urlset\b/i);
 assert.match(robotsText,/^User-agent:\s*\*/mi);
 const sitemapRef=robotsText.match(/^Sitemap:\s*(https?:\/\/\S+)/mi)?.[1]||'';
 if(!sitemapRef)note('ROBOTS_SITEMAP','robots.txt lacks absolute Sitemap declaration');
 if(!/^Disallow:\s*\/api\/\s*$/mi.test(robotsText))note('ROBOTS_PRIVATE','public robots.txt should disallow /api/');
 if(!/^Disallow:\s*\/deepsyq-admin\.html\s*$/mi.test(robotsText))note('ROBOTS_ADMIN','public robots.txt should disallow owner admin');
 if(sitemapRef && !sitemapRef.endsWith('/sitemap.xml'))note('ROBOTS_SITEMAP','robots sitemap path unexpected');
 const listedOrigins=unique(sitemap.map(loc=>{try{return new URL(loc).origin;}catch{return 'INVALID_URL';}}));
 if(listedOrigins.length!==1||listedOrigins.includes('INVALID_URL'))note('SITEMAP_ORIGIN','sitemap URLs do not share a valid origin');
 if(sitemapRef && listedOrigins.length===1 && new URL(sitemapRef).origin!==listedOrigins[0])note('SITEMAP_ORIGIN','sitemap and robots origins disagree');
 const publicOrigin=process.env.SEO_PUBLIC_ORIGIN?.replace(/\/$/,'')||'';
 if(!publicOrigin)note('PUBLIC_HOST_UNCONFIRMED','owner/D must approve actual launch hostname; source legacy host is not live indexation proof');
 else if(listedOrigins.length!==1||listedOrigins[0]!==publicOrigin)note('PUBLIC_HOST_MISMATCH','sitemap origin differs from approved SEO_PUBLIC_ORIGIN');
 const htmlByPath=new Map();
 for(const name of pages){
  const html=await page(name),path='/'+name;
  htmlByPath.set(path,html);
  if(!/<html\b[^>]*\blang\s*=/i.test(html))note('LANG_MISSING',name+' lacks html lang');
  if(!/<title>\s*[^<\s][\s\S]*?<\/title>/i.test(html))note('TITLE_MISSING',name+' lacks useful title');
  if(!meta(html,'description'))note('META_DESCRIPTION_MISSING',name+' has no static meta description');
  if(!canonical(html))note('CANONICAL_MISSING',name+' has no canonical');
  else {
   try {
    const url=new URL(canonical(html));
    if(url.pathname!==path && !(name==='deepsyq.html'&&url.pathname==='/'))note('CANONICAL_PATH_MISMATCH',name+' canonical='+url.pathname);
    if(publicOrigin && url.origin!==publicOrigin)note('CANONICAL_HOST_MISMATCH',name+' canonical origin not approved');
   }catch{note('CANONICAL_INVALID',name+' canonical invalid URL');}
  }
  if(!/<script\b[^>]*type=["']application\/ld\+json["']/i.test(html))note('STRUCTURED_DATA_REVIEW',name+' has no source-visible JSON-LD; add only truthful and validated data when warranted');
 }
 // Home may be served at /; its canonical is '/' while the preview HTML is deepsyq.html.
 htmlByPath.set('/',htmlByPath.get('/deepsyq.html'));
 for(const raw of sitemap){
  let url;
  try{url=new URL(raw);}catch{note('SITEMAP_INVALID_URL',raw);continue;}
  const pathname=url.pathname;
  if(/\/api\/|\/admin|\/auth|\/history|\/product-video/i.test(pathname))note('SITEMAP_PRIVATE_OR_RETIRED','unsafe sitemap URL '+pathname);
  const html=htmlByPath.get(pathname);
  if(html && isNoindex(html))note('SITEMAP_NOINDEX','sitemap contains noindex source '+pathname);
  if(html && canonical(html) && url.toString()!==canonical(html))note('SITEMAP_CANONICAL_MISMATCH',pathname+' differs from HTML canonical');
  if(!html){
   const local=pathname==='/'?'index.html':pathname.slice(1);
   try{await access(resolve(assets,local));}catch{note('SITEMAP_MISSING_PAGE',pathname+' missing from static assets');}
  }
 }
 // Dynamic JS-inserted content/SSR, production 200s, GSC/Bing indexing, AI crawlers, hreflang,
 // consent/legal, rights and Core Web Vitals CANNOT be proved from static source.
 note('LIVE_INDEXING_UNVERIFIED','Google Search Console, Bing Webmaster Tools, live 200/canonical/robots and AI-search crawler access require D/owner live evidence');
 note('CRAWL_CONTENT_UNVERIFIED','verify public JS-rendered listings, mobile speed, hreflang/locales and AI-crawler access after approved release');
 const lines=[
  '# Deepsyq SEO preflight — source diagnostics only',
  '',
  'Preview is intentionally NOINDEX. This is not evidence of public Google/Bing/AI Search visibility.',
  '',
  '| Code | Observation |',
  '| --- | --- |',
  ...findings.map(f=>'| '+f.code+' | '+f.detail.replaceAll('|','/')+' |'),
  '',
  'Launch decision: '+(findings.length?'BLOCKED / external verification required':'SOURCE-READY only; live verification still required')
 ];
 const report=lines.join('\n')+'\n';
 console.log(report);
 if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,report);
 if(process.env.SEO_RELEASE_STRICT==='1')assert.deepEqual(findings,[],'public SEO release gate intentionally fails on unremedied/unverified requirements');
 else assert.ok(findings.some(f=>f.code==='LIVE_INDEXING_UNVERIFIED'),'preflight must never claim static source proves indexing');
});


test('preflight GitHub Actions reruns when actual SEO input pages/robots/sitemap/preview change',async()=>{
 const workflow=await read('.github/workflows/agent-a-seo-release-preflight.yml');
 const pr=workflow.split('\n  pull_request:\n')[1]?.split('\n  push:\n')[0]||'';
 const push=workflow.split('\n  push:\n')[1]?.split('\n  workflow_dispatch:\n')[0]||'';
 const inputs=[
  'app/src/main/assets/sitemap.xml',
  'app/src/main/assets/robots.txt',
  ...pages.map(name=>'app/src/main/assets/'+name),
  'server/deepsyq-preview.js',
  'app/src/main/assets/product-video.html',
  'app/src/main/assets/product-video.js'
 ];
 for(const [event,scope] of [['pull_request',pr],['push',push]]){
  assert.match(scope,/^\s+paths:\s*$/m,event+' must filter by files');
  for(const path of inputs){
   assert.ok(scope.split('\n').some(line=>line.trim()==="- '"+path+"'"),
    event+' must automatically run SEO preflight when '+path+' changes');
  }
 }
 assert.match(workflow,/workflow_dispatch:\s*\n\s+inputs:/,'manual offline strict SEO launch audit must be exposed');
 assert.match(workflow,/\brelease_strict:\s*\n/,'manual strict opt-in must be explicit');
 assert.match(workflow,/\bpublic_origin:\s*\n/,'manual public hostname input must be explicit');
 assert.match(workflow,/\bSEO_RELEASE_STRICT:/,'manual strict flag must reach Node test');
 assert.match(workflow,/\bSEO_PUBLIC_ORIGIN:/,'manual owner-approved origin must reach Node test');
});
