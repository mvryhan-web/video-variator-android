import { defineConfig, devices } from '@playwright/test';

// Dedicated, no-spend V6.3 microphone UI acceptance.
// The production-style server/server.js correctly forbids inline modules via CSP;
// voice-agent-preview.html is a standalone preview with an existing inline module.
// Use the site's already-established isolated preview server without weakening
// any production CSP policy, altering core routing, or making paid API calls.
export default defineConfig({
  testDir: '.',
  testMatch: ['voice-agent-preview.spec.mjs'],
  timeout: 30_000,
  retries: 1,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:31992', trace: 'retain-on-failure' },
  webServer: {
    command: 'node server/deepsyq-preview.js',
    url: 'http://127.0.0.1:31992/api/health',
    reuseExistingServer: false,
    env: { ...process.env, PORT: '31992', NODE_ENV: 'test' }
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'] } }
  ]
});
