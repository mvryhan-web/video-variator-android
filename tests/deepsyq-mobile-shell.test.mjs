import test from 'node:test';
import assert from 'node:assert/strict';
import {drawerSwipe} from '../app/src/main/assets/deepsyq-mobile-shell.js';

test('only a deliberate horizontal edge swipe opens the menu',()=>{
  const start={x:10,y:100,time:0};
  assert.equal(drawerSwipe(start,{x:110,y:115,time:250},false,300),'open');
  assert.equal(drawerSwipe({...start,x:100},{x:210,y:115,time:250},false,300),null);
  assert.equal(drawerSwipe(start,{x:110,y:220,time:250},false,300),null);
  assert.equal(drawerSwipe(start,{x:110,y:115,time:1500},false,300),null);
  assert.equal(drawerSwipe(null,{x:110,y:115,time:250},false,300),null);
});
test('left swipe closes only from inside the drawer; taps and scrolling do not',()=>{
  assert.equal(drawerSwipe({x:200,y:100,time:0},{x:100,y:110,time:250},true,300),'close');
  assert.equal(drawerSwipe({x:350,y:100,time:0},{x:100,y:110,time:250},true,300),null);
  assert.equal(drawerSwipe({x:200,y:100,time:0},{x:190,y:110,time:250},true,300),null);
  assert.equal(drawerSwipe({x:200,y:100,time:0},{x:100,y:200,time:250},true,300),null);
});
