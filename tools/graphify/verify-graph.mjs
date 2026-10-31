import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const graph = JSON.parse(readFileSync(process.argv[2] ?? 'graphify-out/graph.json', 'utf8'));
const text = JSON.stringify(graph);
assert.ok(text.length > 80, 'graph must contain real source, not be empty');
const dangerous = /(?:^|[/\\])(?:\.env(?:\.|[/\\]|$)|\.aws[/\\]|\.ssh[/\\]|user[-_]?data[/\\]|customer[-_]?data[/\\]|user[-_]?uploads?[/\\]|dumps?[/\\]|backups?[/\\]|sessions?[/\\]|recordings?[/\\])/i;
const paths = [...text.matchAll(/"(?:source_file|file_path|path)"\s*:\s*"([^"]+)"/g)].map(m => m[1].replace(/\\\\/g, '/'));
assert.ok(paths.length > 0, 'graph must include source paths for audit');
assert.ok(!paths.some(p => dangerous.test(p)), 'excluded secret/user path leaked into graph');
assert.ok(!/(?:-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|sk_live_[A-Za-z0-9]{8}|ghp_[A-Za-z0-9]{20}|GRAPHIFY_SECRET_SENTINEL)/.test(text), 'secret-looking content in graph');
assert.match(text, /submitPurchasedProviderRequest/, 'no real purchased-dispatch symbol found');
console.log(`Graphify safe pilot: ${paths.length} source-path references; purchased dispatch symbol found; no excluded paths/secret patterns`);
