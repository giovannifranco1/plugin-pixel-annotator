import { expect, test } from 'vitest'
import { shotName, zipName } from '@/lib/export-names'

test('EXPO-01 zipName usa hora local', () => {
  expect(zipName(new Date(2026, 10, 13, 9, 5))).toBe('pxa-feedback-2026-11-13-0905.zip')
})

test('EXPO-01 shotName com 2 dígitos', () => {
  expect(shotName(1)).toBe('shots/01.png')
  expect(shotName(12)).toBe('shots/12.png')
})

test('EXPO-01 shotName com 3 dígitos a partir de 100', () => {
  expect(shotName(100)).toBe('shots/100.png')
})
