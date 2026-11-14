import { defineConfig } from '@playwright/test'
import { PORT } from './tests/e2e/port'

export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  timeout: 30_000,
  webServer: {
    command: `npx vite tests/e2e/fixtures --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: true,
  },
})
