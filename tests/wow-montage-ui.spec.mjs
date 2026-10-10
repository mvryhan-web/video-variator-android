import {test, expect} from '@playwright/test';

test.beforeEach(async ({page}) => {
  await page.route(/accounts\.google\.com|appleid\.cdn-apple\.com/, route => route.abort());
});

test('WOW remains off and unavailable in all three modes, including after reload', async ({page}) => {
  await page.goto('/');
  const toggle = page.getByRole('switch', {name:'WOW Montage'});
  await expect(toggle).toBeDisabled();
  await expect(toggle).not.toBeChecked();
  await expect(page.locator('#wowMontageStatus')).toHaveText('In development');
  await expect(page.locator('#wowMontageHelp')).toContainText('Not available yet');
  for (const mode of ['gentle','balanced','dynamic']) {
    await page.locator('#mode').selectOption(mode);
    await expect(page.locator('#mode')).toHaveValue(mode);
    await expect(page.locator('#wowMontageOption')).toBeVisible();
    await expect(toggle).toBeDisabled();
    const labelBox = await page.locator('label[for="wowMontage"]').boundingBox();
    await page.mouse.click(labelBox.x + labelBox.width / 2, labelBox.y + labelBox.height / 2);
    await expect(toggle).not.toBeChecked();
  }
  await page.reload();
  await expect(toggle).toBeDisabled();
  await expect(toggle).not.toBeChecked();
  expect(await page.evaluate(() => typeof window.createMontageRequest)).toBe('undefined');
});

test('optional control fits narrow screens in both themes and supported locales', async ({page}, info) => {
  const locales = [
    ['en-US','In development'],['ru-RU','В разработке'],
    ['fr-FR','En développement'],['uk-UA','У розробці'],
  ];
  await page.addInitScript(() => {
    const locale = new URL(location.href).searchParams.get('wow-test-locale') || 'en-US';
    Object.defineProperty(navigator,'languages',{get:() => [locale]});
    Object.defineProperty(navigator,'language',{get:() => locale});
  });
  for (const [locale, status] of locales) {
    await page.goto('/?wow-test-locale=' + locale);
    await expect(page.locator('#wowMontageStatus')).toHaveText(status);
    for (const width of [320,390,768]) for (const theme of ['dark','light']) {
      await page.setViewportSize({width,height:844});
      await page.evaluate(value => document.documentElement.dataset.theme = value, theme);
      const box = await page.locator('#wowMontageOption').boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
      expect(await page.locator('#wowMontageOption').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      await expect(page.getByRole('switch',{name:'WOW Montage'})).not.toBeChecked();
    }
  }
  if (info.project.name === 'mobile-chromium') {
    await page.locator('#wowMontageOption').screenshot({path:info.outputPath('wow-montage-preparation.png')});
  }
});

test('UI still invokes the existing processing API without a WOW option', async ({page}) => {
  await page.goto('/');
  // Capture the UI boundary only. Real encoding is covered separately by baseline tests.
  await page.evaluate(() => {
    window.wowStage2Calls = [];
    VideoVariatorCore.estimateCredits = async variants => ({durations:[1],sourceCount:1,sourceSeconds:1,creditSeconds:variants,variants});
    VideoVariatorCore.process = async options => {
      window.wowStage2Calls.push({mode:options.mode,keys:Object.keys(options)});
      throw Error('Test capture: no encode requested');
    };
  });
  await page.locator('#fileInput').setInputFiles({name:'fixture.mp4',mimeType:'video/mp4',buffer:Buffer.from('UI selection fixture')});
  for (const mode of ['gentle','balanced','dynamic']) {
    await page.locator('#mode').selectOption(mode);
    await expect(page.locator('#startBtn')).toBeEnabled();
    await page.locator('#startBtn').click();
    await expect.poll(() => page.evaluate(() => window.wowStage2Calls.at(-1)?.mode)).toBe(mode);
  }
  const calls = await page.evaluate(() => window.wowStage2Calls);
  expect(calls).toHaveLength(3);
  for (const call of calls) expect(call.keys.sort()).toEqual(['fastExport','mode','onResult','resolution','variants']);
  await expect(page.getByRole('switch',{name:'WOW Montage'})).toBeDisabled();
});
