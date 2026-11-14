import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createController as create, type ControllerDeps } from '@/entrypoints/annotator.content/controller'
import { createHost, type UiHost } from '@/entrypoints/annotator.content/ui/host'
import type { AuditSample } from '@/lib/design-audit'
import { draft } from './fixtures/annotations'

let ui: UiHost
const created: Array<ReturnType<typeof create>> = []
const createController = (deps: ControllerDeps) => { const c = create(deps); created.push(c); return c }
const capture = vi.fn(async (_el: Element, note: string) => draft({ note, selector: '#x', pathname: location.pathname }))
const writeText = vi.fn(async (_: string) => {})
const sample = (value: string): AuditSample => ({ background: '', colors: [], fontSize: '', fontFamily: '', area: 100, spacings: [{ prop: 'padding-top', value }] })

/** Varredura falsa: todos os <i> da página com espaçamento 13px (fora da escala). */
const scan = vi.fn(async () => {
  const elements = Array.from(document.querySelectorAll('i'))
  return { elements, samples: elements.map(() => sample('13px')), truncated: false, ms: 1 }
})
const raioX = { scan, capture: async () => 'data:', decode: async () => ({ width: 1, height: 1, data: new Uint8ClampedArray([0, 0, 255, 255]) }) }

beforeEach(() => {
  history.replaceState(null, '', '/')
  ui = createHost()
  capture.mockClear()
  scan.mockClear()
  writeText.mockClear()
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
})
afterEach(() => {
  for (const c of created.splice(0)) if (c.isActive()) c.toggle()
  vi.restoreAllMocks()
  ui.host.remove()
})

const $ = (sel: string) => ui.root.querySelector<HTMLElement>(sel)
const findButton = (label: string) => Array.from(ui.root.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent!.startsWith(label))
/** Botão pelo texto; itens do menu de ações (Detector, Lupa…) abrem o menu antes. */
const button = (label: string) => {
  const found = findButton(label)
  if (found) return found
  $('header button[aria-label="Ações"]')!.click()
  return findButton(label)!
}
const click = (el: Element) => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }))
const textarea = () => ui.root.querySelector('textarea')
const pressEnter = () => textarea()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))

async function annotateFinding(count: number) {
  document.body.innerHTML = Array.from({ length: count }, (_, i) => `<i id="i${i}">${i}</i>`).join('')
  const c = createController({ ui, capture, raioX })
  c.toggle()
  button('Detector').click()
  await vi.waitFor(() => expect($('.pxa-audit-annotate')).not.toBeNull())
  return c
}

describe('controller + Raio-X', () => {
  test('Detector e Lupa ficam no topo do menu de ações, sem título de grupo', () => {
    const c = createController({ ui, capture, raioX })
    c.toggle()
    $('header button[aria-label="Ações"]')!.click()
    const items = Array.from(ui.root.querySelectorAll('.pxa-menu .pxa-menu-item')).map((b) => b.textContent)
    expect(items).toEqual(['Detector', 'Lupa', 'Apresentar', 'Importar .zip', 'Exportar .zip'])
    expect($('.pxa-menu-label')).toBeNull()
  })

  test('com o menu aberto, clicar na página só fecha o menu (não abre o editor)', () => {
    document.body.innerHTML = '<p id="alvo">x</p>'
    const c = createController({ ui, capture, raioX })
    c.toggle()
    $('header button[aria-label="Ações"]')!.click()
    click(document.getElementById('alvo')!)
    expect($('.pxa-menu')!.hidden).toBe(true)
    expect(textarea()).toBeNull()
    click(document.getElementById('alvo')!)
    expect(textarea()).not.toBeNull()
  })

  test('Lupa ligada marca o ícone de ações; Esc da Lupa desmarca', () => {
    const c = createController({ ui, capture, raioX })
    c.toggle()
    button('Lupa').click()
    const actionsBtn = $('header button[aria-label="Ações"]')!
    expect(actionsBtn.classList.contains('pxa-tool-on')).toBe(true)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(actionsBtn.classList.contains('pxa-tool-on')).toBe(false)
  })

  test('DETE-05 "Anotar" abre a nota pré-preenchida editável e cria uma anotação por elemento (até 5)', async () => {
    const c = await annotateFinding(2)
    $('.pxa-audit-annotate')!.click()
    expect(textarea()!.value).toBe('[Raio-X] espaçamento 13px (padding-top) fora da escala de 4px: usar 12px ou 14px (2 elementos)')
    textarea()!.value = 'ajustar para 12px'
    pressEnter()
    await vi.waitFor(() => expect(c.store.list()).toHaveLength(2))
    expect(capture.mock.calls.map(([el, note]) => [el.id, note])).toEqual([['i0', 'ajustar para 12px'], ['i1', 'ajustar para 12px']])
    expect(c.state()).toBe('active')
  })

  test('DETE-05 acima de 5 elementos: uma anotação no primeiro, com a contagem na nota', async () => {
    const c = await annotateFinding(6)
    $('.pxa-audit-annotate')!.click()
    expect(textarea()!.value).toContain('(6 elementos)')
    pressEnter()
    await vi.waitFor(() => expect(c.store.list()).toHaveLength(1))
    expect(capture.mock.calls[0]![0].id).toBe('i0')
  })

  test('caso limite: elemento do Achado sumiu antes do clique → pula e avisa', async () => {
    const c = await annotateFinding(3)
    document.getElementById('i1')!.remove()
    $('.pxa-audit-annotate')!.click()
    expect($('.pxa-toast')!.textContent).toBe('1 elemento sumiu da página')
    pressEnter()
    await vi.waitFor(() => expect(c.store.list()).toHaveLength(2))
    expect(capture.mock.calls.map(([el]) => el.id)).toEqual(['i0', 'i2'])
  })

  test('LUPA-02 clique com a Lupa ligada copia o hex e não abre o editor', async () => {
    document.body.innerHTML = '<p id="alvo">x</p>'
    const c = createController({ ui, capture, raioX })
    c.toggle()
    button('Lupa').click()
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 0, clientY: 0 }))
    await vi.waitFor(async () => {
      click(document.getElementById('alvo')!)
      await Promise.resolve()
      expect(writeText).toHaveBeenCalledWith('#0000ff')
    })
    expect(textarea()).toBeNull()
    expect(c.store.list()).toHaveLength(0)
  })

  test('desativar o modo desliga as ferramentas do Raio-X', () => {
    const c = createController({ ui, capture, raioX })
    c.toggle()
    button('Lupa').click()
    c.toggle()
    c.toggle()
    expect(button('Lupa').getAttribute('aria-checked')).toBe('false')
  })
})
