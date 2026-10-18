import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {studioCreditWalletState} from '../app/src/main/assets/studio-credit-wallet.js';

const valid={sku:'starter',credits:100,amount:990,currency:'eur'};

test('BASE #13: existing wallet totals display even when Stripe billing is OFF',()=>{
 const state=studioCreditWalletState({enabled:false,mode:'test',packs:[valid]},{available:74,reserved:20,debt:0});
 assert.equal(state.checkoutMode,null);
 assert.deepEqual(state.packs,[]);
 assert.deepEqual(state.totals,{available:74,reserved:20,debt:0});
});

test('BASE #13: unreadable wallet balances are unknown, never zero',()=>{
 for(const wallet of [null,undefined,{}, {available:null,reserved:0,debt:0},
  {available:'20',reserved:0,debt:0},{available:NaN,reserved:0,debt:0},
  {available:10,reserved:-1,debt:0},{available:10,reserved:0,debt:1.5}]){
  assert.equal(studioCreditWalletState({enabled:false},wallet).totals,null,JSON.stringify(wallet));
 }
 assert.deepEqual(studioCreditWalletState({}, {available:0,reserved:0,debt:0}).totals,{available:0,reserved:0,debt:0});
});

test('BASE #13: only configured mode and valid server packs open Checkout',()=>{
 const disabled=studioCreditWalletState({enabled:true,mode:'unknown',packs:[valid]});
 assert.equal(disabled.checkoutMode,null);
 assert.deepEqual(disabled.packs,[]);
 const testCfg={enabled:true,mode:'test',packs:[valid,{...valid,amount:0},{...valid,sku:'<invalid>'}]};
 assert.equal(studioCreditWalletState(testCfg).checkoutMode,'test');
 assert.deepEqual(studioCreditWalletState(testCfg).packs,[valid]);
 assert.equal(studioCreditWalletState({...testCfg,mode:'live'}).checkoutMode,'live');
});

test('BASE #13: Studio routes read balances from ungated wallet endpoints',async()=>{
 const js=await readFile(new URL('../app/src/main/assets/generate-studio.js',import.meta.url),'utf8');
 const fn=js.slice(js.indexOf('async function loadAiWallet(){'),js.indexOf('async function buyCredits('));
 assert.ok(fn.includes("api('/api/ai-wallet/balance')"));
 assert.ok(fn.includes("api('/api/ai-wallet/history')"));
 assert.ok(!fn.includes("api('/api/ai-billing/balance')"));
 assert.ok(!fn.includes("api('/api/ai-billing/history')"));
 assert.ok(!fn.includes('if(!response.ok||!cfg.enabled)'));
 assert.ok(!fn.includes('Number(balance.available||0)'));
});
