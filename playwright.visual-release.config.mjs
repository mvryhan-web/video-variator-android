import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'./tests',testMatch:['owner-home-layout.spec.mjs'],
 timeout:45000,retries:1,reporter:'list',
 use:{baseURL:'http://127.0.0.1:31990',trace:'retain-on-failure'},
 webServer:{command:'node server/deepsyq-preview.js',url:'http://127.0.0.1:31990/api/health',reuseExistingServer:false,timeout:30000,env:{...process.env,PORT:'31990',NODE_ENV:'test'}},
 projects:[{name:'chromium',use:{...devices['Desktop Chrome']}},{name:'mobile-chromium',use:{...devices['Pixel 7']}}]
});