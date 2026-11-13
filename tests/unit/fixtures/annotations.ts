import type { Annotation } from '@/lib/types'
import type { AnnotationDraft } from '@/lib/store'

export function draft(over: Partial<AnnotationDraft> = {}): AnnotationDraft {
  return {
    note: 'botões saindo pra fora do card',
    url: 'http://localhost:3000/dashboard?tab=2',
    path: '/dashboard?tab=2',
    pathname: '/dashboard',
    selector: '[data-testid="cliente-card"] > div.card-footer',
    viewport: { width: 390, height: 844, breakpoint: 'base', category: 'mobile', dpr: 3, orientation: 'retrato' },
    rect: { x: 10, y: 20, width: 420, height: 48 },
    scroll: { x: 0, y: 120 },
    outerHtml: '<div class="card-footer">…</div>',
    outerHtmlTruncated: false,
    css: [['display', 'flex'], ['width', '420px'], ['height', '48px'], ['gap', '16px'],
      ['padding-top', '8px'], ['padding-right', '8px'], ['padding-bottom', '8px'], ['padding-left', '8px']],
    component: { framework: 'react', name: 'ClienteCard', chain: ['ClientesList', 'DashboardPage'], file: 'src/components/ClienteCard.tsx', line: 42 },
    shot: new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' }),
    shotPartial: false,
    ...over,
  }
}

export function annotation(n: number, over: Partial<Annotation> = {}): Annotation {
  return { ...draft(), id: `id-${n}`, number: n, createdAt: '2026-11-13T17:00:00.000Z', updatedAt: '2026-11-13T17:00:00.000Z', ...over }
}

export const TWO: Annotation[] = [
  annotation(1, { shotPartial: true }),
  annotation(2, {
    note: 'padding maior em cima',
    path: '/dashboard', pathname: '/dashboard', selector: 'h1.page-title',
    viewport: { width: 1440, height: 900, breakpoint: 'xl', category: 'desktop', dpr: 2, orientation: 'paisagem' },
    css: [['display', 'block'], ['width', '1200px'], ['height', '40px'], ['padding-top', '4px']],
    outerHtml: 'x'.repeat(2000), outerHtmlTruncated: true,
    component: null, shot: null,
  }),
]
