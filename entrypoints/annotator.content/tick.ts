/** Laço por frame enquanto o modo está ativo: reposiciona overlay e marcadores e percebe troca de rota. */
export function startTick(fn: () => void, raf = requestAnimationFrame, caf = cancelAnimationFrame): () => void {
  let id = 0
  const loop = () => {
    fn()
    id = raf(loop)
  }
  id = raf(loop)
  return () => caf(id)
}
