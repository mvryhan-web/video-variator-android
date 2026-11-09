// Read-only audit of the *live* production HTTP routes. This never deploys or changes MAIN.
import {readdirSync} from 'node:fs';
const base='https://deepsyq.app';
const assets='app/src/main/assets';
const files=readdirSync(assets).filter(n=>n.endsWith('.html')&&n!=='404.html').sort();
const probes=['/',...files.map(n=>'/'+n),'/jarvix-chat','/jarvix-chat.','/video-uniquifier','/dashboard','/inspiration','/generate-studio.html?studio=image','/generate-studio.html?studio=video','/generate-studio.html?studio=audio','/generate-studio.html?view=history','/ai-agents.html?mode=video'];
const aliases=new Map([
  ['/','Deepsyq'],['/index.html','Deepsyq'],['/deepsyq.html','Deepsyq'],
  ['/dashboard','Deepsyq'],['/ai-agents.html','JARVIS Chat'],['/ai-pricing.html','Pricing'],
  ['/jarvix-chat.html','JARVIS Chat'],['/jarvix-chat','JARVIS Chat'],
  ['/video-uniquifier.html','Video Uniquifier'],['/video-uniquifier','Video Uniquifier'],
  ['/pricing.html','Pricing'],['/canvas.html','Canvas'],['/ai-apps.html','AI Apps'],
  ['/free-tools.html','Everyday Tools'],['/my-creations.html','My Creations']
]);
const failed=[];
const results=[];
for(const route of probes){
  try{
    const response=await fetch(base+route,{redirect:'follow',headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(12000)});
    const html=await response.text();
    const title=(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]?.trim()||'NO_TITLE';
    const url=new URL(response.url);
    const expected=aliases.get(route);
    const intended404=route==='/jarvix-chat.';
    const wantedMode=route.match(/^\/generate-studio\.html\?studio=(image|video|audio)$/)?.[1];
    const modePreserved=!wantedMode||((url.pathname==='/jarvix-chat.html'||url.pathname==='/jarvix-chat')&&([url.searchParams.get('mode'),url.searchParams.get('studio')].includes(wantedMode)));
    const issue=response.status!==200&&!intended404?
      'status '+response.status:
      intended404&&response.status!==404?'invalid path was NOT rejected':
      wantedMode&&!modePreserved?'legacy Studio link loses requested '+wantedMode+' mode':
      expected&&!title.toLowerCase().includes(expected.toLowerCase())?
      'wrong page; expected '+expected:null;
    const row={route,status:response.status,title,final:url.pathname+(url.search||''),...issue?{issue}:{}};
    results.push(row);
    console.log('MAIN_ROUTE',JSON.stringify(row));
    if(issue){failed.push(row);}
  }catch(error){
    const row={route,error:String(error)};results.push(row);failed.push(row);
    console.log('MAIN_ROUTE',JSON.stringify(row));
  }
}
const home=results.find(r=>r.route==='/');
const canonicalHome=results.find(r=>r.route==='/deepsyq.html');
console.log('MAIN_AUDIT_SUMMARY',JSON.stringify({count:probes.length,bad:failed.length,home:home?.title,canonicalHome:canonicalHome?.title}));
console.log('MAIN_AUDIT_ISSUES',JSON.stringify(failed));
if(failed.length)process.exitCode=1;
