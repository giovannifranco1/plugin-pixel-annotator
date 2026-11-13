import { defineConfig } from '@playwright/test'

// Gera os prints do README (media/*.png). Não faz parte da suíte de testes.
export default defineConfig({
  testDir: 'scripts/screenshots',
  workers: 1,
  timeout: 60_000,
  webServer: {
    command: 'npx vite tests/e2e/fixtures --port 5174 --strictPort',
    port: 5174,
    reuseExistingServer: true,
  },
})
