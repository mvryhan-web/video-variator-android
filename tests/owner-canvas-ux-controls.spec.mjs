import {test,expect} from '@playwright/test';

test.describe('Owner Canvas — isolated UX regression checks',()=>{
  test.beforeEach(async ({page})=>{
    const errs=[];
    page.on('pageerror',e=>errs.push(e.message));
    await page.goto('/canvas.html',{waitUntil:'domcontentloaded'});
    await expect(page.locator('#cwGallery [data-cw-photo]')).toHaveCount(13,{timeout:20000});
    await expect(page.locator('#cwStage')).toBeVisible();
  });

  test('internal gallery, editor, inspector never overlap global sidebar',async({page,isMobile})=>{
    const props=await page.evaluate(()=>{
      const rect=id=>{const r=document.querySelector(id).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
      return {rail:rect('.cw-rail'),library:rect('.cw-library'),editor:rect('.cw-editor'),inspector:rect('.cw-inspector'),sidebar:document.querySelector('#dsSiteSidebar')?rect('#dsSiteSidebar'):null,
       libPosition:getComputedStyle(document.querySelector('.cw-library')).position,
       insPosition:getComputedStyle(document.querySelector('.cw-inspector')).position};
    });
    expect(props.libPosition).not.toBe('fixed');
    expect(props.insPosition).not.toBe('fixed');
    if(!isMobile){
      expect(props.rail.right).toBeLessThan(props.library.left+2);
      expect(props.library.right).toBeLessThan(props.editor.left+2);
      if(page.viewportSize().width>1060)expect(props.editor.right).toBeLessThan(props.inspector.left+3);
      if(props.sidebar)expect(props.rail.left).toBeGreaterThanOrEqual(props.sidebar.right-3);
      expect(props.editor.width).toBeGreaterThan(300);
    }else{
      expect(props.library.top).toBeGreaterThan(props.editor.top);
      const gallery=page.locator('#cwGallery');
      const overflow=await gallery.evaluate(el=>getComputedStyle(el).overflowX);
      expect(overflow).toBe('auto');
    }
  });

  test('zoom changes photo board but keeps top toolbar normal sized',async({page})=>{
    const panel=page.locator('.cw-selection-tools');
    const widthBefore=(await panel.boundingBox()).width;
    await page.locator('#cwZoomIn').click();
    await expect(page.locator('#cwZoomValue')).toHaveText('110%');
    await expect(page.locator('#cwArtboard')).toHaveCSS('transform',/matrix\(1\.1/);
    expect((await panel.boundingBox()).width).toBeCloseTo(widthBefore,0);
    await page.locator('#cwZoomOut').click();
    await expect(page.locator('#cwZoomValue')).toHaveText('100%');
  });

  test('text is editable directly on photo, with text toolbar, delete, undo and redo',async({page})=>{
    await page.locator('[data-cw-tool="text"]').click();
    await expect(page.locator('#cwInlineText')).toBeVisible();
    await page.locator('#cwInlineText').fill('Example Canvas text');
    await expect(page.locator('#cwTextContent')).toHaveValue('Example Canvas text');
    await page.locator('#cwTextFontSize').fill('76');
    await page.locator('#cwTextFontSize').dispatchEvent('change');
    await expect(page.locator('#cwTextFontSize')).toHaveValue('76');
    await page.locator('#cwTextRemove').click();
    await expect(page.locator('#cwTextOptions')).toBeHidden();
    await page.locator('#cwUndo').click();
    await expect(page.locator('#cwTextContent')).toHaveValue('Example Canvas text');
    await page.locator('#cwRedo').click();
    await expect(page.locator('#cwTextOptions')).toBeHidden();
  });

  test('video mode keeps ratio, settings opens and mirror affects picture',async({page})=>{
    await page.locator('#cwSettings').click();
    await expect(page.locator('#cwSettingsPanel')).toBeVisible();
    await page.locator('#cwSettingsRatio').selectOption('4:5');
    await expect(page.locator('#cwRatioQuick')).toHaveValue('4:5');
    await page.locator('#cwSettingsMode').selectOption('video');
    await expect(page.locator('#cwModeInfo')).toBeVisible();
    await expect(page.locator('#cwRatioQuick')).toHaveValue('4:5');
    await expect(page.locator('#cwGenerate')).toContainText('Generate Video');
    await page.locator('#cwSettingsClose').click();
    await expect(page.locator('#cwSettingsPanel')).toBeHidden();
    await page.locator('#cwImageMode').click();
    await expect(page.locator('#cwModeInfo')).toBeHidden();
    await expect(page.locator('#cwRatioQuick')).toHaveValue('4:5');
    await page.locator('#cwFlipTop').click();
    await expect(page.locator('#cwStatus')).toContainText('mirrored');
    await expect(page.locator('#cwUndo')).toBeEnabled();
  });

  test('Gallery 13 photos and mobile upload/settings controls',async({page,isMobile})=>{
    await expect(page.locator('#cwGallery [data-cw-photo]')).toHaveCount(13);
    await page.locator('#cwGallery [data-cw-photo="demo-4"]').click();
    await expect(page.locator('#cwGallery [data-cw-photo="demo-4"]')).toHaveAttribute('aria-pressed','true');
    if(isMobile){
      await expect(page.locator('#cwSettings')).toBeVisible();
      await expect(page.locator('#cwUploadMain')).toBeVisible();
      await expect(page.locator('.cw-gallery')).toHaveCSS('overflow-x','auto');
    }
  });

  test('export PNG downloads an edited image',async({page})=>{
    await page.locator('[data-cw-tool="text"]').click();
    await page.locator('#cwInlineText').fill('Canvas export example');
    const save=page.waitForEvent('download',{timeout:20000});
    await page.locator('#cwExport').click();
    const downloaded=await save;
    expect(downloaded.suggestedFilename()).toMatch(/^DEEPSYQ-Canvas-.*\.png$/);
    const {readFile}=await import('node:fs/promises');
    const bytes=await readFile(await downloaded.path());
    expect(bytes.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(bytes.length).toBeGreaterThan(10000);
  });

  test('AI Studio toolbar opens the existing Studio without generating or charging',async({page})=>{
    await page.locator('[data-cw-tool="apps"]').click();
    await expect(page).toHaveURL(/generate-studio\.html\?studio=image&from=canvas/,{timeout:20000});
  });
});
