// Pruebas e2e en navegador real contra el servidor local con datos mock (ver tests/e2e/servidor.js).
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/e2e/servidor.js',
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: { trace: 'retain-on-failure' },
  projects: [{ name: 'chromium-movil', use: { ...devices['Pixel 7'] } }]
});
