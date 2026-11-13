import { beforeEach, expect, test } from 'vitest'
import { resolveElement } from '@/lib/resolve'

beforeEach(() => { document.body.innerHTML = '' })

test('ANOT-08 usa o nó original conectado', () => {
  document.body.innerHTML = '<p class="a">x</p>'
  const el = document.querySelector('p')!
  expect(resolveElement({ selector: '.nada', pathname: '/x' }, new WeakRef(el), '/y', document)).toBe(el)
})

test('PAIN-02 nó removido + mesma rota + 1 correspondência → elemento novo', () => {
  document.body.innerHTML = '<p class="a">x</p>'
  const old = document.querySelector('p')!
  old.remove()
  document.body.innerHTML = '<p class="a">novo</p>'
  expect(resolveElement({ selector: 'p.a', pathname: '/' }, new WeakRef(old), '/', document)).toBe(document.querySelector('p'))
})

test('PAIN-02 nó removido + mesma rota + 2 correspondências → null', () => {
  document.body.innerHTML = '<p class="a">1</p><p class="a">2</p>'
  expect(resolveElement({ selector: 'p.a', pathname: '/' }, undefined, '/', document)).toBeNull()
})

test('PAIN-06 nó removido + rota diferente → null', () => {
  document.body.innerHTML = '<p class="a">x</p>'
  expect(resolveElement({ selector: 'p.a', pathname: '/a' }, undefined, '/b', document)).toBeNull()
})

test('PAIN-02 seletor inválido → null', () => {
  expect(resolveElement({ selector: '[[[', pathname: '/' }, undefined, '/', document)).toBeNull()
})
