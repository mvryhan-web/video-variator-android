import {test,expect} from '@playwright/test';

// The real consent gate is not the subject of this positioning test.
// Pre-accept in the isolated browser fixture; never change production consent.
test('first settings panel open stays anchored in Image, Video and Audio Studio',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('deepsyq_lumina_terms_accepted','true'));
 let paidCalls=0;
 page.on('request',request=>{if(request.method()==='POST'&&request.url().includes('/api/studio/jobs'))paidCalls++;});
 for(const width of [1363,390]){
  await page.setViewportSize({width,height:width<500?844:936});
  for(const studio of ['image','video','audio']){
   await page.goto('/generate-studio.html?studio='+studio);
   const gear=page.locator('#studioSettingsToggle');
   const hub=page.locator('#studioSettingsHub');
   const panel=page.locator('#settingsDialog');
   await expect(gear).toBeVisible();
   await gear.click();
   await expect(hub).toBeVisible();
   await expect(page.locator('#studioTypePicker')).toBeVisible();
   await expect(page.locator('.studio-shell>.studio-nav')).toBeHidden();
   await hub.locator('#settingsButton').click();
   await expect(hub).toBeHidden();
   await expect(panel).toBeVisible();

   // Verify the final position, including the delayed 80ms Studio layout pass.
   await expect.poll(()=>panel.evaluate(el=>{
    const p=el.getBoundingClientRect();
    const a=document.querySelector('#studioSettingsToggle').getBoundingClientRect();
    const horizontal=p.left<=a.right+12&&p.right>=a.left-12;
    const verticalGap=Math.min(Math.abs(p.bottom-a.top),Math.abs(p.top-a.bottom));
    return p.width>0&&p.height>0&&a.width>0&&a.height>0
      &&p.left>=8&&p.top>=8&&p.right<=innerWidth-8&&p.bottom<=innerHeight-8
      &&horizontal&&verticalGap<=28;
   }),{timeout:4000}).toBe(true);
   await page.waitForTimeout(180);
   const result=await panel.evaluate(el=>{
    const p=el.getBoundingClientRect(),a=document.querySelector('#studioSettingsToggle').getBoundingClientRect();
    return {
     panelLeft:p.left,panelRight:p.right,panelTop:p.top,panelBottom:p.bottom,
     gearLeft:a.left,gearRight:a.right,gearTop:a.top,gearBottom:a.bottom,
     screenWidth:innerWidth,screenHeight:innerHeight
    };
   });
   expect(result.panelLeft,'popover moved to top-left: '+studio+' viewport '+width).toBeGreaterThanOrEqual(8);
   expect(result.panelRight).toBeLessThanOrEqual(result.screenWidth-8);
   expect(result.panelBottom).toBeLessThanOrEqual(result.screenHeight-8);
   expect(result.panelLeft).toBeLessThanOrEqual(result.gearRight+12);
   expect(result.panelRight).toBeGreaterThanOrEqual(result.gearLeft-12);
   expect(Math.min(Math.abs(result.panelBottom-result.gearTop),Math.abs(result.panelTop-result.gearBottom))).toBeLessThanOrEqual(28);

   await panel.getByRole('button',{name:/^(Done|Готово|Terminé|Listo)$/}).click();
   await expect(panel).toBeHidden();
  }
 }
 expect(paidCalls).toBe(0);
});
