import { beforeEach, describe, expect, test } from 'vitest'
import { detectComponent, detectReact, detectVue2, detectVue3 } from '@/lib/component-detect'

type Rec = Record<string, any>
const fiber = (tag: number, type: unknown, ret: Rec | null = null, extra: Rec = {}): Rec => ({ tag, type, return: ret, ...extra })
const fn = (name: string) => { const f = function () {}; Object.defineProperty(f, 'name', { value: name }); return f }

beforeEach(() => { document.body.innerHTML = '<div id="root"><section><button>ok</button></section></div>' })
const btn = () => document.querySelector('button')!

describe('component-detect', () => {
  test('COMP-01 React: nome do componente mais próximo + cadeia de até 5', () => {
    let f: Rec | null = null
    for (const n of ['App', 'L6', 'L5', 'L4', 'L3', 'List', 'Card'].reverse().reverse()) f = fiber(0, fn(n), f)
    // f agora é Card (mais próximo), com return → List → L3 → ... → App
    const host = fiber(5, 'button', f)
    ;(btn() as Rec)['__reactFiber$abc'] = host
    const r = detectReact(btn())!
    expect(r.framework).toBe('react')
    expect(r.name).toBe('Card')
    expect(r.chain).toEqual(['List', 'L3', 'L4', 'L5', 'L6'])
  })

  test('COMP-01 React: ignora anônimos e resolve forwardRef/memo', () => {
    const row = fiber(14, { type: fn('Row') }, null)
    const anon = fiber(0, fn(''), row)
    const input = fiber(11, { render: fn('Input') }, anon)
    ;(btn() as Rec)['__reactFiber$x'] = fiber(5, 'button', input)
    const r = detectReact(btn())!
    expect(r.name).toBe('Input')
    expect(r.chain).toEqual(['Row'])
  })

  test('COMP-03 React ≤18: arquivo e linha de _debugSource', () => {
    const card = fiber(0, fn('Card'), null, { _debugSource: { fileName: 'src/Card.tsx', lineNumber: 12 } })
    ;(btn() as Rec)['__reactInternalInstance$y'] = fiber(5, 'button', card)
    expect(detectReact(btn())).toEqual({ framework: 'react', name: 'Card', chain: [], file: 'src/Card.tsx', line: 12 })
  })

  test('COMP-03 React 19: sem _debugSource → sem file', () => {
    ;(btn() as Rec)['__reactFiber$z'] = fiber(5, 'button', fiber(0, fn('Card')))
    const r = detectReact(btn())!
    expect(r.file).toBeUndefined()
    expect(r.line).toBeUndefined()
  })

  test('COMP-02 Vue 3: sobe o DOM até __vueParentComponent; nome por name/__name/__file; arquivo de __file', () => {
    const app = { type: { name: 'App' }, parent: null }
    const list = { type: { __name: 'CardList' }, parent: app }
    const card = { type: { __file: '/src/components/ClienteCard.vue' }, parent: list }
    ;(document.querySelector('section') as Rec).__vueParentComponent = card
    expect(detectVue3(btn())).toEqual({ framework: 'vue3', name: 'ClienteCard', chain: ['CardList', 'App'], file: '/src/components/ClienteCard.vue' })
  })

  test('COMP-02 Vue 2: __vue__ + $options.name/_componentTag + $parent', () => {
    const root = { $options: { name: 'Root' }, $parent: null }
    const card = { $options: { _componentTag: 'cliente-card', __file: 'src/ClienteCard.vue' }, $parent: root }
    ;(document.querySelector('section') as Rec).__vue__ = card
    expect(detectVue2(btn())).toEqual({ framework: 'vue2', name: 'cliente-card', chain: ['Root'], file: 'src/ClienteCard.vue' })
  })

  test('COMP-04 sem framework → null', () => {
    expect(detectComponent(btn())).toBeNull()
  })

  test('COMP-04 getter que lança → null, sem exceção', () => {
    Object.defineProperty(btn(), '__reactFiber$boom', { enumerable: true, get() { throw new Error('boom') } })
    expect(() => detectComponent(btn())).not.toThrow()
    expect(detectComponent(btn())).toBeNull()
  })
})
