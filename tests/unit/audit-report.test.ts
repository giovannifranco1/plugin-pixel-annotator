import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { ScanResult } from '@/entrypoints/annotator.content/audit-scan'
import { createAuditReport } from '@/entrypoints/annotator.content/ui/audit-report'
import { createHost, type UiHost } from '@/entrypoints/annotator.content/ui/host'
import type { AuditSample, SpacingProp } from '@/lib/design-audit'

let ui: UiHost
let elements: Element[]
const annotate = vi.fn()
const onClose = vi.fn()

const sample = (s: Partial<Omit<AuditSample, 'spacings'>> & { spacings?: Array<[SpacingProp, string]> }): AuditSample => ({
  background: '', colors: [], fontSize: '', fontFamily: '', area: 100, ...s, spacings: (s.spacings ?? []).map(([prop, value]) => ({ prop, value })),
})

/** 40 elementos: #777777 em todos, #7a7a7a no último; 14px Inter em todos, 13px no 0; padding 13px no 0 e no 1; 12px no 2 e 3. */
function fakeScan(truncated = false) {
  return vi.fn(async (): Promise<ScanResult> => ({
    elements,
    truncated,
    ms: 12,
    samples: elements.map((_, i) => sample({
      colors: i === 39 ? ['rgb(122, 122, 122)'] : ['rgb(119, 119, 119)'],
      fontSize: i === 0 ? '13px' : '14px',
      fontFamily: 'Inter',
      spacings: i < 2 ? [['padding-top', '13px']] : i < 4 ? [['margin-top', '12px']] : [],
    })),
  }))
}

beforeEach(() => {
  history.replaceState(null, '', '/')
  document.body.innerHTML = Array.from({ length: 40 }, (_, i) => `<i id="e${i}">${i}</i>`).join('')
  elements = Array.from(document.querySelectorAll('i'))
  ui = createHost()
  annotate.mockClear()
  onClose.mockClear()
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() => new DOMRect(10, 10, 50, 20))
})
afterEach(() => {
  vi.restoreAllMocks()
  ui.host.remove()
})

const $ = (sel: string) => ui.root.querySelector<HTMLElement>(sel)
const $$ = (sel: string) => Array.from(ui.root.querySelectorAll<HTMLElement>(sel))
const row = (value: string, kind = value.startsWith('#') ? 'color' : 'spacing') =>
  $$('.pxa-audit-row').find((r) => r.dataset.value === value && r.dataset.kind === kind)!
const button = (label: string, root: ParentNode = ui.root) =>
  Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.includes(label) || b.getAttribute('aria-label')?.includes(label))!
const highlighted = () => $$('.pxa-audit-hl .pxa-box').filter((b) => b.style.display !== 'none')

async function openReport(scan = fakeScan()) {
  const report = createAuditReport(ui, { annotate, onClose }, { scan })
  await report.open()
  return report
}

