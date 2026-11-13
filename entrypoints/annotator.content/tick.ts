/** Laço por frame enquanto o modo está ativo: reposiciona overlay e marcadores e percebe troca de rota. */
export function startTick(fn: () => void): () => void {
  let id = 0
  const loop = () => {
    fn()
    id = requestAnimationFrame(loop)
  }
  id = requestAnimationFrame(loop)
  return () => cancelAnimationFrame(id)
}
