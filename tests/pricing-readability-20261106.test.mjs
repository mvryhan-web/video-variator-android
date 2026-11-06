import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const pricing=readFileSync('app/src/main/assets/pricing-page.js','utf8');
const css=readFileSync('app/src/main/assets/pricing-wallet.css','utf8');

test('four paid plans show watermark-free Video Uniquifier export and Trial unavailable benefits have red crosses',()=>{
  for(const plan of ['Basic','Pro','Business']){
    assert.ok(pricing.includes("['✓','Included "+plan+" tools']"));
  }
  assert.ok(pricing.includes("['✓','Included Lifetime Tools']"));
  assert.ok(pricing.includes("['✓','Watermark-free Video Uniquifier exports']"));
  assert.ok(pricing.includes("['✕','Watermark-free exports not included in Trial']"));
  assert.ok(pricing.includes("['✕','AI credits not included in current Trial preview']"));
  assert.ok(pricing.includes("['✕','Trial checkout is not available']"));
  assert.ok(pricing.includes("['ⓘ','Duration and renewal terms: not approved']"));
  assert.ok(!pricing.includes("['◇','Watermark removal: terms not approved']"));
  assert.ok(pricing.includes("ⓘ Lifetime does not include unlimited paid AI generation"));
  assert.ok(!pricing.includes("['◇','Lifetime does not include unlimited paid AI generation']"));
  assert.ok(pricing.includes("icon==='✓'?' is-included'"));
  assert.ok(css.includes('.price-feature-icon.is-included{color:#8cf4b4'));
  assert.ok(css.includes('.price-feature-icon.is-excluded{color:#ff9caa'));
});

test('all five displayed base + proposed bonus examples are correct',()=>{
  const entries=[...pricing.matchAll(/\{credits:(\d+),bonus:(\d+),price:(\d+),image:'(credit\d+)'\}/g)];
  assert.deepEqual(entries.map(x=>[+x[1],+x[2],+x[3],x[4]]),[
    [1000,200,10,'credit1000'],
    [10000,3333,100,'credit10000'],
    [100000,20000,1000,'credit100000'],
    [1000000,200000,10000,'credit1000000'],
    [10000000,2000000,100000,'credit10000000'],
  ]);
  assert.ok(pricing.includes("numeral.format(p.credits+p.bonus)"));
  assert.ok(pricing.includes("['Base',numeral.format(p.credits)]"));
  assert.ok(pricing.includes("['Bonus','+ '+numeral.format(p.bonus)]"));
  assert.ok(pricing.includes("['Total',numeral.format(p.credits+p.bonus)]"));
});

test('bonuses are not represented as credited in checkout and original images stay intact',()=>{
  assert.ok(pricing.includes("Only verified base credits are granted after payment."));
  assert.ok(pricing.includes("Bonus and total figures are proposed, not active or included in checkout."));
  assert.ok(pricing.includes("body:JSON.stringify({sku:pack.sku,requestId:creditRequestIds.get(key)})"));
  assert.ok(pricing.includes("const valid=!!serverPack&&!!checkoutMode;"));
  assert.ok(pricing.includes("picture.append(img(p.key))"));
  assert.ok(pricing.includes("card.append(img(p.image))"));
  assert.ok(!pricing.includes('80% Credit Bonus'));
  assert.ok(pricing.includes("const badge=node('h3','price-credit-badge')"));
  assert.ok(pricing.includes("foot.append(badge,cost,button)"));
  assert.ok(!pricing.includes("const title=node('h3','price-credit-number'"));
  assert.ok(!pricing.includes("price-credit-breakdown-note',"));
  assert.ok(pricing.includes("host.before(notice)"));
  assert.ok(css.includes('.price-credit-badge{'));
  assert.ok(css.includes('@media(max-width:420px)'));
  assert.ok(css.includes('grid-template-columns:repeat(3,minmax(0,1fr))'));
});
