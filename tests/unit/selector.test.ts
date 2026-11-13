import { beforeEach, describe, expect, test } from 'vitest'
import { buildSelector, isGeneratedToken } from '@/lib/selector'

function expectUnique(el: Element) {
  const sel = buildSelector(el)
  const found = document.querySelectorAll(sel)
  expect(found.length, sel).toBe(1)
  expect(found[0]).toBe(el)
  return sel
}

describe('selector', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  test('CAPT-02 usa #id quando único e estável', () => {
    document.body.innerHTML = '<main><button id="save">Salvar</button></main>'
    expect(expectUnique(document.getElementById('save')!)).toBe('#save')
  })

  test('CAPT-02 ignora id duplicado', () => {
    document.body.innerHTML = '<div id="x">a</div><section><div id="x">b</div></section>'
    const target = document.querySelectorAll('[id="x"]')[1]!
    const sel = expectUnique(target)
    expect(sel).not.toBe('#x')
  })

  test('CAPT-02 ignora classes geradas', () => {
    document.body.innerHTML = '<div><div class="css-1a2b3c card">a</div></div><p class="card-x">b</p>'
    const sel = expectUnique(document.querySelector('.card')!)
    expect(sel).toContain('.card')
    expect(sel).not.toContain('css-1a2b3c')
  })

  test('CAPT-02 prefere data-testid', () => {
    document.body.innerHTML = '<ul><li data-testid="row-1">a</li><li data-testid="row-2">b</li><li data-testid="row-3">c</li></ul>'
    const sel = expectUnique(document.querySelector('[data-testid="row-3"]')!)
    expect(sel).toContain('[data-testid="row-3"]')
  })

  test('CAPT-02 desempata com nth-of-type', () => {
    document.body.innerHTML = '<ul><li class="item">a</li><li class="item">b</li><li class="item">c</li></ul>'
    const sel = expectUnique(document.querySelectorAll('li.item')[1]!)
    expect(sel).toContain(':nth-of-type(2)')
  })

  test('CAPT-02 isGeneratedToken', () => {
    for (const t of ['css-1a2b3c', 'sc-AxjAm', 'jsx-123', 'Button_root__x7Yz2']) expect(isGeneratedToken(t), t).toBe(true)
    for (const t of ['card', 'btn-primary', 'card-footer', 'nav-links', 'img-fluid']) expect(isGeneratedToken(t), t).toBe(false)
  })

  test('CAPT-02 escapa caracteres especiais', () => {
    document.body.innerHTML = '<div class="md:flex w-1/2">a</div><div class="md:flex">b</div>'
    expectUnique(document.querySelector('div')!)
  })
})
