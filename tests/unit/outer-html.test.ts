import { expect, test } from 'vitest'
import { truncateHtml } from '@/lib/outer-html'

test('CAPT-05 mantém html curto', () => {
  expect(truncateHtml('a'.repeat(1999))).toEqual({ html: 'a'.repeat(1999), truncated: false })
  expect(truncateHtml('a'.repeat(2000)).truncated).toBe(false)
})

test('CAPT-05 corta em 2000 e sinaliza', () => {
  const r = truncateHtml('a'.repeat(2001))
  expect(r.html.length).toBe(2000)
  expect(r.truncated).toBe(true)
})
