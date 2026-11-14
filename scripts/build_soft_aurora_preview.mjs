/* Build a disposable, isolated Cloudflare Pages TEST preview.
   Never changes the source assets or the production Pages deployment. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(root,'app/src/main/assets');
const target=path.join(root,'.soft-aurora-preview-build');
const banner='<!-- DEEPSYQ SOFT AURORA: isolated preview stylesheet only -->';
const inject=banner+'\n<link rel="stylesheet" href="/soft-aurora-preview.css">\n'+
  '<script defer src="/soft-aurora-preview.js"></script>\n';
assert(fs.existsSync(path.join(source,'soft-aurora-preview.css')),'Preview stylesheet missing');
assert(fs.existsSync(path.join(source,'soft-aurora-preview.js')),'Preview selector missing');
fs.rmSync(target,{recursive:true,force:true});
fs.cpSync(source,target,{recursive:true,dereference:true});
let count=0;
for(const filename of fs.readdirSync(target)){
  if(!filename.toLowerCase().endsWith('.html'))continue;
  const file=path.join(target,filename);
  if(!fs.statSync(file).isFile())continue;
  const original=fs.readFileSync(file,'utf8');
  if(!/<\/head>/i.test(original))continue;
  assert(!original.includes(banner),'Source must not contain preview injection');
  const changed=original.replace(/<\/head>/i,inject+'</head>');
  fs.writeFileSync(file,changed,'utf8');
  count++;
}
assert(count>=25,'Expected existing multi-page DEEPSYQ site');
const home=fs.readFileSync(path.join(target,'deepsyq.html'),'utf8');
const chat=fs.readFileSync(path.join(target,'jarvix-chat.html'),'utf8');
assert(home.includes('id="homeQuickForm"')&&home.includes('id="homeQuickPrompt"'),
       'Existing Home JARVIX composer or textarea must exist');
assert(chat.includes('id="jChatForm"')&&chat.includes('id="jInput"'),
       'Existing JARVIX Chat composer or textarea must exist');
assert(home.includes(inject)&&chat.includes(inject),
       'Soft Aurora must be enabled on both Home and JARVIX');
fs.rmSync(path.join(target,'_routes.json'),{force:true});
fs.rmSync(path.join(target,'_worker.js'),{force:true});
/* Static no-spend TEST: preserve real pages, but block backend actions.
   In particular, prevent payment, Google OAuth, account writes and AI calls. */
fs.writeFileSync(path.join(target,'_worker.js'),String.raw\`
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==='/api'||url.pathname.startsWith('/api/')||
       url.pathname.startsWith('/auth/')||url.pathname.startsWith('/callback/'))
      return new Response(JSON.stringify({error:'TEST_PREVIEW_API_DISABLED'}),{
        status:503,headers:{'content-type':'application/json; charset=utf-8',
                            'cache-control':'no-store'}});
    return env.ASSETS.fetch(request);
  }
};\`,'utf8');
console.log(JSON.stringify({
  status:'SOFT_AURORA_PREVIEW_BUILD_PASS',
  pages:count,main:'deepsyq.html',chat:'jarvix-chat.html',
  googleAndLoginSourcePreserved:true,
  backendPaymentsAndGenerationDisabled:true,
  productionUnchanged:true
}));
