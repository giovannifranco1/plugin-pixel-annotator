import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { ScanResult } from '@/entrypoints/annotator.content/audit-scan'
import { createAuditReport } from '@/entrypoints/annotator.content/ui/audit-report'
import { createHost, type UiHost } from '@/entrypoints/annotator.content/ui/host'
import type { AuditSample } from '@/lib/design-audit'

let ui: UiHost
let elements: Element[]
const annotate = vi.fn()
const onClose = vi.fn()

const sample = (s: Partial<AuditSample>): AuditSample => ({ colors: [], fontSize: '', fontFamily: '', fontWeight: '', spacings: [], ...s })
function fakeScan(truncated = false) {
  return vi.fn(async (): Promise<ScanResult> => ({
    elements,
    truncated,
    ms: 12,
    samples: [
      sample({ colors: ['rgb(119, 119, 119)'], spacings: ['13px'], fontSize: '16px', fontFamily: 'Arial', fontWeight: '400' }),
      sample({ colors: ['rgb(119, 119, 119)'], spacings: ['13px', '12px'] }),
      sample({ colors: ['rgb(119, 119, 119)', 'rgb(122, 122, 122)'], spacings: ['12px'] }),
    ],
  }))
}

beforeEach(() => {
  history.replaceState(null, '', '/')
  document.body.innerHTML = '<i id="a">a</i><i id="b">b</i><i id="c">c</i>'
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
const row = (value: string) => $$('.pxa-audit-row').find((r) => r.dataset.value === value)!
const button = (label: string, root: ParentNode = ui.root) =>
  Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.includes(label) || b.getAttribute('aria-label')?.includes(label))!
const highlighted = () => $$('.pxa-audit-hl .pxa-box').filter((b) => b.style.display !== 'none')

describe('audit-report', () => {
  test('DETE-02 mostra cabeçalho com contagens e as seções Cores, Fontes e Espaçamentos', async () => {
    const report = createAuditReport(ui, { annotate, onClose }, { scan: fakeScan() })
    await report.open()
    expect($('.pxa-audit-head')!.textContent).toContain('2 cores · 1 tamanho de fonte · 1 espaçamento fora da escala de 4px')
    expect($$('.pxa-audit h3').map((h) => h.textContent)).toEqual(['Cores', 'Fontes', 'Espaçamentos'])
    expect(row('13px').textContent).toContain('2×')
    expect(row('13px').textContent).toContain('fora da escala')
    expect(row('#7a7a7a').textContent).toContain('parecida com #777777')
    expect(row('#777777').querySelector('.pxa-swatch')).not.toBeNull()
    expect($('.pxa-audit-foot')!.textContent).toContain('3 elementos')
  })

  test('DETE-04 hover num valor destaca os elementos que o usam; sair limpa', async () => {
    const report = createAuditReport(ui, { annotate, onClose }, { scan: fakeScan() })
    await report.open()
    row('12px').dispatchEvent(new MouseEvent('mouseenter'))
    report.measure()()
    expect(highlighted()).toHaveLength(2)
    row('12px').dispatchEvent(new MouseEvent('mouseleave'))
    report.measure()()
    expect(highlighted()).toHaveLength(0)
  })

  test('DETE-05 "Anotar" num Achado envia os elementos e a nota pré-preenchida', async () => {
    const report = createAuditReport(ui, { annotate, onClose }, { scan: fakeScan() })
    await report.open()
    expect(row('#777777').querySelector('button')).toBeNull() // sem marca: não é Achado
    button('Anotar', row('13px')).click()
    expect(annotate).toHaveBeenCalledWith([elements[0], elements[1]], '[Raio-X] espaçamento 13px fora da escala de 4px; usado só 2× (2 elementos)')
  })

  test('DETE-03 alternar a escala recalcula sem varrer de novo', async () => {
    const scan = fakeScan()
    const report = createAuditReport(ui, { annotate, onClose }, { scan })
    await report.open()
    button('Escala: 4px').click()
    expect($('.pxa-audit-head')!.textContent).toContain('2 espaçamentos fora da escala de 8px')
    expect(scan).toHaveBeenCalledTimes(1)
    button('Varrer de novo').click()
    await vi.waitFor(() => expect(scan).toHaveBeenCalledTimes(2))
  })

  test('DETE-06 avisa quando a varredura foi cortada', async () => {
    const report = createAuditReport(ui, { annotate, onClose }, { scan: fakeScan(true) })
    await report.open()
    expect($('.pxa-audit')!.textContent).toContain('Cortado em 10.000 elementos')
  })

  test('SPA: rota mudou com o relatório aberto → aviso para varrer de novo', async () => {
    const report = createAuditReport(ui, { annotate, onClose }, { scan: fakeScan() })
    await report.open()
    report.measure()()
    expect($('.pxa-audit')!.textContent).not.toContain('A página mudou')
    history.pushState(null, '', '/outra')
    report.measure()()
    expect($('.pxa-audit')!.textContent).toContain('A página mudou. Varra de novo.')
  })

  test('fechar esconde a janela, limpa o destaque e avisa', async () => {
    const report = createAuditReport(ui, { annotate, onClose }, { scan: fakeScan() })
    await report.open()
    row('12px').dispatchEvent(new MouseEvent('mouseenter'))
    button('Fechar relatório').click()
    report.measure()()
    expect($('.pxa-audit')!.style.display).toBe('none')
    expect(highlighted()).toHaveLength(0)
    expect(onClose).toHaveBeenCalled()
    expect(report.isOpen()).toBe(false)
  })
})
