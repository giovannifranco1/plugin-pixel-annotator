// Gera os ícones pixel art (alfinete 16×16) em public/icon/{16,32,48,128}.png sem dependências.
import { crc32, deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const ART = [
  '................',
  '.....######.....',
  '....#PPPPPP#....',
  '...#PPWPPPPP#...',
  '...#PWWPPPPP#...',
  '...#PPPPPPPP#...',
  '...#PPPPPPPP#...',
  '....#PPPPPP#....',
  '.....#PPPP#.....',
  '......####......',
  '.......##.......',
  '.......#G.......',
  '.......#G.......',
  '.......#G.......',
  '........#.......',
  '................',
]
const COLORS = { '#': [26, 18, 38, 255], P: [255, 62, 127, 255], W: [255, 255, 255, 255], G: [140, 140, 160, 255], '.': [0, 0, 0, 0] }

const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

function png(size) {
  const scale = size / 16
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = COLORS[ART[Math.floor(y / scale)][Math.floor(x / scale)]]
      raw.set([r, g, b, a], y * (size * 4 + 1) + 1 + x * 4)
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

mkdirSync('public/icon', { recursive: true })
for (const size of [16, 32, 48, 128]) writeFileSync(`public/icon/${size}.png`, png(size))
console.log('ícones gerados em public/icon/')
