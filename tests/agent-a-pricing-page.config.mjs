import {defineConfig,devices} from '@playwright/test';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
export default defineConfig({
 testDir:'.',testMatch:['agent-a-pricing-page.spec.mjs'],timeout:45000,retries:1,workers:2,reporter:'list',
 use:{baseURL:'http://127.0.0.1:32031',trace:'retain-on-failure',reducedMotion:'reduce'},
 webServer:{cwd:root,command:'node server/deepsyq-preview.js',url:'http://127.0.0.1:32031/api/health',reuseExistingServer:false,env:{PORT:'32031'}},
 projects:[{name:'desktop',use:{...devices['Desktop Chrome'],viewport:{width:1448,height:1086}}},
 {name:'mobile',use:{...devices['Pixel 7'],viewport:{width:390,height:844}}}]
});
