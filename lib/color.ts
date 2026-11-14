/** Canal 0–255 → 2 dígitos hex (arredonda e limita). */
export const hex2 = (n: number): string => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0')

/** RGB → `#rrggbb`. Usado pelo Detector e pela Lupa, para os dois mostrarem o mesmo hex. */
export const toHex = (r: number, g: number, b: number): string => `#${hex2(r)}${hex2(g)}${hex2(b)}`
