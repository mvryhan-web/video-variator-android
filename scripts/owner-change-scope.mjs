#!/usr/bin/env node
// Owner D24: PR scope audit + Studio contract + TEST SHA preflight.
// CI is a guard only when enforced by GitHub branch Rulesets.
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const read=p=>readFileSync(resolve(root,p),'utf8');
const git=a=>execFileSync('git',a,{cwd:root,encoding:'utf8'}).trim();
const sha=x=>/^[a-f0-9]{40}$/i.test(String(x||''));
const config=JSON.parse(read('docs/OWNER_REVIEW_PATHS.json'));
export function protectedPath(path,c=config){
 return c.reviewRequired.includes(path)||c.reviewPrefixes.some(prefix=>path.startsWith(prefix));
}
export function parseScope(body=''){
 const match=String(body).match(/<!-- OWNER_SCOPE_BEGIN([\s\S]*?)OWNER_SCOPE_END -->/);
 if(!match)return null;
 const scope={paths:[]};let inPaths=false;
 for(const line0 of match[1].split(/\r?\n/)){
  const line=line0.trim();
  if(line==='ALLOWED_PATHS:'){inPaths=true;continue;}
  const m=line.match(/^([A-Z_]+):\s*(.+)$/);
  if(m){scope[m[1]]=m[2].trim();inPaths=false;continue;}
  if(inPaths&&line.startsWith('- '))scope.paths.push(line.slice(2).replace(/^\x60|\x60$/g,''));
 }
 return scope;
}
export function validateScope(scope,changed,dev,c=config){
 const errors=[];
 if(!scope)return ['No OWNER_SCOPE block in PR. Use .github/pull_request_template.md'];
 for(const k of ['OWNER_REQUEST','BASE_DEV_SHA','PRESERVE','TESTS','OWNER_APPROVAL']){
  if(!scope[k]||/^(TODO|TBD|FILL|<)/i.test(scope[k]))errors.push('Missing '+k);
 }
 if(!sha(scope.BASE_DEV_SHA)||scope.BASE_DEV_SHA!==dev)errors.push('Stale/missing DEV SHA; reconcile latest accepted work before PR');
 if(!scope.paths.length)errors.push('No exact ALLOWED_PATHS');
 const allowed=new Set(scope.paths);
 if(allowed.size!==scope.paths.length)errors.push('Duplicate allowed file');
 for(const p of scope.paths)if(!/^[A-Za-z0-9._/-]+$/.test(p)||p.startsWith('/')||p.includes('..')||p.includes('*'))errors.push('Invalid/wildcard path: '+p);
 for(const p of changed)if(!allowed.has(p))errors.push('Unrequested file changed: '+p);
 const hot=changed.filter(p=>protectedPath(p,c));
 const proof=/^https:\/\/github\.com\/mvryhan-web\/video-variator-android\/issues\/\d+#issuecomment-\d+$/;
 if(hot.length&&!proof.test(scope.OWNER_APPROVAL||''))errors.push('Protected files need specific owner Issue COMMENT URL: '+hot.join(', '));
 if(!hot.length&&scope.OWNER_APPROVAL!=='NONE'&&!proof.test(scope.OWNER_APPROVAL||''))errors.push('OWNER_APPROVAL must be NONE or exact owner comment URL');
 return errors;
}
export function studioContract(s){
 const issues=[];
 const required=[
 ['parent Settings hub',s.popovers,"hub.id='studioSettingsHub'"],
 ['X closes parent explicitly',s.popovers,'close.onclick=()=>hub.close()'],
 ['no auto close when choosing model/ratio',s.popovers,'Child dialogs close independently'],
 ['parent remains open on selection',s.popovers,'if(!hub.open)hub.showModal()'],
 ['child closes back to parent',s.popovers,'activePanel=hub;activeAnchor=gear;'],
 ['gear anchor',s.popovers,'studioSettingsToggle'],
 ['aspect ratio preview',s.studio,"'aspect-ratio'"],
 ['visible aspect frame',s.css,'display:block!important'],
 ['style import',s.html,'studio-composer-popovers.css'],
 ['controller import',s.html,'studio-composer-popovers.js']
 ];
 for(const [name,content,pattern] of required)if(!content.includes(pattern))issues.push('Studio owner-approved behavior removed: '+name);
 if(/for\s*\(const control of \[picker,model,format\]\)control\.addEventListener\('click',\(\)=>hub\.close\(\)/.test(s.popovers))issues.push('Model/ratio click illegally closes parent Settings');
 if((s.html.match(/src="studio-composer-popovers\.js/g)||[]).length!==1)issues.push('Studio controller loaded 0 or >1 times');
 return issues;
}
export function deployContract(candidate,live,dev,ancestor){
 const errors=[];
 if(!sha(candidate)||!sha(live)||!sha(dev))return ['Supply valid candidate + actual live TEST SHAs'];
 if(candidate!==dev)errors.push('Do not deploy a PR branch: candidate must equal latest merged DEV SHA');
 if(!ancestor(live,candidate))errors.push('TEST has changes not in DEV: reconcile current live preview before overwriting');
 return errors;
}
const sources=()=>({popovers:read('app/src/main/assets/studio-composer-popovers.js'),studio:read('app/src/main/assets/generate-studio.js'),css:read('app/src/main/assets/studio-composer-popovers.css'),html:read('app/src/main/assets/generate-studio.html')});
const diff=(a,b)=>git(['diff','--name-only','--diff-filter=ACDMRT',a,b]).split('\n').filter(Boolean);
const ancestor=(a,b)=>{try{execFileSync('git',['merge-base','--is-ancestor',a,b],{cwd:root,stdio:'ignore'});return true;}catch{return false;}};
const currentDev=()=>{git(['fetch','--no-tags','origin','+refs/heads/deepsyq-platform:refs/remotes/origin/deepsyq-platform']);return git(['rev-parse','refs/remotes/origin/deepsyq-platform']);};

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const mode=process.argv[2]||'static';
 const errors=studioContract(sources());
 if(mode==='pr'){
  const event=JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));
  const dev=currentDev(),head=event.pull_request.head.sha;
  if(!ancestor(dev,head))errors.push('PR branch omits newer DEV changes; rebase/reconcile first');
  const changed=diff(dev,head);
  errors.push(...validateScope(parseScope(event.pull_request.body||''),changed,dev));
  console.log('PR changed files:',JSON.stringify(changed));
 }else if(mode==='deploy'){
  const dev=currentDev(),candidate=process.argv[3],live=process.argv[4];
  errors.push(...deployContract(candidate,live,dev,ancestor));
  console.log('Candidate / DEV / current TEST:',candidate,dev,live);
 }else if(mode==='push'){
  console.log('Post-push audit only: direct changes cannot be prevented without GitHub Rulesets.');
 }else if(mode!=='static')errors.push('Unknown mode '+mode);
 if(errors.length){for(const e of errors)console.error('OWNER_SCOPE_FAIL: '+e);process.exitCode=1;}
 else console.log('OWNER_SCOPE_PASS: '+mode+' (no deployment performed)');
}
