import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'.',testMatch:'pricing-canonical.spec.mjs',timeout:30000,retries:0,reporter:'list',
 use:{baseURL:'http://127.0.0.1:31998',trace:'retain-on-failure'},
 webServer:{cwd:process.cwd(),command:'node server/deepsyq-preview.js',url:'http://127.0.0.1:31998/api/health',reuseExistingServer:false,env:{PORT:'31998',DATABASE_URL:'',STRIPE_SECRET_KEY:'',BYTEPLUS_API_KEY:'',GEMINI_API_KEY:''}},
 projects:[{name:'chromium',use:{...devices['Desktop Chrome'],viewport:{width:1448,height:1086}}},{name:'webkit-mobile',use:{...devices['iPhone 13'],viewport:{width:390,height:844}}}]
});
