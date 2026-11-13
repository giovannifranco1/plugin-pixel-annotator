export const OUTER_HTML_LIMIT = 2000

export function truncateHtml(html: string, max = OUTER_HTML_LIMIT): { html: string; truncated: boolean } {
  if (html.length <= max) return { html, truncated: false }
  return { html: html.slice(0, max), truncated: true }
}
