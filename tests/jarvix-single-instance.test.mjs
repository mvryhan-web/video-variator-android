import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const root=new URL('../app/src/main/assets/',import.meta.url);
test('all HTML and injected Jarvis entries share the exact same module URL as imports',()=>{
 for(const name of readdirSync(root).filter(n=>/\.(html|js)$/.test(n))){const text=readFileSync(new URL(name,root),'utf8');assert.doesNotMatch(text,/jarvis-core\.js\?/,`${name} creates a second module instance`);}
 const tour=readFileSync(new URL('jarvix-guided-tour.js',root),'utf8');assert.match(tour,/from '\.\/jarvis-core\.js'/);
});
