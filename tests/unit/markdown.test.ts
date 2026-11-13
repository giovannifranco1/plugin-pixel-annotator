import { describe, expect, test } from 'vitest'
import { renderMarkdown } from '@/lib/markdown'
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
    expect(renderMarkdown(TWO, meta, { imageLinks: true })).toMatchSnapshot()
  })

  test('EXPO-02 cabeçalho tem origem, data dd/MM/yyyy HH:mm, total e instrução', () => {
    const md = renderMarkdown(TWO, meta, { imageLinks: true })
    expect(md).toContain('# Feedback PxA — localhost:3000')
    expect(md).toContain('- **Gerado em:** 13/11/2026 14:32')
    expect(md).toContain('- **Anotações:** 2')
    expect(md).toContain('**Para o Claude Code:**')
    expect(md).toContain('---\n\n## #1 ')
  })

  test('EXPO-02 omite componente quando null', () => {
    const md = renderMarkdown([TWO[1]!], meta, { imageLinks: true })
    expect(md).not.toContain('**Componente:**')
    expect(md).not.toContain('**Arquivo:**')
    expect(renderMarkdown([TWO[0]!], meta, { imageLinks: true })).toContain('- **Componente:** `ClienteCard` ← `ClientesList` ← `DashboardPage` (React)')
  })

  test('EXPO-03 sem links troca por "(print disponível no .zip)"', () => {
    const md = renderMarkdown(TWO, meta, { imageLinks: false })
    expect(md).not.toContain('](shots/')
    expect(md).toContain('(print disponível no .zip)')
  })

  test('caso limite: nota com crases continua cercada', () => {
    const md = renderMarkdown([annotation(1, { note: 'use ```js``` aqui' })], meta, { imageLinks: true })
    expect(md).toContain('````text\nuse ```js``` aqui\n````')
    expect(fencesBalanced(md)).toBe(true)
  })

  test('EXPO-02 mostra "(truncado em 2.000 caracteres)" só quando truncado', () => {
    expect(renderMarkdown([TWO[1]!], meta, { imageLinks: true })).toContain('(truncado em 2.000 caracteres)')
    expect(renderMarkdown([TWO[0]!], meta, { imageLinks: true })).not.toContain('truncado')
  })
})
