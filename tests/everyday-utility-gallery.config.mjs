import {defineConfig,devices} from '@playwright/test';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
export default defineConfig({
 testDir:'.',testMatch:'everyday-utility-gallery.spec.mjs',
 timeout:50000,retries:1,workers:3,reporter:'list',
 use:{baseURL:'http://127.0.0.1:31995',trace:'retain-on-failure',reducedMotion:'reduce'},
 webServer:{cwd:root,command:'node server/deepsyq-preview.js',url:'http://127.0.0.1:31995/api/health',reuseExistingServer:false,env:{PORT:'31995'}},
 projects:[
  {name:'desktop-chromium',use:{...devices['Desktop Chrome'],viewport:{width:1448,height:1086}}},
  {name:'mobile-chromium',use:{...devices['Pixel 7'],viewport:{width:390,height:844}}},
  {name:'desktop-webkit',use:{...devices['Desktop Safari'],viewport:{width:1448,height:1086}}},
  {name:'mobile-webkit',use:{...devices['iPhone 13'],viewport:{width:390,height:844}}}
 ]
});