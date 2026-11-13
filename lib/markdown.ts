import type { Annotation } from './types'
import { CATEGORY_ICON } from './viewport'
import { compactCss } from './css-filter'
import { shotName } from './export-names'
import { OUTER_HTML_LIMIT } from './outer-html'
import { pad } from './format'

export interface MarkdownMeta {
  origin: string
  generatedAt: Date
}

function formatDateTime(d: Date): string {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function longestRun(text: string, ch: string): number {
  let max = 0
  let cur = 0
  for (const c of text) {
    cur = c === ch ? cur + 1 : 0
    max = Math.max(max, cur)
  }
  return max
}

/** Bloco cercado com cerca maior que qualquer sequência de crases do conteúdo. */
export function fenced(content: string, lang: string): string {
  const fence = '`'.repeat(Math.max(3, longestRun(content, '`') + 1))
  return `${fence}${lang}\n${content}\n${fence}`
}

export function inlineCode(text: string): string {
  const ticks = '`'.repeat(longestRun(text, '`') + 1)
  const pad = text.startsWith('`') || text.endsWith('`') ? ' ' : ''
  return `${ticks}${pad}${text}${pad}${ticks}`
}

function componentLines(a: Annotation): string[] {
  if (!a.component) return []
  const c = a.component
  const fw = c.framework === 'react' ? 'React' : 'Vue'
  const chain = [c.name, ...c.chain].map(inlineCode).join(' ← ')
  const lines = [`- **Componente:** ${chain} (${fw})`]
  if (c.file) lines.push(`- **Arquivo:** ${inlineCode(c.line ? `${c.file}:${c.line}` : c.file)}`)
  return lines
}

function printLine(a: Annotation): string {
  if (!a.shot) return '- **Print:** indisponível'
  return `- **Print:** ![#${a.number}](${shotName(a.number)})${a.shotPartial ? ' (print parcial)' : ''}`
}

function section(a: Annotation): string {
  const v = a.viewport
  const css = compactCss(a.css).map(([p, val]) => `${p}: ${val};`).join('\n')
  const htmlTitle = a.outerHtmlTruncated
    ? `**HTML** (truncado em ${OUTER_HTML_LIMIT.toLocaleString('pt-BR')} caracteres):`
    : '**HTML:**'
  return [
    `## #${a.number} · ${CATEGORY_ICON[v.category]} ${v.category} · ${v.width}px (${inlineCode(v.breakpoint)}) · ${inlineCode(a.path)}`,
    '',
    ...componentLines(a),
    `- **Seletor:** ${inlineCode(a.selector)}`,
    `- **Viewport:** ${v.width}×${v.height} · DPR ${v.dpr} · ${v.orientation}`,
    printLine(a),
    '',
    '**Nota:**',
    '',
    fenced(a.note, 'text'),
    '',
    '**CSS relevante:**',
    '',
    fenced(css, 'css'),
    '',
    htmlTitle,
    '',
    fenced(a.outerHtml, 'html'),
    '',
    '---',
  ].join('\n')
}

/** feedback.md completo do export .zip (EXPO-02). */
export function renderMarkdown(annotations: readonly Annotation[], meta: MarkdownMeta): string {
  const header = [
    `# Feedback PxA — ${meta.origin}`,
    '',
    `- **Gerado em:** ${formatDateTime(meta.generatedAt)}`,
    `- **Anotações:** ${annotations.length}`,
    '- **Para o Claude Code:** cada seção abaixo é um ajuste visual. Use o componente/arquivo e o seletor para localizar o código, a tela (categoria + largura) para saber em qual breakpoint corrigir e o print para conferir. Resolva todos.',
    '',
    '---',
    '',
    '',
  ].join('\n')
  return header + annotations.map(section).join('\n\n') + '\n'
}

/**
 * Versão compacta do "Copiar markdown" (EXPO-03): 2 linhas por anotação, só o que localiza o
 * problema (nota, tela, rota, componente/arquivo e seletor). CSS, HTML e prints ficam no .zip.
 */
export function renderCompactMarkdown(annotations: readonly Annotation[], meta: Pick<MarkdownMeta, 'origin'>): string {
  const n = annotations.length
  const lines = [`# PxA · ${meta.origin} · ${n} ${n === 1 ? 'ajuste visual' : 'ajustes visuais'}`, '']
  for (const a of annotations) {
    const v = a.viewport
    const where = [`${CATEGORY_ICON[v.category]} ${v.width}px ${inlineCode(v.breakpoint)}`, inlineCode(a.path)]
    if (a.component) {
      const file = a.component.file ? ` ${inlineCode(a.component.line ? `${a.component.file}:${a.component.line}` : a.component.file)}` : ''
      where.push(`${inlineCode(a.component.name)}${file}`)
    }
    where.push(inlineCode(a.selector))
    lines.push(`- **#${a.number}** ${a.note.split('\n').join('\n  ')}`, `  ${where.join(' · ')}`)
  }
  return lines.join('\n') + '\n'
}
