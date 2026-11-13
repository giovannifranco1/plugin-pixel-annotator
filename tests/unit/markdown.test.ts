import { describe, expect, test } from 'vitest'
import { renderCompactMarkdown, renderMarkdown } from '@/lib/markdown'
import { annotation, TWO } from './fixtures/annotations'

const meta = { origin: 'localhost:3000', generatedAt: new Date(2026, 10, 13, 14, 32) }

function fencesBalanced(md: string): boolean {
  const lines = md.split('\n')
  let open: string | null = null
  for (const line of lines) {
    const m = /^(`{3,})(.*)$/.exec(line)
    if (!m) continue
    if (open === null) open = m[1] ?? null
    else if (m[1] === open && m[2] === '') open = null
  }
  return open === null
}

describe('markdown', () => {
  test('EXPO-02 snapshot com links de imagem', () => {
    expect(renderMarkdown(TWO, meta)).toMatchSnapshot()
  })

  test('EXPO-02 cabeçalho tem origem, data dd/MM/yyyy HH:mm, total e instrução', () => {
    const md = renderMarkdown(TWO, meta)
    expect(md).toContain('# Feedback PxA — localhost:3000')
    expect(md).toContain('- **Gerado em:** 13/11/2026 14:32')
    expect(md).toContain('- **Anotações:** 2')
    expect(md).toContain('**Para o Claude Code:**')
    expect(md).toContain('---\n\n## #1 ')
  })

  test('EXPO-02 omite componente quando null', () => {
    const md = renderMarkdown([TWO[1]!], meta)
    expect(md).not.toContain('**Componente:**')
    expect(md).not.toContain('**Arquivo:**')
    expect(renderMarkdown([TWO[0]!], meta)).toContain('- **Componente:** `ClienteCard` ← `ClientesList` ← `DashboardPage` (React)')
  })

  test('EXPO-03 copiar é compacto: 2 linhas por anotação com nota, tela, rota, componente e seletor', () => {
    expect(renderCompactMarkdown(TWO, meta)).toBe(
      [
        '# PxA · localhost:3000 · 2 ajustes visuais',
        '',
        '- **#1** botões saindo pra fora do card',
        '  📱 390px `base` · `/dashboard?tab=2` · `ClienteCard` `src/components/ClienteCard.tsx:42` · `[data-testid="cliente-card"] > div.card-footer`',
        '- **#2** padding maior em cima',
        '  🖥️ 1440px `xl` · `/dashboard` · `h1.page-title`',
        '',
      ].join('\n'),
    )
  })

  test('EXPO-03 copiar não leva CSS, HTML, viewport detalhado nem print', () => {
    const md = renderCompactMarkdown(TWO, meta)
    for (const cut of ['CSS', 'HTML', '```', 'DPR', 'Print', 'shots/', 'Viewport']) expect(md, cut).not.toContain(cut)
  })

  test('EXPO-03 nota com várias linhas continua dentro do item', () => {
    const md = renderCompactMarkdown([annotation(1, { note: 'linha 1\nlinha 2', component: null })], meta)
    expect(md).toContain('- **#1** linha 1\n  linha 2\n  📱 390px')
    expect(md).toContain('# PxA · localhost:3000 · 1 ajuste visual')
  })

  test('caso limite: nota com crases continua cercada', () => {
    const md = renderMarkdown([annotation(1, { note: 'use ```js``` aqui' })], meta)
    expect(md).toContain('````text\nuse ```js``` aqui\n````')
    expect(fencesBalanced(md)).toBe(true)
  })

  test('EXPO-02 mostra "(truncado em 2.000 caracteres)" só quando truncado', () => {
    expect(renderMarkdown([TWO[1]!], meta)).toContain('(truncado em 2.000 caracteres)')
    expect(renderMarkdown([TWO[0]!], meta)).not.toContain('truncado')
  })
})
