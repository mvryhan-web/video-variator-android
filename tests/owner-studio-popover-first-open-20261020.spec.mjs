import {test,expect} from '@playwright/test';

test('first settings panel open stays anchored in Image, Video and Audio Studio',async({page})=>{
 await page.setViewportSize({width:1363,height:936});
 for(const studio of ['image','video','audio']){
  await page.goto('/generate-studio.html?studio='+studio);
  await expect(page.locator('#studioTypePicker')).toBeVisible();
  await expect(page.locator('.studio-shell>.studio-nav')).toBeHidden();
  await page.locator('#settingsButton').click();
  const panel=page.locator('#settingsDialog');
  await expect(panel).toBeVisible();
  await expect.poll(()=>panel.evaluate(el=>{
   const p=el.getBoundingClientRect(),a=document.querySelector('#settingsButton').getBoundingClientRect();
   return p.width>0&&p.height>0&&p.left>=8&&p.top>=8&&p.right<=innerWidth-8&&p.bottom<=innerHeight-8&&p.left<=a.right&&p.right>=a.left;
  }),{timeout:1500}).toBe(true);
  await panel.press('Escape');
 }
});
