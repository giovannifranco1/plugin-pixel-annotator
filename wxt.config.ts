import { defineConfig } from 'wxt'

export default defineConfig({
  // WXT 0.21 gera MV2 para Firefox por padrão; a spec exige MV3 nos dois.
  manifestVersion: 3,
  manifest: ({ browser, mode }) => ({
    name: 'PixelAnnotator',
    short_name: 'PxA',
    description: 'Anote elementos da página e exporte feedback para o Claude Code.',
    // storage: só para o Perfil da Diversão (Q-01, aprovada pelo dev em 2026-11-14). Anotações continuam só na sessão.
    permissions: ['activeTab', 'scripting', 'storage'],
    // Só o build de E2E ganha host permission (Playwright não clica no ícone, então não há activeTab).
    ...(mode === 'e2e' ? { host_permissions: ['<all_urls>'] } : {}),
    action: { default_title: 'PixelAnnotator' },
    ...(browser === 'firefox'
      ? { browser_specific_settings: { gecko: {
            id: 'pxa@nanoincub.dev',
            strict_min_version: '128.0',
            // Exigido pelo AMO para extensões novas; o PxA não coleta dados.
            data_collection_permissions: { required: ['none'] },
          },
        },
      }
      : { minimum_chrome_version: '95' }),
  }),
})
