import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

test('creator page connects real tools and keeps plan prices',async({page},info)=>{
 await page.goto('/');await expect(page.locator('.creatorToolCard')).toHaveCount(6);
 await expect(page.locator('#creatorStart')).toBeVisible();
 const choose=page.waitForEvent('filechooser');await page.locator('#creatorStart').click();expect((await choose).isMultiple()).toBe(true);
 await expect(page.locator('#fileSummary')).toHaveText('No videos selected yet.');
 await page.locator('#creatorPlans').click();await expect(page.locator('#plansView')).toHaveClass(/active/);
 for(const [plan,price] of [['basic','$9'],['pro','$24'],['business','$99'],['lifetime','€2,999']])await expect(page.locator('.priceCard').filter({has:page.locator(`[data-plan="${plan}"]`)}).locator('.price b')).toHaveText(price);
 await page.locator('.navBtn[data-view="dashboard"]').evaluate(e=>e.click());
 await expect(page.locator('a[href="free-tools.html?tool=clips"]')).toBeVisible();
 await page.screenshot({path:`test-results/creator-${info.project.name}.png`,fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.goto('/free-tools.html?tool=clips');await expect(page.locator('#operation')).toHaveValue('clips');await expect(page.locator('#clipSettings')).toBeVisible();
 await page.locator('#operation').selectOption('motion');await expect(page.locator('#files')).toHaveAttribute('accept','image/jpeg,image/png,image/webp');await expect(page.locator('#files')).not.toHaveAttribute('multiple');await expect(page.locator('#clipSettings')).toBeHidden();
});

test('actual local clipping and photo motion export playable MP4 files without uploads',async({page},info)=>{
 test.skip(info.project.name!=='chromium');test.setTimeout(180000);
 const dir=mkdtempSync(join(tmpdir(),'vu-creator-'));let posts=0;page.on('request',r=>{if(r.method()==='POST')posts++;});
 try{
 execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','testsrc2=size=160x120:rate=25:duration=1.2','-f','lavfi','-i','sine=frequency=440:duration=1.2','-c:v','libx264','-c:a','aac','-shortest',join(dir,'source.mp4')]);
 execFileSync('ffmpeg',['-v','error','-i',join(dir,'source.mp4'),'-frames:v','1',join(dir,'source.png')]);
 await page.goto('/free-tools.html?tool=clips');await page.locator('#files').setInputFiles(join(dir,'source.mp4'));
 await page.locator('#run').click();await expect(page.locator('#status')).toHaveText('Done',{timeout:120000});await expect(page.locator('#outputs video')).toHaveCount(1);
 const download=page.waitForEvent('download');await page.locator('#outputs button').first().click();const file=await download;await file.saveAs(join(dir,'clip.mp4'));
 const probe=p=>JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','stream=codec_type,width,height:format=duration','-of','json',p],{encoding:'utf8'}));
 let meta=probe(join(dir,'clip.mp4'));expect(meta.streams.find(s=>s.codec_type==='video')).toMatchObject({width:720,height:1280});expect(meta.streams.some(s=>s.codec_type==='audio')).toBe(true);expect(Number(meta.format.duration)).toBeGreaterThan(1);
 await page.locator('#operation').selectOption('motion');await page.locator('#creatorFormat').selectOption('landscape');await page.locator('#files').setInputFiles(join(dir,'source.png'));await page.locator('#run').click();await expect(page.locator('#status')).toHaveText('Done',{timeout:120000});
 const motionDownload=page.waitForEvent('download');await page.locator('#outputs button').first().click();await(await motionDownload).saveAs(join(dir,'motion.mp4'));
 meta=probe(join(dir,'motion.mp4'));expect(meta.streams.find(s=>s.codec_type==='video')).toMatchObject({width:1280,height:720});expect(Number(meta.format.duration)).toBeCloseTo(5,0);
 const frames=execFileSync('ffmpeg',['-v','error','-i',join(dir,'motion.mp4'),'-vf','select=eq(n\\,0)+eq(n\\,124)','-vsync','0','-f','framemd5','-'],{encoding:'utf8'}).split('\n').filter(l=>l&&!l.startsWith('#')).map(l=>l.split(',').at(-1).trim());expect(frames).toHaveLength(2);expect(frames[0]).not.toBe(frames[1]);
 expect(posts).toBe(0);
 const commands=await page.evaluate(()=>window.VUCreatorTools.commands('clips',{duration:31,count:10,seconds:15}));expect(commands).toHaveLength(3);expect(commands[2].args[commands[2].args.indexOf('-t')+1]).toBe('1');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
