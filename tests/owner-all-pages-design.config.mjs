import {defineConfig,devices} from '@playwright/test';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
export default defineConfig({
 outputDir:root+'test-results',testDir:'.',testMatch:['owner-all-pages-design.spec.mjs','owner-approved-actions.spec.mjs','photo-collage.spec.mjs','base28-teleprompter.spec.mjs','base28-simple-background-remover.spec.mjs'],timeout:45000,
 retries:1,workers:4,reporter:'list',
 use:{baseURL:'http://127.0.0.1:31990',reducedMotion:'reduce',trace:'retain-on-failure'},
 webServer:{cwd:root,command:'node server/deepsyq-preview.js',url:'http://127.0.0.1:31990/api/health',reuseExistingServer:false,env:{PORT:'31990'}},
 projects:[
  {name:'desktop-chromium',use:{...devices['Desktop Chrome'],viewport:{width:1448,height:1086}}},
  {name:'mobile-chromium',use:{...devices['Pixel 7'],viewport:{width:390,height:844}}},
  {name:'desktop-webkit',use:{...devices['Desktop Safari'],viewport:{width:1448,height:1086}}},
  {name:'mobile-webkit',use:{...devices['iPhone 13'],viewport:{width:390,height:844}}}
 ]
});
