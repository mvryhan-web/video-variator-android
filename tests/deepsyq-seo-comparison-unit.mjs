import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const assets=resolve(dirname(fileURLToPath(import.meta.url)),'../app/src/main/assets');
const source=await readFile(resolve(assets,'deepsyq-vs-deepseek.html'),'utf8');
const match=(pattern,message)=>{assert.match(source,pattern,message);};
const get=(pattern)=>source.match(pattern)?.[1]||'';

test('SEO comparison has one useful H1, unique factual metadata and same canonical identity',()=>{
 const title=get(/<title>([^<]+)<\/title>/);
 const description=get(/<meta name="description" content="([^"]+)"/);
 const canonical=get(/<link rel="canonical" href="([^"]+)"/);
 assert.match(title,/^Deepsyq vs DeepSeek:/);
 assert.ok(title.length<70,'concise title');
 assert.ok(description.length>=90&&description.length<=210,'search-friendly original description');
 assert.equal((source.match(/<h1\b/g)||[]).length,1);
 assert.match(get(/<h1>([^<]+)<\/h1>/),/^Deepsyq vs DeepSeek:/);
 assert.equal(canonical,'https://video-variator-android.onrender.com/deepsyq-vs-deepseek.html');
 assert.equal(get(/<meta property="og:url" content="([^"]+)"/),canonical);
 assert.equal(get(/<meta property="og:title" content="([^"]+)"/),title);
 assert.match(source,/<html lang="en-US">/);
});

test('editorial copy disclaims affiliation and distinguishes working tools from unreleased paid AI',()=>{
 match(/Deepsyq is not DeepSeek/,'visible independence notice');
 match(/not an official DeepSeek product/,'no affiliation ambiguity');
 match(/owner-only preview/,'do not promise paid AI launch');
 match(/does not itself purchase AI credits/,'draft-only handoff is accurate');
 match(/do not grant unlimited paid AI generation/,'pricing distinction');
 match(/planned offer is not open for purchase/,'do not promise 99 cent checkout');
 match(/not a general-purpose conversational assistant/,'not a fake AI chat');
 match(/does not currently offer a general-purpose AI chat/,'preserve browser-visible AI chat limitation');
 match(/not affiliated with DeepSeek/,'preserve browser-visible independence disclaimer');
 assert.doesNotMatch(source,/\b(guaranteed|#1|best in the world|official DeepSeek partner)\b/i);
});

test('all public internal links and brand assets exist inside the same static web directory',async()=>{
 const urls=[...source.matchAll(/\bhref="([^"]+)"/g)].map(m=>m[1]);
 assert.ok(urls.includes('deepsyq.html'));
 assert.ok(urls.includes('free-tools.html'));
 assert.ok(urls.includes('pricing.html'));
 assert.ok(urls.includes('index.html'));
 assert.ok(urls.includes('ai-privacy.html'));
 assert.ok(urls.includes('generate-studio.html?studio=image'));
 assert.ok(urls.some(x=>x.startsWith('https://www.deepseek.com/')));
 for(const href of urls){
  if(/^https?:\/\//.test(href))continue;
  assert.ok(!href.startsWith('/'),'avoid root-dependent local links');
  const local=href.split(/[?#]/,1)[0];
  await access(resolve(assets,local));
 }
 await access(resolve(assets,'deepsyq-logo.png'));
 match(/rel="noopener noreferrer"/,'avoid opener on external link');
});

test('comparison remains independent editorial HTML: no paid requests, scripts, or invented review ratings',()=>{
 const scriptTags=[...source.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi)].map(m=>m[0]);
 assert.equal((source.match(/<script\b/gi)||[]).length,scriptTags.length,'disallow malformed script tags');
 assert.deepEqual(scriptTags,['<script defer src="deepsyq-site-shell.js"></script>'],'permit only audited local navigation script; no inline or remote code');
 assert.doesNotMatch(source,/application\/ld\+json/i);
 assert.doesNotMatch(source,/\bAggregateRating\b|\breviewCount\b/);
 assert.doesNotMatch(source,/data:text\/html|javascript:/i);
 match(/<meta name="twitter:card" content="summary">/);
 match(/class="comparison"/);
 match(/<main class="editorial">/);
});


test('owner-approved editorial links use violet accents rather than the retired mint palette',async()=>{
 const css=await readFile(resolve(assets,'deepsyq-seo.css'),'utf8');
 assert.match(css,/\.editorial p a,\.comparison a,\.editorial footer a\{color:#deb5ff/);
 assert.match(css,/\.editorial a:focus-visible\{outline:2px solid #efb9ff/);
 assert.doesNotMatch(css,/#d4f5b5|#d2f7ae|#c4fa89/i);
});
