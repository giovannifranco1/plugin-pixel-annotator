import type { AchievementId } from '@/lib/achievements'
import { CATEGORY_PIXEL_ICON, DOWNLOAD, PENCIL } from './icons'

// Grades 12×12 na paleta de ui/icons.ts ('.' = transparente).
export const TROPHY = [
  '............',
  '.KKKKKKKKKK.',
  'KYKYYYYYYKYK',
  'KYKYYYYYYKYK',
  '.KKYYYYYYKK.',
  '...KYYYYK...',
  '....KYYK....',
  '.....KK.....',
  '.....KK.....',
  '....KYYK....',
  '...KKKKKK...',
  '............',
]

const BOLT = [
  '......KKKK..',
  '.....KYYK...',
  '....KYYK....',
  '...KYYK.....',
  '..KYYYYYYK..',
  '..KKKKYYK...',
  '.....KYK....',
  '....KYK.....',
  '...KYK......',
  '..KYK.......',
  '..KK........',
  '............',
]

const FLAG = [
  '.KKKKKKKK...',
  '.KMMMMMMMK..',
  '.KMWMMWMMMK.',
  '.KMMMMMMMK..',
  '.KMMWMMWMK..',
  '.KKKKKKKK...',
  '.K..........',
  '.K..........',
  '.K..........',
  '.K..........',
  'KKK.........',
  '............',
]

const GAMEPAD = [
  '............',
  '............',
  '.KKKKKKKKKK.',
  'KLLLLLLLLLLK',
  'KLKLLLLLLPLK',
  'KKKKLLLLPLPK',
  'KLKLLLLLLPLK',
  'KLLLLLLLLLLK',
  '.KKKKKKKKKK.',
  '............',
  '............',
  '............',
]

/** Ícone pixel de cada Conquista (CONQ-04/06). */
export const ACHIEVEMENT_ICON: Record<AchievementId, readonly string[]> = {
  'primeiro-pixel': PENCIL,
  'cacador-mobile': CATEGORY_PIXEL_ICON.mobile,
  'pixel-perfect': CATEGORY_PIXEL_ICON.desktop,
  speedrun: BOLT,
  'quest-completa': DOWNLOAD,
  maratona: FLAG,
  'codigo-secreto': GAMEPAD,
}