describe('audit-report', () => {
  test('DETE-02 cabeçalho com contagens e quatro seções', async () => {
    await openReport()
    expect($('.pxa-audit-head')!.textContent).toContain('2 cores · 2 tamanhos de fonte · 1 família · 1 espaçamento fora da escala de 4px')
    expect($$('.pxa-audit h3').map((h) => h.textContent)).toEqual(['Cores', 'Tamanhos de fonte', 'Famílias', 'Espaçamentos'])
    expect(row('#7a7a7a').textContent).toContain('parecida com #777777')
    expect(row('13px').textContent).toContain('padding-top')
    expect(row('#777777').querySelector('.pxa-swatch')).not.toBeNull()
    expect($('.pxa-audit-foot')!.textContent).toContain('40 elementos')
  })

  test('DETE-09 Achados à vista; os demais recolhidos em "N valores sem problema"', async () => {
    await openReport()
    expect(row('#7a7a7a').closest('details')).toBeNull()
    expect(row('#777777').closest('details')).not.toBeNull()
    const summaries = $$('.pxa-audit summary').map((s) => s.textContent)
    expect(summaries).toContain('1 valor sem problema') // cores
    expect(row('12px').closest('details')!.open).toBe(false)
  })

  test('DETE-09 seção sem Achado diz "tudo certo"; cabeçalho começa pelos Achados', async () => {
    await openReport()
    const section = (title: string) => $$('.pxa-audit h3').find((h) => h.textContent === title)!
    expect(section('Famílias').nextElementSibling!.textContent).toBe('✓ tudo certo')
    expect(section('Cores').nextElementSibling!.textContent).not.toBe('✓ tudo certo')
    expect($('.pxa-audit-head')!.textContent).toMatch(/^3 achados · /)
  })

  test('DETE-09 cada Achado diz a referência com os usos e o que usar', async () => {
    await openReport()
    expect(row('#7a7a7a').textContent).toContain('parecida com #777777 (39×)')
    expect(row('#7a7a7a').querySelector('.pxa-audit-fix')!.textContent).toBe('→ usar #777777')
    expect(row('13px').querySelector('.pxa-audit-fix')!.textContent).toBe('→ usar 12px ou 14px')
  })

  test('DETE-03 variante imperceptível aparece junto da cor, sem virar Achado', async () => {
    const scan = vi.fn(async (): Promise<ScanResult> => ({
      elements, truncated: false, ms: 1,
      samples: elements.map((_, i) => sample({ colors: [i < 30 ? 'rgb(124, 119, 95)' : 'rgb(124, 119, 96)'] })),
    }))
    await openReport(scan)
    expect($$('.pxa-audit-row[data-kind="color"]')).toHaveLength(1)
    expect(row('#7c775f').textContent).toContain('também #7c7760')
    expect(row('#7c775f').querySelector('.pxa-audit-annotate')).toBeNull()
  })

  test('DETE-04 hover num valor destaca os elementos que o usam; sair limpa', async () => {
    const report = await openReport()
    row('12px').dispatchEvent(new MouseEvent('mouseenter'))
    report.measure()()
    expect(highlighted()).toHaveLength(2)
    row('12px').dispatchEvent(new MouseEvent('mouseleave'))
    report.measure()()
    expect(highlighted()).toHaveLength(0)
  })

  test('DETE-10 clicar no valor rola até o próximo elemento que o usa, em ciclo', async () => {
    await openReport()
    const scrolled: string[] = []
    vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(function (this: Element) { scrolled.push(this.id) })
    const value = row('13px').querySelector<HTMLElement>('.pxa-audit-value')!
    value.click()
    value.click()
    value.click()
    expect(scrolled).toEqual(['e0', 'e1', 'e0'])
  })

  test('DETE-05 "Anotar" num Achado envia os elementos e a nota com o que usar', async () => {
    await openReport()
    expect(row('#777777').querySelector('.pxa-audit-annotate')).toBeNull() // sem marca: não é Achado
    button('Anotar', row('13px')).click()
    expect(annotate).toHaveBeenCalledWith([elements[0], elements[1]], '[Raio-X] espaçamento 13px (padding-top) fora da escala de 4px: usar 12px ou 14px (2 elementos)')
    button('Anotar', row('#7a7a7a')).click()
    expect(annotate).toHaveBeenLastCalledWith([elements[39]], '[Raio-X] cor #7a7a7a parecida com #777777: usar #777777 (1 elemento)')
  })

  test('DETE-03 alternar a escala recalcula sem varrer de novo', async () => {
    const scan = fakeScan()
    await openReport(scan)
    button('Escala: 4px').click()
    expect($('.pxa-audit-head')!.textContent).toContain('2 espaçamentos fora da escala de 8px')
    expect(scan).toHaveBeenCalledTimes(1)
    button('Varrer de novo').click()
    await vi.waitFor(() => expect(scan).toHaveBeenCalledTimes(2))
  })

  test('DETE-06 avisa quando a varredura foi cortada', async () => {
    await openReport(fakeScan(true))
    expect($('.pxa-audit')!.textContent).toContain('Cortado em 10.000 elementos')
  })

  test('DETE-03 avisa quando a página não segue a escala (menos da metade dos espaçamentos na escala)', async () => {
    const offScale = vi.fn(async (): Promise<ScanResult> => ({
      elements, truncated: false, ms: 1, samples: elements.map(() => sample({ spacings: [['margin-top', '4.8px']] })),
    }))
    await openReport(offScale)
    expect(ui.root.querySelector('.pxa-audit-notices')!.textContent).toContain('Só 0% dos espaçamentos seguem a escala de 4px')
    ui.host.remove()
    ui = createHost()
    await openReport()
    expect(ui.root.querySelector('.pxa-audit-notices')!.textContent).not.toContain('seguem a escala')
  })

  test('DETE-11 o cabeçalho arrasta a janela e a posição fica ao fechar e reabrir', async () => {
    const report = await openReport()
    const header = ui.root.querySelector<HTMLElement>('.pxa-audit header')!
    expect(header.tabIndex).toBe(0)
    header.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    const top = $('.pxa-audit')!.style.top
    expect(top).toBe('26px') // 10 do retângulo simulado + 16
    button('Fechar relatório').click()
    await report.open()
    expect($('.pxa-audit')!.style.top).toBe(top)
  })

  test('SPA: rota mudou com o relatório aberto → aviso para varrer de novo', async () => {
    const report = await openReport()
    report.measure()()
    expect($('.pxa-audit')!.textContent).not.toContain('A página mudou')
    history.pushState(null, '', '/outra')
    report.measure()()
    expect($('.pxa-audit')!.textContent).toContain('A página mudou. Varra de novo.')
  })

  test('fechar esconde a janela, limpa o destaque e avisa', async () => {
    const report = await openReport()
    row('12px').dispatchEvent(new MouseEvent('mouseenter'))
    button('Fechar relatório').click()
    report.measure()()
    expect($('.pxa-audit')!.style.display).toBe('none')
    expect(highlighted()).toHaveLength(0)
    expect(onClose).toHaveBeenCalled()
    expect(report.isOpen()).toBe(false)
  })
})
