import {defineConfig,devices} from '@playwright/test';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
export default defineConfig({
 testDir:'.',
 testMatch:['jarvix-conversational-voice.spec.mjs'],
 timeout:35000,retries:1,workers:1,reporter:'list',
 use:{baseURL:'http://127.0.0.1:31994',trace:'retain-on-failure'},
 webServer:{cwd:root,command:'node server/deepsyq-preview.js',url:'http://127.0.0.1:31994/api/health',
  reuseExistingServer:false,env:{...process.env,PORT:'31994',NODE_ENV:'test',JARVIX_AI_ENABLED:'false',JARVIX_FREE_LLM_ENABLED:'false',AI_BILLING_MODE:'test',OPENAI_API_KEY:'',GEMINI_API_KEY:''}},
 projects:[
  {name:'chromium',use:{...devices['Desktop Chrome']}},
  {name:'mobile-webkit',use:{...devices['iPhone 13']}}
 ]
});
