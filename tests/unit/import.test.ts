import { describe, expect, test } from 'vitest'
import { strToU8, zipSync, type Zippable } from 'fflate'
import { readImportZip, IMPORT_LIMITS } from '@/lib/import'
import { buildManifest } from '@/lib/manifest'
import { annotation } from './fixtures/annotations'

const meta = { origin: 'https://staging.app.com', exportedAt: new Date('2026-11-14T15:00:00Z') }
const png = (n: number) => new Uint8Array([137, 80, 78, 71, n])
const blobBytes = async (b: Blob | null | undefined) => (b ? Array.from(new Uint8Array(await b.arrayBuffer())) : null)
const zip = (files: Zippable) => zipSync(files)

describe('import', () => {
  test('IMPO-02 zip sem pxa.json é recusado explicando que só exports novos importam', () => {
    const r = readImportZip(zip({ 'feedback.md': strToU8('# antigo'), 'shots/01.png': png(1) }))
    expect(r).toEqual({ ok: false, error: 'Este .zip não tem pxa.json. Só exports feitos a partir desta versão do PxA podem ser importados.' })
  })

  test('IMPO-02 arquivo que não é zip', () => {
    expect(readImportZip(strToU8('isto não é um zip'))).toEqual({ ok: false, error: 'Não consegui ler este .zip.' })
  })

  test('IMPO-02 manifesto inválido passa a mensagem adiante', () => {
    const r = readImportZip(zip({ 'pxa.json': strToU8('{"schemaVersion": 7}') }))
    expect(r).toEqual({ ok: false, error: 'pxa.json com versão 7 desconhecida.' })
  })

  test('IMPO-03 anotações, prints e Desenho vêm do zip', async () => {
    const drawing = { strokes: [{ tool: 'cross' as const, color: '#3fd0e0', points: [[0, 0], [8, 8]] as Array<[number, number]> }], block: 2, composite: new Blob() }
    const manifest = buildManifest([annotation(1), annotation(2, { shot: null }), annotation(3, { drawing })], meta)
    const r = readImportZip(zip({
      'pxa.json': strToU8(JSON.stringify(manifest)),
      'feedback.md': strToU8('# x'),
      'shots/01.png': png(1),
      'shots/03.png': png(33),
      'shots/03-original.png': png(3),
    }))
    if (!r.ok) throw new Error(r.error)
    expect(r.origin).toBe('https://staging.app.com')
    expect(r.annotations.map((a) => [a.id, a.number])).toEqual([['id-1', 1], ['id-2', 2], ['id-3', 3]])
    expect(await blobBytes(r.annotations[0]!.shot)).toEqual(Array.from(png(1)))
    expect(r.annotations[0]!.shot!.type).toBe('image/png')
    expect(r.annotations[1]!.shot).toBeNull()
    expect(await blobBytes(r.annotations[2]!.shot)).toEqual(Array.from(png(3)))
    expect(await blobBytes(r.annotations[2]!.drawing!.composite)).toEqual(Array.from(png(33)))
    expect(r.annotations[2]!.drawing!.strokes).toEqual(drawing.strokes)
  })

  test('IMPO-03 print referenciado mas ausente vira null; Desenho sem composto é descartado', () => {
    const drawing = { strokes: [], block: 2, composite: new Blob() }
    const manifest = buildManifest([annotation(1), annotation(2, { drawing })], meta)
    const r = readImportZip(zip({ 'pxa.json': strToU8(JSON.stringify(manifest)) }))
    if (!r.ok) throw new Error(r.error)
    expect(r.annotations[0]!.shot).toBeNull()
    expect(r.annotations[1]!.drawing).toBeUndefined()
  })

  test('caso limite: arquivo maior que o limite não é nem aberto', () => {
    const big = new Uint8Array(IMPORT_LIMITS.maxInputBytes + 1)
    expect(readImportZip(big)).toEqual({ ok: false, error: '.zip grande demais para importar.' })
  })

  test('caso limite (zip bomb): soma descompactada acima do limite é recusada', () => {
    const r = readImportZip(zip({ 'pxa.json': strToU8('{}'), 'shots/01.png': new Uint8Array(2048) }), { ...IMPORT_LIMITS, maxTotalBytes: 1024 })
    expect(r).toEqual({ ok: false, error: '.zip grande demais para importar.' })
  })

  test('caso limite: muitos arquivos é recusado', () => {
    const files: Zippable = { 'pxa.json': strToU8('{}') }
    for (let i = 1; i <= 5; i++) files[`shots/0${i}.png`] = png(i)
    expect(readImportZip(zip(files), { ...IMPORT_LIMITS, maxFiles: 3 })).toEqual({ ok: false, error: '.zip grande demais para importar.' })
  })

  test('arquivos fora de pxa.json e shots/*.png são ignorados (nem descompactados)', () => {
    const manifest = buildManifest([], meta)
    const r = readImportZip(zip({ 'pxa.json': strToU8(JSON.stringify(manifest)), 'lixo.bin': new Uint8Array(5000) }), { ...IMPORT_LIMITS, maxTotalBytes: 1000 })
    expect(r).toMatchObject({ ok: true, annotations: [] })
  })
})
