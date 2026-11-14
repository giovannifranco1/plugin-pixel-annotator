import { defineConfig } from '@playwright/test'
import { PORT } from './tests/e2e/port'

// Gera os prints do README (media/*.png). Não faz parte da suíte de testes.
export default defineConfig({
  testDir: 'scripts/screenshots',
  workers: 1,
  timeout: 60_000,
  webServer: {
    command: `npx vite tests/e2e/fixtures --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: true,
  },
})
