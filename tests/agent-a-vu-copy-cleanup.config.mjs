import {defineConfig,devices} from '@playwright/test';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
export default defineConfig({
 testDir:'.',testMatch:['agent-a-vu-copy-cleanup.spec.mjs'],
 timeout:35000,retries:1,workers:2,reporter:'list',
 use:{baseURL:'http://127.0.0.1:31997',reducedMotion:'reduce',trace:'retain-on-failure'},
 webServer:{cwd:root,command:'node server/deepsyq-preview.js',url:'http://127.0.0.1:31997/api/health',reuseExistingServer:false,env:{PORT:'31997'}},
 projects:[{name:'chromium',use:{...devices['Desktop Chrome'],viewport:{width:1448,height:1086}}},
           {name:'mobile-chromium',use:{...devices['Pixel 7'],viewport:{width:390,height:844}}}]
});
