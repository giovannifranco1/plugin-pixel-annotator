import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { compareVersions, formatDate, hasNews, inlineParts, parseChangelog } from '@/lib/changelog'

const SAMPLE = `# Changelog do PxA

Texto solto de introdução.

## 1.10.0 — 2026-12-01
- Item com **negrito** e \`código\`.
- Outro item.

## 1.9.0 — 2026-11-20
- Só um item.

## Sem versão
- ignorado

## 1.0.0 — 2026-11-13
- Primeira versão.
linha solta ignorada
`

describe('changelog: parser', () => {
  test('NOVI-02 entradas da mais nova para a mais antiga, com versão, data e itens', () => {
    expect(parseChangelog(SAMPLE)).toEqual([
      { version: '1.10.0', date: '2026-12-01', items: ['Item com **negrito** e `código`.', 'Outro item.'] },
      { version: '1.9.0', date: '2026-11-20', items: ['Só um item.'] },
      { version: '1.0.0', date: '2026-11-13', items: ['Primeira versão.'] },
    ])
  })

  test('NOVI-02 ordena por versão mesmo se o arquivo vier fora de ordem', () => {
    const md = '## 1.0.0 — 2026-11-13\n- a\n## 1.2.0 — 2026-11-16\n- b\n'
    expect(parseChangelog(md).map((e) => e.version)).toEqual(['1.2.0', '1.0.0'])
  })

  test('NOVI-15 linhas fora do formato são ignoradas sem quebrar as outras entradas', () => {
    const md = '## 1.0.0 — 2026-11-13\n- a\n* asterisco não\nlixo\n## Título qualquer\n- não entra\n## 1.1.0 - 2026-11-14\n- hífen simples também vale\n'
    expect(parseChangelog(md)).toEqual([
      { version: '1.1.0', date: '2026-11-14', items: ['hífen simples também vale'] },
      { version: '1.0.0', date: '2026-11-13', items: ['a'] },
    ])
  })

  test('NOVI-15 arquivo vazio ou sem entradas devolve lista vazia', () => {
    expect(parseChangelog('')).toEqual([])
    expect(parseChangelog('# Changelog\n\nnada aqui')).toEqual([])
  })

  test('NOVI-07 inline: só **negrito** e `código` viram marcação, o resto é texto', () => {
    expect(inlineParts('a **b** c `d` <img src=x> [e](f)')).toEqual([
      { kind: 'text', text: 'a ' },
      { kind: 'bold', text: 'b' },
      { kind: 'text', text: ' c ' },
      { kind: 'code', text: 'd' },
      { kind: 'text', text: ' <img src=x> [e](f)' },
    ])
    expect(inlineParts('**sem fechar')).toEqual([{ kind: 'text', text: '**sem fechar' }])
  })

  test('NOVI-02 data no formato brasileiro', () => {
    expect(formatDate('2026-11-16')).toBe('16/11/2026')
  })
})

describe('changelog: versões', () => {
  test('NOVI-09 comparação numérica (1.10.0 > 1.9.0)', () => {
    expect(compareVersions('1.10.0', '1.9.0')).toBeGreaterThan(0)
    expect(compareVersions('1.2.0', '1.2.0')).toBe(0)
    expect(compareVersions('1.2.0', '2.0.0')).toBeLessThan(0)
    expect(compareVersions('1.2', '1.2.0')).toBe(0)
  })

  test('NOVI-08 sem versão vista não há novidade', () => {
    expect(hasNews('1.2.0', undefined)).toBe(false)
  })

  test('NOVI-09 há novidade só quando a versão instalada é maior que a vista', () => {
    expect(hasNews('1.2.0', '1.1.0')).toBe(true)
    expect(hasNews('1.2.0', '1.2.0')).toBe(false)
    expect(hasNews('1.2.0', '1.3.0')).toBe(false) // downgrade: nada novo
  })
})

describe('changelog: CHANGELOG.md do repositório', () => {
  test('NOVI-16 tem entrada para a versão do package.json', () => {
    const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }
    const entries = parseChangelog(readFileSync('CHANGELOG.md', 'utf8'))
    expect(entries.map((e) => e.version)).toContain(version)
    expect(entries[0]!.version).toBe(version) // a mais nova é a versão atual
    for (const e of entries) expect(e.items.length).toBeGreaterThan(0)
  })
})
