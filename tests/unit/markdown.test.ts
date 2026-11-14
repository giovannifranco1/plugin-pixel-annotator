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

  const at = (h: number, m: number, sec: number) => new Date(2026, 10, 14, h, m, sec).toISOString()
  const errors = [
    { kind: 'console' as const, message: 'TypeError: x is undefined', at: at(14, 30, 5), count: 3 },
    { kind: 'exception' as const, message: 'Uncaught ReferenceError: foo', at: at(14, 30, 6), count: 1, source: 'http://localhost:3000/main.js:42' },
    { kind: 'rejection' as const, message: 'Error: timeout', at: at(14, 30, 7), count: 1 },
    { kind: 'network' as const, message: 'GET http://localhost:3000/api/x → 404', at: at(14, 30, 8), count: 1, method: 'GET', url: 'http://localhost:3000/api/x', status: 404 },
  ]

  test('ERRO-05 seção "Erros no console" em bloco text, com horário, tipo, origem e ×N', () => {
    const md = renderMarkdown([annotation(1, { errors })], meta)
    expect(md).toContain([
      '**Erros no console:**',
      '',
      '```text',
      '14:30:05 console.error: TypeError: x is undefined ×3',
      '14:30:06 erro: Uncaught ReferenceError: foo (http://localhost:3000/main.js:42)',
      '14:30:07 promise rejeitada: Error: timeout',
      '14:30:08 rede: GET http://localhost:3000/api/x → 404',
      '```',
    ].join('\n'))
    expect(fencesBalanced(md)).toBe(true)
  })

  test('ERRO-05 sem erros, sem seção (export do M1 inalterado)', () => {
    expect(renderMarkdown(TWO, meta)).not.toContain('Erros no console')
  })

  test('ERRO-05 compacto ganha só "⚠ N erros" na linha de metadados', () => {
    const md = renderCompactMarkdown([annotation(1, { errors, component: null }), annotation(2, { errors: [errors[0]!], component: null })], meta)
    expect(md).toContain('· `[data-testid="cliente-card"] > div.card-footer` · ⚠ 4 erros\n')
    expect(md).toContain('· ⚠ 1 erro\n')
    expect(md).not.toContain('TypeError')
  })

  test('DESE-03 print com Desenho aponta o composto e cita o original', () => {
    const drawing = { strokes: [], block: 2, composite: new Blob() }
    expect(renderMarkdown([annotation(3, { drawing })], meta)).toContain('- **Print:** ![#3](shots/03.png) (com desenho; original em `shots/03-original.png`)')
  })

  test('IMPO-03 anotação importada diz de onde veio', () => {
    const md = renderMarkdown([annotation(4, { importedFrom: { origin: 'https://staging.app.com', number: 3 } })], meta)
    expect(md).toContain('- **Importada de:** `staging.app.com` (#3)')
  })
})

