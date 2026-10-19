// Export an intentionally lossy, safe, agent-readable code map from Graphify AST.
// Never publish Graphify's raw graph: it may contain source snippets or private data.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const [graphPath, sourceSha, outPath = 'docs/DEEPSYQ_CODE_MAP.md'] = process.argv.slice(2);
if (!graphPath || !/^[a-f0-9]{40}$/.test(sourceSha || '')) {
  throw new Error('Usage: node export-safe-index.mjs GRAPH_JSON FULL_GIT_SHA [OUT_MD]');
}
const g = JSON.parse(readFileSync(graphPath, 'utf8'));
if (!Array.isArray(g.nodes) || !Array.isArray(g.links || g.edges)) {
  throw new Error('Unrecognized Graphify graph schema');
}
// The only permitted export fields are code paths, identifier-shaped names,
// numeric line references and relation types. No literals, code, content, or URLs.
const badPath = /(?:^|\/)(?:\.env(?:\.|$)|\.git|\.ssh|\.aws|node_modules|customer[-_]?data|user[-_]?data|uploads?|private|backups?|dumps?|logs?|sessions?|storage|recordings?)(?:\/|$)/i;
const badFragment = /(?:-----BEGIN|sk_live_|ghp_[A-Za-z0-9]{12}|GRAPHIFY_SECRET_SENTINEL|password\s*[:=]|api[_-]?key\s*[:=])/i;
const symRe = /^[A-Za-z_$][\w$]*(?:[.#][A-Za-z_$][\w$]*){0,2}$/;
const relRe = /^(?:calls|imports|imports_from|contains|method|uses|references|extends|implements|exports|defines|depends_on|re_exports)$/;
function sourcePath(value) {
  if (typeof value !== 'string') return null;
  let x = value.replaceAll('\\', '/').replace(/^\.\//, '');
  if (!x || x.startsWith('/') || x.includes('..') || /[:\n\r\t]/.test(x)) return null;
  if (!x.startsWith('server/')) x = 'server/' + x;
  if (!/^server\/[A-Za-z0-9_./-]+\.(?:js|mjs|cjs|ts|tsx)$/.test(x)) return null;
  if (badPath.test(x) || badFragment.test(x)) return null;
  return x;
}
function sourceName(value) {
  if (typeof value !== 'string' || value.length > 110 || !symRe.test(value)) return null;
  if (badFragment.test(value)) return null;
  return value;
}
const refs = new Map();
const items = [];
for (const node of g.nodes) {
  if (!node || typeof node !== 'object') continue;
  const file = sourcePath(node.source_file);
  const name = sourceName(node.label);
  const match = /^L(\d+)(?:-L?\d+)?$/.exec(String(node.source_location || ''));
  if (!file || !name || !match) continue;
  const line = Number(match[1]);
  if (!Number.isSafeInteger(line) || line < 1 || line > 1000000) continue;
  if (typeof node.id !== 'string') continue;
  if (refs.has(node.id)) continue;
  refs.set(node.id, items.length);
  items.push({file, name, line});
}
if (items.length < 10) throw new Error('Too few safe Graphify AST symbols; refuse empty/stale index');
const links = [];
for (const e of g.links || g.edges) {
  if (!e || typeof e !== 'object') continue;
  const relation = typeof e.relation === 'string' && relRe.test(e.relation) ? e.relation : null;
  if (!relation) continue;
  const a = refs.get(e._src || e.source);
  const b = refs.get(e._tgt || e.target);
  if (a === undefined || b === undefined || a === b) continue;
  links.push({a, b, relation});
}
const files = new Map();
for (const item of items) {
  if (!files.has(item.file)) files.set(item.file, []);
  files.get(item.file).push(item);
}
const esc = x => x.replaceAll('|', '').replaceAll('`', '');
let md = '# DEEPSYQ — Graphify code map (server only)\n\n';
md += '> Generated offline from Graphify AST. Safe identifiers/paths only; not source-of-truth. No private graph, source snippets, secrets or user files.\n';
md += '> Agents A/B/C/D, coordinator #5 and Jules: **look here first**; open only the linked source and changes after the SHA. If SHA is stale, verify only affected files.\n\n';
md += 'Source commit: `' + sourceSha + '`  | Graphify pinned: `86c57be8204673c2a1b9849a3292a7dd3ab373d8`\n';
md += 'Scope: `server/` | Indexed files: ' + files.size + ' | Named symbols: ' + items.length + ' | Checked relations: ' + links.length + '\n\n';
md += '## Topic finder (matching filenames)\n\n';
const topics = [
  ['Credits, payments and pricing',/credit|wallet|stripe|billing|pricing|purchased|entitle/i],
  ['Video, providers and jobs',/video|provider|worker|storage|routing|fallback/i],
  ['Image, Canvas and Home',/image|canvas|preview|studio/i],
  ['Audio and voice',/audio|speech|voice/i],
  ['AI Apps, Inspiration, History',/tool|app|inspiration|history|workspace/i],
  ['Accounts and security',/auth|policy|access|audit|user/i],
];
const sortedFiles = [...files.keys()].sort();
for (const [topic,pattern] of topics) {
 const found = sortedFiles.filter(x=>pattern.test(x)).slice(0,30);
 md += '- **' + topic + ':** ' + (found.length ? found.map(x=>'`'+x+'`').join(', ') : 'not mapped by name') + '\n';
}
md += '\n## Source symbol map\n\n';
for (const file of sortedFiles) {
  const uniq = new Map();
  for (const item of files.get(file)) uniq.set(item.name + ':' + item.line,item);
  const symbols = [...uniq.values()].sort((a,b)=>a.line-b.line).slice(0,200);
  md += '### `' + file + '`\n\n';
  md += symbols.map(s=>esc(s.name)+' (L'+s.line+')').join(' · ')+'\n\n';
}
md += '## Link traversal\n\n';
md += 'Safe relationship edges are available in `docs/DEEPSYQ_CODE_MAP.json` (numeric node indices). This is a navigation hint, not evidence of runtime behavior.\n';
if (badFragment.test(md) || badPath.test(md)) throw new Error('Unsafe text in proposed map');
const safeGraph = {
  schema: 1, source_sha:sourceSha, scope:'server/', graphify_commit:'86c57be8204673c2a1b9849a3292a7dd3ab373d8',
  nodes: items.map(x=>[x.file,x.name,x.line]),
  edges: links.map(x=>[x.a,x.b,x.relation])
};
const packed = JSON.stringify(safeGraph);
if (badFragment.test(packed) || badPath.test(packed)) throw new Error('Unsafe text in proposed graph index');
const graphOut = outPath.replace(/\.md$/,'.json');
if (graphOut === outPath) throw new Error('Markdown output expected');
writeFileSync(graphOut, packed + '\n');

mkdirSync(dirname(outPath), {recursive:true});
writeFileSync(outPath, md);
console.log('SAFE_CODE_MAP files='+files.size+' symbols='+items.length+' edges='+links.length+' sha='+sourceSha);
