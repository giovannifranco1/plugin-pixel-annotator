import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  timeout: 30_000,
  webServer: {
    command: 'npx vite tests/e2e/fixtures --port 5174 --strictPort',
    port: 5174,
    reuseExistingServer: true,
  },
})
