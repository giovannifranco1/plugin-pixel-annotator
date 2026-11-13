/** Zero à esquerda para datas e números de print. */
export const pad = (n: number, width = 2): string => String(n).padStart(width, '0')
