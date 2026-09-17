import {defineConfig,devices} from '@playwright/test';

export default defineConfig({
  testDir:'./tests',
  timeout:30000,
  retries:1,
  reporter:'list',
  use:{baseURL:'http://127.0.0.1:3000',trace:'retain-on-failure'},
  webServer:{command:'node server/server.js',url:'http://127.0.0.1:3000/api/health',reuseExistingServer:false,env:{...process.env,NODE_ENV:'test',APP_URL:'http://127.0.0.1:3000',APP_JWT_SECRET:'test-only-secret-test-only-secret-123456',CORS_ORIGIN:'http://127.0.0.1:3000'}},
  projects:[
    {name:'chromium',use:{...devices['Desktop Chrome']}},
    {name:'firefox',use:{...devices['Desktop Firefox']}},
    {name:'webkit',use:{...devices['Desktop Safari']}},
    {name:'mobile-webkit',use:{...devices['iPhone 13']}},
    {name:'mobile-chromium',use:{...devices['Pixel 7']}}
  ]
});
