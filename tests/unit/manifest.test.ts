import { describe, expect, test } from 'vitest'
import { buildManifest, parseManifest, SCHEMA_VERSION } from '@/lib/manifest'
import { originalShotName } from '@/lib/export-names'
import { annotation } from './fixtures/annotations'

const meta = { origin: 'http://localhost:3000', exportedAt: new Date('2026-11-14T15:00:00Z') }
const drawing = { strokes: [{ tool: 'arrow' as const, color: '#ff3e7f', points: [[0, 0], [10, 10]] as Array<[number, number]> }], block: 4, composite: new Blob(['x']) }

describe('manifest', () => {
  test('IMPO-01 manifesto com versão, origem, data e anotações sem Blob (print por nome em shots/)', () => {
    const m = buildManifest([annotation(1), annotation(2, { shot: null })], meta)
    expect(m).toMatchObject({ schemaVersion: SCHEMA_VERSION, generator: 'PixelAnnotator', origin: 'http://localhost:3000', exportedAt: '2026-11-14T15:00:00.000Z' })
    expect(m.annotations[0]!.shot).toBe('shots/01.png')
    expect(m.annotations[1]!.shot).toBeNull()
    expect(JSON.stringify(m)).not.toContain('{}') // nenhum Blob virou objeto vazio
    expect(m.annotations[0]).toMatchObject({ id: 'id-1', number: 1, note: 'botões saindo pra fora do card', selector: '[data-testid="cliente-card"] > div.card-footer' })
  })

  test('IMPO-01 com Desenho: shot aponta o original e drawing aponta o composto', () => {
    const [a] = buildManifest([annotation(4, { drawing })], meta).annotations
    expect(a!.shot).toBe(originalShotName(4))
    expect(a!.shot).toBe('shots/04-original.png')
    expect(a!.drawing).toEqual({ strokes: drawing.strokes, block: 4, file: 'shots/04.png' })
  })

  test('IMPO-01 ida e volta pelo JSON preserva os campos', () => {
    const errors = [{ kind: 'network' as const, message: 'GET http://x/a → 404', at: '2026-11-14T15:00:00.000Z', count: 1, method: 'GET', url: 'http://x/a', status: 404 }]
    const m = buildManifest([annotation(1, { errors, importedFrom: { origin: 'https://a.com', number: 5 } })], meta)
    const parsed = parseManifest(JSON.stringify(m))
    expect(parsed).toEqual({ ok: true, manifest: m })
  })

  test('IMPO-02 JSON inválido', () => {
    expect(parseManifest('{nada')).toEqual({ ok: false, error: 'pxa.json inválido.' })
  })

  test('IMPO-02 schemaVersion desconhecida', () => {
    const m = { ...buildManifest([], meta), schemaVersion: 99 }
    expect(parseManifest(JSON.stringify(m))).toEqual({ ok: false, error: 'pxa.json com versão 99 desconhecida.' })
  })

  test('IMPO-02 forma inválida (anotação sem seletor, lista ausente)', () => {
    const m = buildManifest([annotation(1)], meta)
    const broken = { ...m, annotations: [{ ...m.annotations[0], selector: 3 }] }
    expect(parseManifest(JSON.stringify(broken))).toEqual({ ok: false, error: 'pxa.json inválido.' })
    expect(parseManifest(JSON.stringify({ schemaVersion: 1 }))).toEqual({ ok: false, error: 'pxa.json inválido.' })
    expect(parseManifest('null')).toEqual({ ok: false, error: 'pxa.json inválido.' })
  })
})
