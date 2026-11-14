import { describe, expect, test } from 'vitest'
import { clips, contentOverflow, leakNote, overflowOutside, shortSelector } from '@/lib/leak'

const box = (left: number, top: number, right: number, bottom: number) => ({ left, top, right, bottom })

describe('leak', () => {
  test('XRAY-02 overflowOutside: dentro ou com até 1px de folga não vaza', () => {
    const parent = box(0, 0, 100, 100)
    expect(overflowOutside(box(10, 10, 90, 90), parent, false, false)).toBe(0)
    expect(overflowOutside(box(-1, 0, 101, 100), parent, false, false)).toBe(0)
  })

  test('XRAY-02 overflowOutside: devolve o maior excesso em px nos eixos que o pai não corta', () => {
    const parent = box(0, 0, 100, 100)
    expect(overflowOutside(box(0, 0, 112, 50), parent, false, false)).toBe(12)
    expect(overflowOutside(box(-20, 0, 50, 105), parent, false, false)).toBe(20)
    expect(overflowOutside(box(0, 0, 112, 50), parent, true, false)).toBe(0)
    expect(overflowOutside(box(0, 0, 50, 130), parent, false, true)).toBe(0)
    expect(overflowOutside(box(0, 0, 50, 130), parent, true, false)).toBe(30)
  })

  test('XRAY-02 contentOverflow: conteúdo maior que a caixa com overflow visível', () => {
    expect(contentOverflow(240, 200, 100, 100, true, true)).toBe(40)
    expect(contentOverflow(200, 200, 130, 100, true, true)).toBe(30)
    expect(contentOverflow(240, 200, 100, 100, false, true)).toBe(0)
    expect(contentOverflow(201, 200, 100, 100, true, true)).toBe(0)
  })

  test('XRAY-02 clips: hidden/clip/auto/scroll cortam, visible não', () => {
    expect(clips('visible')).toBe(false)
    expect(clips('')).toBe(false)
    for (const v of ['hidden', 'clip', 'auto', 'scroll']) expect(clips(v)).toBe(true)
  })

  test('XRAY-04 shortSelector: id, tag + classe estável, ou só a tag', () => {
    document.body.innerHTML = '<div id="main"></div><div class="css-1a2b3c card destaque"></div><span></span>'
    const [byId, card, span] = Array.from(document.body.children)
    expect(shortSelector(byId!)).toBe('#main')
    expect(shortSelector(card!)).toBe('div.card')
    expect(shortSelector(span!)).toBe('span')
  })

  test('XRAY-04 leakNote: texto pré-preenchido da nota', () => {
    expect(leakNote('parent', 'div.card', 12.4)).toBe('[Raio-X] vaza do pai div.card em 12px')
    expect(leakNote('content', 'ul.menu', 30)).toBe('[Raio-X] conteúdo vaza de ul.menu em 30px')
  })
})
