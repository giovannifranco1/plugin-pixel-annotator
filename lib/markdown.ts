import type { Annotation } from './types'
import { CATEGORY_ICON } from './viewport'
import { compactCss } from './css-filter'
import { shotName } from './export-names'
import { OUTER_HTML_LIMIT } from './outer-html'

export interface MarkdownMeta {
  origin: string
  generatedAt: Date
}

const pad2 = (n: number) => String(n).padStart(2, '0')

export function formatDateTime(d: Date): string {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
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

function printLine(a: Annotation, imageLinks: boolean): string {
  if (!a.shot) return '- **Print:** indisponível'
  const suffix = a.shotPartial ? ' (print parcial)' : ''
  if (!imageLinks) return `- **Print:** (print disponível no .zip)${suffix}`
  return `- **Print:** ![#${a.number}](${shotName(a.number)})${suffix}`
}

function section(a: Annotation, imageLinks: boolean): string {
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
    printLine(a, imageLinks),
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

/** feedback.md do export (EXPO-02). `imageLinks: false` é a variante do "Copiar markdown" (EXPO-03). */
export function renderMarkdown(annotations: readonly Annotation[], meta: MarkdownMeta, opts: { imageLinks: boolean }): string {
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
  return header + annotations.map((a) => section(a, opts.imageLinks)).join('\n\n') + '\n'
}
