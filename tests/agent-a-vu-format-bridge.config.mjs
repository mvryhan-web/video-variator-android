import {defineConfig,devices} from '@playwright/test';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
export default defineConfig({
 testDir:'.',testMatch:['agent-a-vu-format-bridge.spec.mjs'],
 timeout:35000,retries:1,workers:2,reporter:'list',
 use:{baseURL:'http://127.0.0.1:31993',reducedMotion:'reduce',trace:'retain-on-failure'},
 webServer:{cwd:root,command:'node server/deepsyq-preview.js',url:'http://127.0.0.1:31993/api/health',reuseExistingServer:false,env:{PORT:'31993'}},
 projects:[{name:'chromium',use:{...devices['Desktop Chrome'],viewport:{width:1448,height:1086}}},
           {name:'mobile-chromium',use:{...devices['Pixel 7'],viewport:{width:390,height:844}}}]
});
