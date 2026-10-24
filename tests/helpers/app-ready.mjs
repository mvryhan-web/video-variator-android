import {expect} from '@playwright/test';
// Firefox occasionally misses the navigation lifecycle notification after COOP.
// The page and scripts are already present in retained traces: wait for actual
// document and app readiness, then keep every existing UI assertion.
export async function gotoAppReady(page){
 await page.goto('/',{waitUntil:'commit'});
 await expect.poll(()=>page.evaluate(()=>document.readyState!=='loading'&&typeof window.VideoVariatorCore?.process==='function'&&typeof window.VideoVariatorUI?.setFiles==='function')).toBe(true);
}
