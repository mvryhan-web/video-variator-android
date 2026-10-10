import {test,expect} from '@playwright/test';
import {gotoAppReady} from './helpers/app-ready.mjs';

test('compact choices select existing engine values and fit a narrow dashboard',async({page},info)=>{
  await gotoAppReady(page);
  for(const [id,values] of [['mode',['gentle','balanced','dynamic']],['quality',['720','1080','2160']],['aspectRatio',['9:16','16:9']]]){
    const group=page.locator(`[data-select="${id}"]`);
    await expect(group.locator('button')).toHaveCount(values.length);
    for(const value of values){
      const button=group.locator(`[data-value="${value}"]`);
      await button.click();
      await expect(page.locator(`#${id}`)).toHaveValue(value);
      await expect(button).toHaveAttribute('aria-pressed','true');
      await expect(group.locator('[aria-pressed="true"]')).toHaveCount(1);
    }
    const boxes=await group.locator('button').evaluateAll(buttons=>buttons.map(b=>b.getBoundingClientRect().toJSON()));
    for(let i=1;i<boxes.length;i++){expect(boxes[i].x).toBeGreaterThan(boxes[i-1].x);expect(Math.abs(boxes[i].y-boxes[0].y)).toBeLessThan(2);}
  }
  await expect(page.locator('#fastExport')).toHaveCount(0);
  await expect(page.locator('#planAccessHint')).toBeHidden();
  await expect(page.locator('#wowMontageHelp')).toBeHidden();
  await expect(page.getByRole('switch',{name:'WOW Montage'})).not.toBeChecked();
  for(const width of [320,390])for(const theme of ['dark','light']){
    await page.setViewportSize({width,height:844});
    await page.evaluate(value=>document.documentElement.dataset.theme=value,theme);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    for(const id of ['mode','quality','aspectRatio']){
      const boxes=await page.locator(`[data-select="${id}"] button`).evaluateAll(buttons=>buttons.map(b=>b.getBoundingClientRect().toJSON()));
      for(const box of boxes){expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width+1);expect(box.height).toBeGreaterThanOrEqual(44);}
    }
  }
  if(info.project.name==='mobile-chromium'){
    await page.locator('.workspace').scrollIntoViewIfNeeded();
    await page.screenshot({path:info.outputPath('compact-dashboard-light.png')});
    await page.evaluate(()=>document.documentElement.dataset.theme='dark');
    await page.screenshot({path:info.outputPath('compact-dashboard-dark.png')});
  }
});

for(const [plan,modes,quality] of [['basic',['gentle'],'720'],['pro',['gentle','balanced'],'1080'],['business',['gentle','balanced','dynamic'],'2160']]){
 test(`${plan} choices preserve server plan restrictions`,async({page})=>{
  await page.route('**/api/me',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({user:{email:'test@example.com',usage:{plan,active:true,limit:15000,used:0,remaining:15000,unit:'credits'}}})}));
  await page.addInitScript(()=>localStorage.setItem('vv_token','test-token'));
  await gotoAppReady(page);
  for(const value of ['gentle','balanced','dynamic']){
    const button=page.locator(`[data-select="mode"] [data-value="${value}"]`);
    if(modes.includes(value))await expect(button).toBeEnabled();else await expect(button).toBeDisabled();
  }
  const button=page.locator(`[data-select="quality"] [data-value="${quality}"]`);
  await expect(button).toHaveAttribute('aria-pressed','true');
  for(const value of ['720','1080','2160'])if(value!==quality)await expect(page.locator(`[data-select="quality"] [data-value="${value}"]`)).toBeDisabled();
 });
}

test('keyboard navigation selects a mode without opening a dropdown',async({page})=>{
 await gotoAppReady(page);
 const first=page.locator('[data-select="mode"] [data-value="gentle"]');
 await first.focus();await first.press('ArrowRight');await expect(page.locator('#mode')).toHaveValue('balanced');
 await page.locator('[data-select="mode"] [data-value="balanced"]').press('End');await expect(page.locator('#mode')).toHaveValue('dynamic');
});
