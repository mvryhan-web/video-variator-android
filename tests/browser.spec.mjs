import {test,expect} from '@playwright/test';

async function openView(page,name){
  await page.locator(`.navBtn[data-view="${name}"]`).evaluate(el=>el.click());
  await expect(page.locator(`#${name}View`)).toHaveClass(/active/);
}

test.beforeEach(async({page})=>{
  await page.route(/accounts\.google\.com|appleid\.cdn-apple\.com|unpkg\.com/,route=>route.abort());
  await page.goto('/');
  await expect(page).toHaveTitle(/Video Uniquifier/);
});

test('loads rebranded dashboard with zero of two free trial videos',async({page})=>{
  await expect(page.getByRole('heading',{name:'Dashboard'})).toBeVisible();
  await expect(page.locator('#creditText')).toHaveText('0 / 2');
  await expect(page.getByText('Uniqueify your old video')).toBeVisible();
  await expect(page.getByText('Video Uniquifier',{exact:true}).first()).toBeVisible();
});

test('loads FFmpeg wrapper from same-origin when external CDN is blocked',async({page})=>{
  await expect.poll(()=>page.evaluate(()=>!!window.FFmpegWASM?.FFmpeg),{timeout:10000}).toBe(true);
});

test('serves the FFmpeg core from same-origin',async({request})=>{
  for(const path of ['/vendor/ffmpeg/ffmpeg.js','/vendor/ffmpeg/ffmpeg-core.js','/vendor/ffmpeg/ffmpeg-core.wasm']){
    const response=await request.head(path);
    expect(response.status()).toBe(200);
  }
});

test('FFmpeg engine boots with the production worker',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='chromium');
  test.setTimeout(120000);
  const ok=await page.evaluate(async()=>{
    const toBlobURL=async(url,type)=>{
      const r=await fetch(url);
      if(!r.ok)throw new Error(`HTTP ${r.status}: ${url}`);
      return URL.createObjectURL(new Blob([await r.arrayBuffer()],{type}));
    };
    const ffmpeg=new window.FFmpegWASM.FFmpeg();
    const classWorkerURL=await toBlobURL('/ffmpeg-worker.js','text/javascript');
    const origin=location.origin;
    const coreURL=`${origin}/vendor/ffmpeg/ffmpeg-core.js`;
    const wasmURL=`${origin}/vendor/ffmpeg/ffmpeg-core.wasm`;
    try{
      await ffmpeg.load({classWorkerURL,coreURL,wasmURL});
      return true;
    }finally{
      try{ffmpeg.terminate();}catch(_){ }
      URL.revokeObjectURL(classWorkerURL);
    }
  });
  expect(ok).toBe(true);
});

test('trial unlocks all modes plus 720p 1080p and 4K',async({page})=>{
  await expect(page.locator('#folderBtn')).toHaveCount(0);
  const mode=page.locator('#mode');
  await expect(mode).toBeEnabled();
  await expect(mode.locator('option[value="gentle"]')).not.toHaveAttribute('disabled','');
  await expect(mode.locator('option[value="balanced"]')).not.toHaveAttribute('disabled','');
  await expect(mode.locator('option[value="dynamic"]')).not.toHaveAttribute('disabled','');
  await mode.selectOption('balanced');
  await expect(mode).toHaveValue('balanced');
  await mode.selectOption('dynamic');
  await expect(mode).toHaveValue('dynamic');
  await mode.selectOption('gentle');
  await expect(mode).toHaveValue('gentle');

  const quality=page.locator('#quality');
  await expect(quality).toBeEnabled();
  await expect(quality.locator('option[value="720"]')).not.toHaveAttribute('disabled','');
  await expect(quality.locator('option[value="1080"]')).not.toHaveAttribute('disabled','');
  await expect(quality.locator('option[value="2160"]')).not.toHaveAttribute('disabled','');
  await quality.selectOption('1080');
  await expect(quality).toHaveValue('1080');
  await quality.selectOption('2160');
  await expect(quality).toHaveValue('2160');
  await quality.selectOption('720');
  await expect(quality).toHaveValue('720');

  await expect(page.locator('#variantCount option[value="10"]')).toHaveAttribute('disabled','');
  await expect(page.locator('#variantCount option[value="15"]')).toHaveAttribute('disabled','');
});

test('Pro unlocks 10 variations and Business unlocks 15',async({page})=>{
  await page.locator('#currentPlan').evaluate(el=>el.textContent='Pro');
  await expect(page.locator('#variantCount option[value="10"]')).not.toHaveAttribute('disabled','');
  await expect(page.locator('#variantCount option[value="15"]')).toHaveAttribute('disabled','');
  await page.locator('#currentPlan').evaluate(el=>el.textContent='Business');
  await expect(page.locator('#variantCount option[value="15"]')).not.toHaveAttribute('disabled','');
});

test('back button is available outside dashboard',async({page})=>{
  await openView(page,'history');
  await expect(page.locator('#backBtn')).toBeVisible();
  await page.locator('#backBtn').click();
  await expect(page.locator('#dashboardView')).toHaveClass(/active/);
});

test('pricing displays credits plan access and quality',async({page})=>{
  await openView(page,'plans');
  await expect(page.getByText('750',{exact:true})).toBeVisible();
  await expect(page.getByText('2,250',{exact:true})).toBeVisible();
  await expect(page.getByText('15,000',{exact:true})).toBeVisible();
  await expect(page.getByText('Gentle mode · 720p · 9:16 / 16:9')).toBeVisible();
  await expect(page.getByText('Gentle + Balance · 1080p · 9:16 / 16:9')).toBeVisible();
  await expect(page.getByText('All modes · 4K · 9:16 / 16:9')).toBeVisible();
});

test('supports vertical and landscape output controls',async({page})=>{
  const format=page.locator('#aspectRatio');
  await expect(format).toBeVisible();
  await format.selectOption('16:9');
  await expect(format).toHaveValue('16:9');
  await format.selectOption('9:16');
  await expect(format).toHaveValue('9:16');
});

test('analytics profile error handling and FAQ are reachable',async({page})=>{
  await openView(page,'analytics');
  await expect(page.locator('#analyticsView').getByRole('heading',{name:'Analytics'})).toBeVisible();
  await openView(page,'profile');
  await expect(page.locator('#profileView').getByRole('heading',{name:'Profile & Settings'})).toBeVisible();
  await expect(page.getByText('Privacy & security')).toBeVisible();
  await expect(page.getByRole('button',{name:'Cancel subscription'})).toBeVisible();
  await openView(page,'faq');
  await expect(page.getByText('How do credits work?')).toBeVisible();
  await expect(page.getByText('What processing modes are included?')).toBeVisible();
  await expect(page.getByText('How is my data protected?')).toBeVisible();
});
