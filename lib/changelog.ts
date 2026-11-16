/** Uma versão do `CHANGELOG.md`: `## 1.2.0 — 2026-11-16` seguido de itens `- texto`. */
export interface ChangelogEntry {
  version: string
  /** `AAAA-MM-DD`, como está no arquivo. */
  date: string
  items: string[]
}

type InlinePart = { kind: 'text' | 'bold' | 'code'; text: string }

const HEADING = /^##\s+(\d+(?:\.\d+)*)\s+[—–-]\s+(\d{4}-\d{2}-\d{2})\s*$/
const ITEM = /^-\s+(.+?)\s*$/
const INLINE = /\*\*(.+?)\*\*|`([^`]+)`/g

/** `1.10.0` > `1.9.0`; partes que faltam valem 0 (`1.2` = `1.2.0`). */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d) return d
  }
  return 0
}

/**
 * Formato restrito, sem lib de Markdown (NOVI-15): só títulos de versão e itens `- `.
 * Qualquer outra linha é ignorada; item fora de uma versão também. Mais nova primeiro.
 */
export function parseChangelog(md: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = []
  let current: ChangelogEntry | null = null
  for (const line of md.split(/\r?\n/)) {
    const heading = HEADING.exec(line)
    if (heading) {
      entries.push((current = { version: heading[1]!, date: heading[2]!, items: [] }))
      continue
    }
    if (line.startsWith('#')) current = null // outro título: os itens abaixo não são de versão
    if (!current) continue
    const item = ITEM.exec(line)
    if (item) current.items.push(item[1]!)
  }
  return entries.sort((x, y) => compareVersions(y.version, x.version))
}

/** NOVI-07: `**negrito**` e `` `código` ``; todo o resto é texto puro (nunca HTML). */
export function inlineParts(text: string): InlinePart[] {
  const parts: InlinePart[] = []
  let last = 0
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) parts.push({ kind: 'text', text: text.slice(last, m.index) })
    parts.push(m[1] !== undefined ? { kind: 'bold', text: m[1] } : { kind: 'code', text: m[2]! })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ kind: 'text', text: text.slice(last) })
  return parts
}

/** `2026-11-16` → `16/11/2026`. */
export const formatDate = (iso: string) => iso.split('-').reverse().join('/')

/** NOVI-08/09: sem versão vista (instalação nova) não há novidade; só versão maior conta. */
export const hasNews = (current: string, lastSeen: string | undefined) => lastSeen !== undefined && compareVersions(current, lastSeen) > 0
