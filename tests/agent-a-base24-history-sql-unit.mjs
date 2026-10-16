import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('BASE 24 History SQL: image/video kind filter binds a parameter, not a numeric literal',async()=>{
 const server=await readFile(new URL('../server/generation-studio.js',import.meta.url),'utf8');
 const start=server.indexOf("app.get('/api/studio/jobs',");
 const end=server.indexOf("app.get('/api/studio/jobs/:id',start);
 assert.ok(start>=0&&end>start,'Find the authenticated user History route');
 const history=server.slice(start,end);
 // The query must always preserve user_id=$1; the kind is an additional
 // PostgreSQL parameter, not `kind=2` with the text filter in args[1].
 assert.match(history,/where=\['user_id=\$1','deleted=false'\]/);
 const row=history.split('\n').find(line=>line.includes("if(filter==='image'||filter==='video')"));
 assert.ok(row,'image/video filtering is present');
 assert.match(row,/args\.push\(filter\)/);
 const template=row.match(/where\.push\((`kind=[^`]+`)\)/);
 assert.ok(template,'A parameterized template literal is present');
 const clause=Function('args',`return ${template[1]}`)(['user-1','image']);
 assert.equal(clause,'kind=$2');
 const args=['user-1','video'];
 assert.equal(Function('args',`return ${template[1]}`)(args),'kind=$2');
 assert.doesNotMatch(clause,/^kind=\d+$/);
});
